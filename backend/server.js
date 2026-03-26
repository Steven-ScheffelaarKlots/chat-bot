/**
 * EXPRESS SERVER
 *
 * This is the entry point for the backend. It:
 *   - Starts an HTTP server on port 3001
 *   - Exposes one API endpoint: POST /api/chat
 *   - Handles errors and returns useful messages
 *
 * WHY A SEPARATE BACKEND?
 *   You might wonder why we don't call Ollama directly from React (the browser).
 *   Two reasons:
 *     1. Tools run server-side: SQLite, filesystem access, and some APIs need
 *        Node.js — they can't run in a browser.
 *     2. CORS: Browsers block cross-origin requests to localhost by default.
 *        Our backend handles the Ollama call, then the frontend talks to our
 *        backend (same origin via Vite's dev proxy).
 */

import "dotenv/config"; // Loads .env file into process.env
import express from "express";
import cors from "cors";
import { chat } from "./ollama.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Parse JSON request bodies (req.body will be the parsed object)
app.use(express.json());

// Allow requests from the Vite dev server (localhost:5173).
// In production you'd restrict this to your actual domain.
app.use(cors({ origin: "http://localhost:5173" }));

/**
 * POST /api/chat
 *
 * The single endpoint the frontend talks to.
 *
 * Request body:
 * {
 *   messages: [
 *     { role: "user", content: "Hello!" },
 *     { role: "assistant", content: "Hi there!" },
 *     { role: "user", content: "What's the weather in Paris?" }
 *   ],
 *   settings: {
 *     systemPrompt: "You are a helpful assistant.",
 *     temperature: 0.7,
 *     model: "llama3:latest"   // optional, falls back to .env value
 *   }
 * }
 *
 * Response:
 * {
 *   reply: { role: "assistant", content: "The weather in Paris is..." },
 *   messages: [ ...full updated history including tool call messages... ]
 * }
 *
 * NOTE ON STATEFULNESS:
 *   This endpoint is STATELESS — it doesn't store conversation history.
 *   The frontend sends the ENTIRE conversation on every request.
 *   This is the standard pattern for LLM chat apps. The model has no memory
 *   other than what you send it.
 */
app.post("/api/chat", async (req, res) => {
  const { messages, settings = {} } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages must be an array" });
  }

  try {
    const result = await chat(messages, {
      systemPrompt: settings.systemPrompt,
      temperature: settings.temperature,
      model: settings.model,
    });

    res.json(result);
  } catch (err) {
    // Log the full error server-side for debugging
    console.error("[/api/chat error]", err);

    // Return a structured error so the frontend can show a useful message
    res.status(500).json({
      error: err.message || "Unknown server error",
    });
  }
});

// Simple health check — useful for verifying the server is up
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    ollamaUrl: process.env.OLLAMA_BASE_URL,
    model: process.env.OLLAMA_CHAT_MODEL,
  });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  console.log(`Ollama: ${process.env.OLLAMA_BASE_URL} (${process.env.OLLAMA_CHAT_MODEL})`);
});
