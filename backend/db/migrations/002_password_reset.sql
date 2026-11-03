-- Recuperação de senha: link de uso único por e-mail. Guardamos só o hash do token.
CREATE TABLE password_resets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX password_resets_user_idx ON password_resets(user_id);

-- Tokens JWT emitidos antes da última troca de senha deixam de valer
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ;
