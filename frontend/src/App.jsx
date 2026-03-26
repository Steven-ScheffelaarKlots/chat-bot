/**
 * App — ROOT COMPONENT
 *
 * The top-level component that composes the entire UI.
 * It uses the useChat hook for all state and logic, then passes
 * the relevant pieces down to each component.
 *
 * Layout:
 * ┌────────────────────────────────────────────┐
 * │  Header (title + error banner)             │
 * ├──────────────────────────┬─────────────────┤
 * │                          │                 │
 * │  ChatWindow              │ SettingsPanel   │
 * │  (scrollable messages)   │ (system prompt, │
 * │                          │  temperature,   │
 * │                          │  context stats) │
 * ├──────────────────────────┤                 │
 * │  InputBar                │                 │
 * └──────────────────────────┴─────────────────┘
 */

import { useChat } from "./hooks/useChat.js";
import { ChatWindow } from "./components/ChatWindow.jsx";
import { InputBar } from "./components/InputBar.jsx";
import { SettingsPanel } from "./components/SettingsPanel.jsx";

export default function App() {
  const {
    messages,
    settings,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    updateSettings,
  } = useChat();

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Chat Bot</h1>
        <p className="subtitle">Learning project — powered by Ollama ({settings.model})</p>
      </header>

      {/* Error banner — shown when the backend or Ollama returns an error */}
      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="app-body">
        {/* Main chat area */}
        <div className="chat-area">
          <ChatWindow messages={messages} isLoading={isLoading} />
          <InputBar onSend={sendMessage} isLoading={isLoading} />
        </div>

        {/* Settings sidebar */}
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onClear={clearMessages}
          messageCount={messages.length}
        />
      </div>
    </div>
  );
}
