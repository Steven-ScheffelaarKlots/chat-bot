/**
 * TOOL REGISTRY
 *
 * This is the central place that knows about ALL available tools.
 * It serves two purposes:
 *
 *   1. Exports `toolDefinitions` — the list we send to Ollama with every
 *      request, so the model knows what tools it can call.
 *
 *   2. Exports `callTool(name, args)` — the dispatcher that runs the right
 *      function when the model decides to use a tool.
 *
 * Adding a new tool only requires changes here (and a new tool file).
 * The tool-call loop in ollama.js doesn't need to know about individual tools.
 */

import { weatherToolDefinition, getWeather } from "./weather.js";
import {
  addNoteToolDefinition,
  getNotesToolDefinition,
  addNote,
  getNotes,
} from "./notes.js";

/**
 * All tool definitions, combined into one array.
 * This entire array gets sent to Ollama on every chat request.
 * The model reads the descriptions and decides which (if any) to use.
 */
export const toolDefinitions = [
  weatherToolDefinition,
  addNoteToolDefinition,
  getNotesToolDefinition,
];

/**
 * Dispatches a tool call by name.
 *
 * When Ollama returns a response with `tool_calls`, each call has a `function`
 * property with a `name` and `arguments`. We match the name here and run the
 * corresponding function.
 *
 * @param {string} name - The tool function name (matches definition names above)
 * @param {object} args - The arguments the model provided
 * @returns {Promise<string>} The tool's result as a string (models expect text)
 */
export async function callTool(name, args) {
  switch (name) {
    case "get_weather":
      return await getWeather(args.city);

    case "add_note":
      return addNote(args.content);

    case "get_notes":
      return getNotes();

    default:
      // If the model hallucinated a tool name that doesn't exist, tell it so
      // it can recover gracefully rather than the whole request crashing.
      return `Error: Unknown tool "${name}". Available tools: get_weather, add_note, get_notes.`;
  }
}
