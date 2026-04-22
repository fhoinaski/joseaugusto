-- Cloudflare D1 schema for Chá · José Augusto
-- Run: wrangler d1 execute cha-jose-augusto-db --file=schema.sql

CREATE TABLE IF NOT EXISTS media (
  id         TEXT NOT NULL PRIMARY KEY,          -- R2 object key (e.g. cha-jose-augusto/foto_1234.webp)
  author     TEXT NOT NULL DEFAULT 'Convidado',
  status     TEXT NOT NULL DEFAULT 'approved'
               CHECK(status IN ('approved', 'pending', 'rejected')),
  type       TEXT NOT NULL DEFAULT 'image'
               CHECK(type IN ('image', 'video', 'audio')),
  caption    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id   TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  author     TEXT NOT NULL DEFAULT 'Convidado',
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stories_seen (
  user_id    TEXT NOT NULL,
  media_id   TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  seen_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, media_id)
);

CREATE TABLE IF NOT EXISTS access_keys (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  key        TEXT NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS store_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT '',
  link        TEXT NOT NULL DEFAULT '',
  price_brl   INTEGER,
  claimed_by  TEXT,
  claimed_at  TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS livro (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author     TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS palpites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author     TEXT NOT NULL UNIQUE,
  peso_g     INTEGER,
  altura_cm  INTEGER,
  hora       TEXT,
  cabelo     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS musicas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  author      TEXT NOT NULL,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  spotify_url TEXT,
  approved    INTEGER NOT NULL DEFAULT 1 CHECK(approved IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS musica_votes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  musica_id INTEGER NOT NULL REFERENCES musicas(id) ON DELETE CASCADE,
  voter_id   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(musica_id, voter_id)
);

CREATE TABLE IF NOT EXISTS avaliacao (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author     TEXT NOT NULL,
  stars      INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint   TEXT PRIMARY KEY,
  auth       TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memorias_subscribers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author     TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  opted_in   INTEGER NOT NULL DEFAULT 1 CHECK(opted_in IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photo_tags (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id    TEXT NOT NULL,
  tagged_name TEXT NOT NULL,
  tagged_by   TEXT NOT NULL DEFAULT 'Convidado',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient  TEXT NOT NULL,
  type       TEXT NOT NULL,
  actor      TEXT NOT NULL,
  media_id   TEXT,
  message    TEXT,
  read       INTEGER NOT NULL DEFAULT 0 CHECK(read IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pwa_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event      TEXT NOT NULL DEFAULT 'session',
  user_agent TEXT NOT NULL DEFAULT '',
  author     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rsvp (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'confirmed'
                 CHECK(status IN ('confirmed', 'maybe', 'declined')),
  guests_count INTEGER NOT NULL DEFAULT 1,
  message      TEXT,
  contact      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS marcos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '⭐',
  description TEXT,
  marco_date  TEXT NOT NULL,
  photo_url   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS video_mensagens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author     TEXT NOT NULL,
  video_url  TEXT NOT NULL,
  thumb_url  TEXT,
  duration_s INTEGER,
  message    TEXT,
  approved   INTEGER NOT NULL DEFAULT 0 CHECK(approved IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mural_cards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author     TEXT NOT NULL,
  text       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#fdf6ee',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default config values
INSERT OR IGNORE INTO config (key, value) VALUES
  ('parents_message', 'Antes mesmo de você chegar, já existia um amor que não cabia no mundo. Cada foto aqui é um pedaço do dia em que o nosso mundo ficou maior, mais barulhento e infinitamente mais bonito. Você ainda não sabe, mas já é o amor mais bonito das nossas vidas. Bem-vindo, José Augusto — a festa foi só o começo.'),
  ('capsule_open_date', '18 anos');

CREATE INDEX IF NOT EXISTS idx_media_status     ON media(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_media  ON reactions(media_id);
CREATE INDEX IF NOT EXISTS idx_capsule_created  ON capsule_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_media   ON comments(media_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_access_keys_key  ON access_keys(key);
CREATE INDEX IF NOT EXISTS idx_stories_seen_user ON stories_seen(user_id, seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_items_sort ON store_items(sort_order ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_livro_created ON livro(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_palpites_created ON palpites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_musicas_approved_created ON musicas(approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_musica_votes_music ON musica_votes(musica_id);
CREATE INDEX IF NOT EXISTS idx_avaliacao_created ON avaliacao(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memorias_opted_created ON memorias_subscribers(opted_in, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_tags_media ON photo_tags(media_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_name ON photo_tags(tagged_name);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_event_created ON pwa_sessions(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rsvp_created ON rsvp(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marcos_date ON marcos(marco_date ASC);
CREATE INDEX IF NOT EXISTS idx_video_mensagens_approved ON video_mensagens(approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mural_cards_created ON mural_cards(created_at DESC);
