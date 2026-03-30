# AI Chat Bot

A learning project — a full-stack AI chatbot powered by [Ollama](https://ollama.com) (local LLMs). Built with React on the frontend and Express on the backend, with tool-calling support so the model can fetch live weather and persist notes to a SQLite database.

---

## Prerequisites

- **Node.js** v18+
- **Ollama** running locally (or accessible on your network)
  - Install from [ollama.com](https://ollama.com)
  - Pull a model that supports tool calling: `ollama pull llama3.1` or `ollama pull qwen3:4b`

---

## Setup

**1. Clone and install dependencies**

```bash
git clone <repo-url>
cd chat-bot
npm install
```

**2. Configure the backend**

Create `backend/.env` (copy the example below and adjust for your setup):

```env
# URL where Ollama is listening
# If running Ollama locally on the same machine:
OLLAMA_BASE_URL=http://localhost:11434

# If running in WSL2 with Ollama on Windows host:
# OLLAMA_BASE_URL=http://172.31.144.1:11434  (check /etc/resolv.conf for the IP)

# The model to use — must be pulled in Ollama first
OLLAMA_CHAT_MODEL=llama3.1:latest

# Port for the Express server
PORT=3001
```

**3. Pull your chosen model in Ollama**

```bash
ollama pull llama3.1
```

> **Note on tool calling:** Not all models support tool/function calling. `llama3.1`, `llama3.2`, `mistral`, and `qwen3` do. Plain `llama3` does not — the backend detects this and falls back to plain chat automatically.

---

## Running the App

Start both the backend and frontend with a single command from the project root:

```bash
npm run dev
```

This runs them concurrently:
- **Backend** (Express): `http://localhost:3001`
- **Frontend** (Vite/React): `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

## Project Structure

```
chat-bot/
├── backend/
│   ├── server.js          # Express server, exposes POST /api/chat
│   ├── ollama.js          # Ollama client + tool-call loop
│   ├── tools/
│   │   ├── index.js       # Tool registry (definitions + dispatcher)
│   │   ├── weather.js     # get_weather tool (wttr.in API)
│   │   └── notes.js       # add_note / get_notes tools (SQLite)
│   └── db/
│       └── notes.sqlite   # Created automatically on first run
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Root component, layout
│   │   ├── api/chat.js                # fetch() wrapper for the backend API
│   │   ├── hooks/useChat.js           # All chat state and logic
│   │   └── components/
│   │       ├── ChatWindow.jsx         # Scrollable message list
│   │       ├── MessageBubble.jsx      # Individual message rendering
│   │       ├── InputBar.jsx           # Text input + send button
│   │       └── SettingsPanel.jsx      # System prompt, temperature, model
│   └── vite.config.js     # Vite config with /api proxy to backend
└── package.json           # Root workspace config (runs both with concurrently)
```

---

## How It Works

### Architecture

```
Browser (React)
    │  POST /api/chat (full message history + settings)
    ▼
Vite dev proxy (:5173 → :3001)
    │
    ▼
Express backend (:3001)
    │  POST /api/chat (Ollama-compatible format)
    ▼
Ollama (local LLM)
```

The frontend and backend are separate processes. Vite's dev server proxies all `/api/*` requests to the Express backend, so the browser always talks to the same origin (avoiding CORS issues during development).

### Stateless API — Messages Are the Memory

The backend is completely stateless. It stores nothing between requests.

On every message, the frontend sends the **entire conversation history** to the backend, which forwards it to Ollama. The model's only "memory" is whatever messages you include in the request. This is the standard pattern for LLM chat apps.

Clear the conversation in the UI → the model forgets everything.

### The Tool-Call Loop

When a model supports tool calling, the flow isn't a simple request/response — it's a loop (`backend/ollama.js`):

```
1. Send messages + tool definitions to Ollama
2. Ollama responds with either:
   a) A text reply → done, return it
   b) A tool_calls request (e.g. "call get_weather with city=Paris")
3. If (b):
   - Execute the tool locally (fetch the weather)
   - Append the tool call + result to the message history
   - Go back to step 1
4. Model reads the tool result and writes the final text answer
```

This loop runs up to 5 rounds (a safety cap). The model can chain multiple tool calls if needed.

### Frontend State

All chat state lives in the `useChat` hook (`frontend/src/hooks/useChat.js`):

- `messages` — the full conversation array. This IS the context window.
- `settings` — system prompt, temperature, model name
- `isLoading` — true while waiting for a response
- `error` — last error message

The user message is added to the UI immediately (optimistic update) before the API call completes, making the interface feel responsive.

---

## Available Tools

### `get_weather`
Fetches live weather data from [wttr.in](https://wttr.in) — no API key needed.

**Trigger:** Ask the model about the weather in any city.
> "What's the weather like in Tokyo?"

### `add_note`
Saves a note to a local SQLite database (`backend/db/notes.sqlite`). Notes persist between browser sessions and server restarts.

**Trigger:** Ask the model to remember something.
> "Remember that my favorite color is blue"

### `get_notes`
Retrieves all saved notes from the database.

**Trigger:** Ask the model to recall saved information.
> "What do you remember about me?" / "Show me my notes"

---

## Settings Panel

The sidebar exposes three parameters you can change live:

| Setting | Effect |
|---|---|
| **System Prompt** | Prepended to every request as a `system` message. Controls the model's persona and behavior. Try: *"You are a sarcastic robot"* |
| **Temperature** | 0 = deterministic, 0.7 = balanced (default), 2 = chaotic. Ask the same question at 0.1 and 1.8 to feel the difference. |
| **Model** | Any model name pulled in your Ollama instance (e.g. `mistral:latest`, `phi3:latest`). |

---

## Adding a New Tool

1. Create `backend/tools/my_tool.js` — export a tool definition object and an implementation function.
2. Import and register both in `backend/tools/index.js` — add to `toolDefinitions` array and add a `case` in `callTool`.

That's it. The tool-call loop in `ollama.js` doesn't need to know about individual tools.

---

## API Reference

### `POST /api/chat`

Request:
```json
{
  "messages": [
    { "role": "user", "content": "What's the weather in Paris?" }
  ],
  "settings": {
    "systemPrompt": "You are a helpful assistant.",
    "temperature": 0.7,
    "model": "llama3.1:latest"
  }
}
```

Response:
```json
{
  "reply": { "role": "assistant", "content": "The weather in Paris is..." },
  "messages": [ /* full updated history including any tool call messages */ ]
}
```

### `GET /api/health`

Returns current server config (Ollama URL and model). Useful for checking the backend is up.
