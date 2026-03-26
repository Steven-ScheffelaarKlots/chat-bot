/**
 * useChat — THE BRAIN OF THE FRONTEND
 *
 * This custom React hook manages all chat state and logic. Components just
 * call this hook and get back everything they need — no fetch() calls in
 * components, no scattered state.
 *
 * WHAT IS A CUSTOM HOOK?
 *   A custom hook is just a function that starts with "use" and can call
 *   other hooks (useState, useEffect, etc.). It's a way to extract and
 *   share stateful logic between components.
 *
 * STATE OWNED BY THIS HOOK:
 *   messages   - The full conversation history. This IS the context window.
 *                Every message the user sends, every reply, every tool call
 *                result — it all lives here. We pass the entire array to the
 *                backend on every send.
 *
 *   settings   - System prompt, temperature, model name. Sent alongside
 *                messages on every request.
 *
 *   isLoading  - True while waiting for the backend response. Used to disable
 *                the send button and show a loading indicator.
 *
 *   error      - The last error message, if any. Cleared on the next send.
 */

import { useState, useCallback } from "react";
import { sendMessage as apiSendMessage } from "../api/chat.js";

const DEFAULT_SETTINGS = {
  systemPrompt: "You are a helpful assistant. Be concise and friendly.",
  temperature: 0.7,
  model: "llama3:latest",
};

export function useChat() {
  // The entire conversation history.
  // Format: [{ role: "user" | "assistant" | "tool", content: "..." }, ...]
  //
  // KEY INSIGHT: This array IS the model's "memory". When we send a new message,
  // we send ALL of this to Ollama. The model reads everything to generate its reply.
  // Clear this array and the model forgets the entire conversation.
  const [messages, setMessages] = useState([]);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Sends a user message and gets the model's reply.
   *
   * useCallback memoizes the function so it doesn't get recreated on every
   * render — important for components that use it as a dependency.
   *
   * @param {string} text - The user's message text
   */
  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isLoading) return;

      setError(null);
      setIsLoading(true);

      // Build the new user message object
      const userMessage = { role: "user", content: text };

      // Optimistically add the user message to the UI immediately.
      // We don't wait for the server — this makes the UI feel responsive.
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      try {
        // Send the FULL conversation history (plus the new user message) to backend.
        // The backend will handle the Ollama call and any tool-call loops.
        const result = await apiSendMessage(updatedMessages, settings);

        // The backend returns the complete updated messages array, which includes
        // any tool-call messages that happened during the tool loop.
        // We replace our local state with this authoritative version.
        setMessages(result.messages);
      } catch (err) {
        setError(err.message);
        // On error, remove the user message we optimistically added
        // so the user can try again without duplicate messages
        setMessages(messages);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, settings, isLoading]
  );

  /**
   * Clears the entire conversation history.
   * This simulates "starting fresh" — the model will have no memory of
   * previous messages after this. Great for experimenting with context window effects.
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * Updates one or more settings values.
   * Example: updateSettings({ temperature: 1.5 })
   */
  const updateSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return {
    messages,
    settings,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    updateSettings,
  };
}
