-- Cloudflare D1 schema for Chá · José Augusto
-- Run: wrangler d1 execute cha-jose-augusto-db --file=schema.sql

CREATE TABLE IF NOT EXISTS media (
  id         TEXT NOT NULL PRIMARY KEY,          -- R2 object key (e.g. cha-jose-augusto/foto_1234.webp)
  author     TEXT NOT NULL DEFAULT 'Convidado',
  status     TEXT NOT NULL DEFAULT 'approved'
               CHECK(status IN ('approved', 'pending', 'rejected')),
  type       TEXT NOT NULL DEFAULT 'image'
               CHECK(type IN ('image', 'video')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reactions (
  media_id TEXT    NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  emoji    TEXT    NOT NULL,
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (media_id, emoji)
);

CREATE TABLE IF NOT EXISTS capsule_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author     TEXT NOT NULL,
  message    TEXT NOT NULL,
  image_url  TEXT NOT NULL DEFAULT '',           -- full public R2 URL
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS config (
  key   TEXT NOT NULL PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Default config values
INSERT OR IGNORE INTO config (key, value) VALUES
  ('parents_message', 'Antes mesmo de você chegar, já existia um amor que não cabia no mundo. Cada foto aqui é um pedaço do dia em que o nosso mundo ficou maior, mais barulhento e infinitamente mais bonito. Você ainda não sabe, mas já é o amor mais bonito das nossas vidas. Bem-vindo, José Augusto — a festa foi só o começo.'),
  ('capsule_open_date', '18 anos');

CREATE INDEX IF NOT EXISTS idx_media_status     ON media(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_media  ON reactions(media_id);
CREATE INDEX IF NOT EXISTS idx_capsule_created  ON capsule_messages(created_at DESC);
