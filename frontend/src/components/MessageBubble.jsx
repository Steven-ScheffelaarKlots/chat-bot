/**
 * MessageBubble
 *
 * Renders a single message in the conversation. The visual style differs
 * by role so the user can easily distinguish who said what:
 *
 *   user      → right-aligned, colored background
 *   assistant → left-aligned, neutral background
 *   tool      → left-aligned, muted/italic, smaller — these are the raw
 *               results that came back from tool calls. Showing them helps
 *               you understand what the model is actually "seeing".
 *
 * Props:
 *   message: { role: "user" | "assistant" | "tool", content: string }
 */
export function MessageBubble({ message }) {
  const { role, content } = message;

  const isUser = role === "user";
  const isTool = role === "tool";

  return (
    <div className={`message-wrapper ${isUser ? "user" : "assistant"}`}>
      <div className={`message-bubble ${role}`}>
        {/* Show a small label for tool results so it's clear what they are */}
        {isTool && <div className="tool-label">Tool result</div>}
        {/* Pre-wrap preserves newlines and spaces in the model's output */}
        <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{content}</p>
      </div>
    </div>
  );
}
