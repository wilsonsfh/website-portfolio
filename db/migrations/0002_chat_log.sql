-- Every question asked in the assistant or unread, with the reply shown, kept 30 days (older rows are deleted on each
-- new write). visitor is a random id made per browser tab; no IP or account is stored. Images are not stored.
CREATE TABLE chat_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor TEXT NOT NULL,             -- random per-tab id from the browser, or 'anon'
  kind TEXT NOT NULL CHECK (kind IN ('text', 'image')),
  question TEXT NOT NULL,            -- the visitor's latest message, <= 500 chars
  answer TEXT NOT NULL,              -- the reply shown (text), or '(image)' for a drawn picture
  provider TEXT,                     -- workers-ai | groq
  created_at TEXT NOT NULL           -- ISO 8601 UTC
);
CREATE INDEX idx_chat_log_created ON chat_log (created_at);
CREATE INDEX idx_chat_log_visitor ON chat_log (visitor, created_at);
