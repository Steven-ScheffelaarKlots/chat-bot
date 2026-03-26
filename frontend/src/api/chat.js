/**
 * API LAYER
 *
 * This module handles all HTTP communication with our backend.
 * Keeping it separate from React components means:
 *   - Components don't need to know about fetch() or URLs
 *   - If we ever change the API shape, we only update this file
 *
 * The request goes:
 *   React component → useChat hook → sendMessage() here → Express backend → Ollama
 */

/**
 * Sends the conversation to the backend and gets the model's reply.
 *
 * @param {Array} messages - Full conversation history (all messages so far)
 * @param {object} settings - { systemPrompt, temperature, model }
 * @returns {Promise<{ reply: object, messages: Array }>}
 *   reply: the new assistant message { role, content }
 *   messages: updated full history (backend may add tool-call messages too)
 */
export async function sendMessage(messages, settings) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, settings }),
  });

  if (!response.ok) {
    // Try to parse an error message from the backend
    let errorMsg = `Server error: ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
