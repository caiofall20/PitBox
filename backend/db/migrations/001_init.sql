CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE user_role AS ENUM ('colecionador', 'moderador', 'admin');
CREATE TYPE follow_policy AS ENUM ('publico', 'aprovacao', 'ninguem');
CREATE TYPE follow_status AS ENUM ('pendente', 'seguindo');
CREATE TYPE review_status AS ENUM ('pendente', 'aprovado', 'rejeitado');
CREATE TYPE target_type AS ENUM ('item', 'garagem');

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'colecionador',
  city TEXT, bio TEXT,
  garage_visible BOOLEAN NOT NULL DEFAULT TRUE,
  follow_policy follow_policy NOT NULL DEFAULT 'aprovacao',
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE catalog_models (
  id BIGSERIAL PRIMARY KEY,
  toy_code TEXT UNIQUE,
  brand TEXT NOT NULL, model TEXT NOT NULL,
  year TEXT, series TEXT, series_num TEXT, col_num TEXT, scale TEXT,
  cast_text TEXT, barcode TEXT, wiki_url TEXT,
  status review_status NOT NULL DEFAULT 'pendente',
  suggested_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX catalog_models_trgm ON catalog_models USING gin ((brand || ' ' || model || ' ' || coalesce(cast_text,'')) gin_trgm_ops);

CREATE TABLE catalog_photos (
  id BIGSERIAL PRIMARY KEY,
  model_id BIGINT NOT NULL REFERENCES catalog_models(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status review_status NOT NULL DEFAULT 'pendente',
  sent_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE folders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE items (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  num INT NOT NULL,
  model_id BIGINT REFERENCES catalog_models(id) ON DELETE SET NULL,
  folder_id BIGINT REFERENCES folders(id) ON DELETE SET NULL,
  brand TEXT NOT NULL, model TEXT NOT NULL, year TEXT, series TEXT, scale TEXT, toy_code TEXT,
  qty INT NOT NULL DEFAULT 1 CHECK (qty >= 1),
  avg_price NUMERIC(10,2),
  photo_url TEXT,
  loose BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, num)
);
CREATE INDEX items_user ON items(user_id);

CREATE TABLE wishlist (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL, model TEXT NOT NULL, year TEXT, series TEXT, scale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE follows (
  follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status follow_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id)
);

CREATE TABLE likes (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target target_type NOT NULL,
  target_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target, target_id)
);

CREATE TABLE comments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target target_type NOT NULL,
  target_id BIGINT NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) <= 280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_target ON comments(target, target_id);
