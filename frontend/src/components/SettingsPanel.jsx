/**
 * SettingsPanel
 *
 * The sidebar/panel for tweaking the model's behavior. This is where the
 * learning experiments from the article come to life:
 *
 *   SYSTEM PROMPT — Controls the model's persona and behavior.
 *     Try changing it to "Respond only as a pirate" and watch the model change.
 *     This is prepended to every request as { role: "system", content: "..." }.
 *
 *   TEMPERATURE — Controls randomness / creativity.
 *     0.0 = deterministic, always picks the highest-probability next token
 *     0.7 = balanced (the default for most uses)
 *     1.5+ = very random, often incoherent but sometimes surprising
 *     Try asking the same question at 0.1 and then 1.8 to feel the difference.
 *
 *   MODEL — Which Ollama model to use.
 *     Different models have different capabilities and context window sizes.
 *     Swap to "mistral:latest" or "phi3:latest" if you have them pulled.
 *
 *   CONTEXT STATS — Shows how many messages are in the current conversation.
 *     Watch this grow. The more messages, the more tokens Ollama must process.
 *     Experiment: add 20+ messages and see if response quality changes.
 *
 * Props:
 *   settings       - { systemPrompt, temperature, model }
 *   onUpdate       - Called with partial settings object when a value changes
 *   onClear        - Clears the entire conversation
 *   messageCount   - Number of messages currently in history
 */

export function SettingsPanel({ settings, onUpdate, onClear, messageCount }) {
  return (
    <aside className="settings-panel">
      <h2>Settings</h2>

      {/* ── CONTEXT STATS ────────────────────────────────────────────── */}
      <section className="settings-section">
        <h3>Context Window</h3>
        <div className="stat-row">
          <span>Messages in history:</span>
          <strong>{messageCount}</strong>
        </div>
        <p className="hint">
          Every message is sent to the model on each request. As this grows,
          the model has more context — but also approaches its token limit.
          Watch response quality as the history gets long.
        </p>
        <button className="clear-button" onClick={onClear}>
          Clear conversation
        </button>
      </section>

      {/* ── SYSTEM PROMPT ────────────────────────────────────────────── */}
      <section className="settings-section">
        <label htmlFor="system-prompt">
          <h3>System Prompt</h3>
        </label>
        <p className="hint">
          This is sent first in every request as a "system" message. It sets
          the model's behavior. Try: <em>"You are a sarcastic robot"</em> or{" "}
          <em>"Respond only with haiku poems."</em>
        </p>
        <textarea
          id="system-prompt"
          className="system-prompt-input"
          value={settings.systemPrompt}
          onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
          rows={4}
        />
      </section>

      {/* ── TEMPERATURE ──────────────────────────────────────────────── */}
      <section className="settings-section">
        <label htmlFor="temperature">
          <h3>Temperature: {settings.temperature.toFixed(1)}</h3>
        </label>
        <p className="hint">
          Controls randomness. 0 = focused/deterministic. 2 = very random.
          Try asking "write a poem" at 0.1 vs 1.8 to feel the difference.
        </p>
        <input
          id="temperature"
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={settings.temperature}
          onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
          className="temp-slider"
        />
        <div className="temp-labels">
          <span>0 — focused</span>
          <span>2 — chaotic</span>
        </div>
      </section>

      {/* ── MODEL ────────────────────────────────────────────────────── */}
      <section className="settings-section">
        <label htmlFor="model">
          <h3>Model</h3>
        </label>
        <p className="hint">
          The Ollama model to use. Must be pulled in your Ollama instance.
          Try <code>mistral:latest</code> or <code>phi3:latest</code> if available.
        </p>
        <input
          id="model"
          type="text"
          className="model-input"
          value={settings.model}
          onChange={(e) => onUpdate({ model: e.target.value })}
        />
      </section>
    </aside>
  );
}
