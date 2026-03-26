/**
 * ChatWindow
 *
 * Renders the scrollable list of messages. Auto-scrolls to the bottom
 * when new messages appear (standard chat behavior).
 *
 * Props:
 *   messages  - Array of message objects
 *   isLoading - Boolean; shows a "typing" indicator when true
 */

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble.jsx";

export function ChatWindow({ messages, isLoading }) {
  // We use a ref to get a direct reference to the bottom div, so we can
  // call scrollIntoView on it when messages change.
  const bottomRef = useRef(null);

  // useEffect runs after every render where `messages` or `isLoading` changed.
  // We use it to scroll to the bottom of the chat.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="chat-window">
      {messages.length === 0 && (
        <div className="empty-state">
          <p>Start a conversation below.</p>
          <p>
            Try: <em>"What's the weather in Tokyo?"</em> or{" "}
            <em>"Save a note: pick up groceries"</em>
          </p>
        </div>
      )}

      {messages.map((message, index) => (
        <MessageBubble key={index} message={message} />
      ))}

      {/* Typing indicator — shown while waiting for the backend response */}
      {isLoading && (
        <div className="message-wrapper assistant">
          <div className="message-bubble assistant typing">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      )}

      {/* Invisible element at the bottom that we scroll to */}
      <div ref={bottomRef} />
    </div>
  );
}
