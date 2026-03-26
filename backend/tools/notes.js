/**
 * TOOL: Notes (SQLite storage)
 *
 * This file gives the model the ability to STORE and RETRIEVE information
 * that persists between conversations. Without this, the model forgets
 * everything once the browser is refreshed (because the message history lives
 * in React state — it's gone when you reload).
 *
 * We use SQLite via the `better-sqlite3` package. SQLite is a file-based
 * database — no separate database server needed. The DB is just a single file
 * on disk (notes.sqlite), which makes it perfect for a learning project.
 *
 * better-sqlite3 is SYNCHRONOUS (unlike most Node.js DB libraries). That means
 * no async/await needed for DB calls — it runs the query and returns the result
 * immediately. This keeps the code simpler to read.
 *
 * We expose two tools to the model:
 *   - add_note: Save a piece of text
 *   - get_notes: List all saved notes
 */

import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// __dirname doesn't exist in ES modules, so we reconstruct it
const __dirname = dirname(fileURLToPath(import.meta.url));

// The database file will be created at backend/db/notes.sqlite
// Using join ensures the path works regardless of where you run the server from
const DB_PATH = join(__dirname, "..", "db", "notes.sqlite");

/**
 * Opens (or creates) the SQLite database and sets up the notes table.
 * This runs once when the module is first imported.
 *
 * better-sqlite3's `new Database(path)` creates the file if it doesn't exist,
 * but the DIRECTORY must exist first — so we create it here.
 */
import { mkdirSync } from "fs";
mkdirSync(join(__dirname, "..", "db"), { recursive: true });

const db = new Database(DB_PATH);

// Create the table if it doesn't already exist.
// The `IF NOT EXISTS` clause means this is safe to run every time on startup.
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// --- Tool Definitions (sent to Ollama) ---

export const addNoteToolDefinition = {
  type: "function",
  function: {
    name: "add_note",
    description:
      "Save a note or piece of information to persistent storage. Use this when the user asks you to remember something or save something for later.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The text content to save as a note",
        },
      },
      required: ["content"],
    },
  },
};

export const getNotesToolDefinition = {
  type: "function",
  function: {
    name: "get_notes",
    description:
      "Retrieve all saved notes from storage. Use this when the user asks to see their notes or what has been saved.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

// --- Tool Implementations ---

/**
 * Saves a note to the database.
 * @param {string} content - The text to save
 * @returns {string} Confirmation message
 */
export function addNote(content) {
  // `.prepare()` compiles a SQL statement for reuse (more efficient, and
  // crucially, protects against SQL injection via parameterized queries)
  const stmt = db.prepare("INSERT INTO notes (content) VALUES (?)");
  const result = stmt.run(content);
  return `Note saved with ID ${result.lastInsertRowid}: "${content}"`;
}

/**
 * Retrieves all notes from the database.
 * @returns {string} Formatted list of notes, or a message if none exist
 */
export function getNotes() {
  const notes = db.prepare("SELECT * FROM notes ORDER BY created_at DESC").all();

  if (notes.length === 0) {
    return "No notes saved yet.";
  }

  // Format notes as a numbered list for the model to read back to the user
  const formatted = notes
    .map((n) => `[${n.id}] (${n.created_at}) ${n.content}`)
    .join("\n");

  return `Saved notes:\n${formatted}`;
}
