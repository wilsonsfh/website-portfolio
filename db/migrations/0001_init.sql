-- portfolio-qa: questions the chat could not answer, Wilson's answers, and the private wiki excerpt.
-- Stores no IPs or visitor identifiers.
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,            -- as asked, trimmed, <= 500 chars
  normalized TEXT NOT NULL UNIQUE,   -- lowercased, punctuation/space-collapsed (dedupe key)
  asked_count INTEGER NOT NULL DEFAULT 1,
  first_asked TEXT NOT NULL,         -- ISO 8601 UTC
  last_asked TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'dismissed')),
  answer TEXT,                       -- Wilson's answer; the only text that goes live
  answered_at TEXT,
  suggestion TEXT,                   -- AI draft, admin only, never shown to visitors
  suggested_at TEXT
);
CREATE INDEX idx_questions_status ON questions (status, asked_count DESC);

-- Private wiki excerpt, uploaded from Wilson's laptop only (scripts/wiki-excerpt.mjs). Never in the repo.
CREATE TABLE wiki_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL,                -- wiki-relative path
  heading TEXT NOT NULL,
  text TEXT NOT NULL
);

-- Full-text index over the chunks (external content, kept in sync by triggers).
CREATE VIRTUAL TABLE wiki_chunks_fts USING fts5(heading, text, content='wiki_chunks', content_rowid='id', tokenize='porter unicode61');
CREATE TRIGGER wiki_chunks_ai AFTER INSERT ON wiki_chunks BEGIN
  INSERT INTO wiki_chunks_fts (rowid, heading, text) VALUES (new.id, new.heading, new.text);
END;
CREATE TRIGGER wiki_chunks_ad AFTER DELETE ON wiki_chunks BEGIN
  INSERT INTO wiki_chunks_fts (wiki_chunks_fts, rowid, heading, text) VALUES ('delete', old.id, old.heading, old.text);
END;
