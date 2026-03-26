/**
 * OLLAMA CLIENT + TOOL-CALL LOOP
 *
 * This is the most important file in the backend for understanding how LLMs
 * actually work in practice. It handles talking to Ollama and managing the
 * multi-step "tool call loop".
 *
 * ─── THE BASIC FLOW ──────────────────────────────────────────────────────────
 *
 *   1. We send the full message history + available tools to Ollama's API.
 *   2. Ollama returns a response. Two possible outcomes:
 *      a) The model wrote a text reply → we're done, return it.
 *      b) The model wants to use a tool → it returns tool_calls instead of text.
 *   3. If it's (b), we:
 *      - Execute the tool(s) locally (e.g. actually fetch the weather)
 *      - Add the model's tool-call request to message history (required by protocol)
 *      - Add the tool result(s) to message history as "tool" role messages
 *      - Send the updated history back to Ollama (go to step 1)
 *   4. The model reads the tool results and writes a final text response.
 *
 * This loop can run multiple times if the model chains tool calls.
 *
 * ─── WHY MESSAGES ARE THE "MEMORY" ──────────────────────────────────────────
 *
 *   LLMs have no persistent memory. Every request is stateless. The ONLY
 *   "memory" the model has is the messages array you send in each request.
 *   That's the entire conversation history — including tool calls and results.
 *
 *   This is why the context window matters so much. As the conversation grows,
 *   the messages array grows, and you eventually hit the model's token limit.
 *
 * ─── THE OLLAMA API ──────────────────────────────────────────────────────────
 *
 *   Ollama exposes an OpenAI-compatible API at POST /api/chat.
 *   Docs: https://github.com/ollama/ollama/blob/main/docs/api.md#chat
 *
 *   Request body shape:
 *   {
 *     model: "llama3:latest",
 *     messages: [ { role, content }, ... ],
 *     tools: [ { type, function: { name, description, parameters } }, ... ],
 *     stream: false,
 *     options: { temperature: 0.7 }
 *   }
 */

import { toolDefinitions, callTool } from "./tools/index.js";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL;

/**
 * Sends a single request to the Ollama /api/chat endpoint.
 *
 * @param {Array} messages - Full conversation history
 * @param {object} options - { temperature, model, includeTools }
 * @returns {Promise<object>} The raw Ollama response JSON
 */
async function ollamaRequest(messages, options = {}) {
  const model = options.model || OLLAMA_CHAT_MODEL;
  const temperature = options.temperature ?? 0.7;

  const body = {
    model,
    messages,
    // stream: false means we wait for the full response before processing it.
    // Streaming (true) would let us show text token-by-token as it's generated,
    // but adds complexity. A good follow-up experiment for later!
    stream: false,
    options: {
      temperature,
    },
  };

  // Only include tools if the caller says to. Not all models support tool
  // calling — e.g. llama3 doesn't, but llama3.1/llama3.2/mistral do.
  // We'll try with tools first and fall back gracefully if unsupported.
  if (options.includeTools) {
    body.tools = toolDefinitions;
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama API error ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * The main chat function — handles the full tool-call loop.
 *
 * This is what the Express route calls. It takes the conversation history
 * and settings, runs the tool loop until the model has a final text answer,
 * and returns that answer along with the updated message history.
 *
 * @param {Array} messages - The conversation so far (not including system prompt)
 * @param {object} options - { temperature, model, systemPrompt }
 * @returns {Promise<{ reply: object, messages: Array }>}
 *   - reply: the final assistant message object { role: "assistant", content: "..." }
 *   - messages: the full updated history including any tool call messages
 */
export async function chat(messages, options = {}) {
  // Build the full message list to send to Ollama.
  // The system prompt goes first, as role "system". It sets the model's
  // behavior and persona for the entire conversation.
  const systemPrompt = options.systemPrompt?.trim();
  const fullMessages = [
    ...(systemPrompt
      ? [{ role: "system", content: systemPrompt }]
      : []),
    ...messages,
  ];

  // We keep a mutable copy of messages to build up the history during the
  // tool loop. We DON'T include the system prompt in this — the frontend
  // doesn't need to store it as a regular message.
  let workingMessages = [...messages];

  // Track whether this model supports tools. We optimistically try with tools
  // on the first round. If Ollama returns a 400 saying the model doesn't
  // support tools, we flip this flag and continue without them.
  let toolsSupported = true;

  // Safety valve: prevent infinite loops if the model keeps calling tools.
  // In practice this shouldn't happen, but it's good defensive programming.
  const MAX_TOOL_ROUNDS = 5;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Rebuild the full message list (with system prompt) on each iteration,
    // using the updated workingMessages that include tool results
    const requestMessages = [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...workingMessages,
    ];

    let data;
    try {
      data = await ollamaRequest(requestMessages, { ...options, includeTools: toolsSupported });
    } catch (err) {
      // If the model doesn't support tools, retry this round without them.
      // This lets basic chat work on any Ollama model.
      if (toolsSupported && err.message.includes("does not support tools")) {
        console.warn("[ollama] Model does not support tools — falling back to plain chat");
        toolsSupported = false;
        data = await ollamaRequest(requestMessages, { ...options, includeTools: false });
      } else {
        throw err;
      }
    }
    const assistantMessage = data.message;

    // ── CASE 1: The model returned a text response ──────────────────────────
    // `tool_calls` will be absent or empty — we have our final answer.
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      // Add the assistant's reply to working history so the caller can persist it
      workingMessages.push(assistantMessage);
      return {
        reply: assistantMessage,
        messages: workingMessages,
      };
    }

    // ── CASE 2: The model wants to call tool(s) ──────────────────────────────
    // We must:
    //   a) Append the assistant's tool-call message to history (protocol requirement)
    //   b) Execute each tool
    //   c) Append each result as a "tool" role message
    //   d) Loop back and send the updated history to the model

    console.log(
      `[Tool Call] Round ${round + 1}: model requested`,
      assistantMessage.tool_calls.map((tc) => tc.function.name)
    );

    // (a) Add the assistant message that contains the tool_calls
    workingMessages.push(assistantMessage);

    // (b) + (c) Execute each tool and add its result
    for (const toolCall of assistantMessage.tool_calls) {
      const { name, arguments: toolArgs } = toolCall.function;

      let toolResult;
      try {
        toolResult = await callTool(name, toolArgs);
      } catch (err) {
        // If the tool itself throws, send the error message back to the model
        // so it can tell the user something went wrong instead of hanging.
        toolResult = `Error running tool ${name}: ${err.message}`;
      }

      console.log(`[Tool Result] ${name}:`, toolResult.slice(0, 100));

      // The "tool" role message tells the model what the tool returned.
      // The model will read this on the next iteration and use it to answer.
      workingMessages.push({
        role: "tool",
        content: toolResult,
        // Some Ollama versions require the tool name here too
        name,
      });
    }

    // Loop continues — send updated messages back to model
  }

  // If we hit MAX_TOOL_ROUNDS without a text response, something went wrong
  throw new Error("Tool call loop exceeded maximum rounds — possible infinite loop");
}
