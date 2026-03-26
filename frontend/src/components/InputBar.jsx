/**
 * InputBar
 *
 * The text input and send button at the bottom of the chat.
 * Handles both button click and Enter key (Shift+Enter for newline).
 *
 * Props:
 *   onSend    - Called with the message string when user submits
 *   isLoading - Disables input while waiting for a response
 */

import { useState } from "react";

export function InputBar({ onSend, isLoading }) {
  const [input, setInput] = useState("");

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  }

  function handleKeyDown(e) {
    // Enter without Shift sends the message
    // Shift+Enter inserts a newline (standard chat convention)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="input-bar">
      <textarea
        className="input-textarea"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
        disabled={isLoading}
        rows={2}
      />
      <button
        className="send-button"
        onClick={handleSend}
        disabled={isLoading || !input.trim()}
      >
        {isLoading ? "…" : "Send"}
      </button>
    </div>
  );
}
