-- Login com Google: vínculo pela conta Google (sub). Quem entra só pelo Google não tem senha
-- até criar uma em "Esqueci a senha".
ALTER TABLE users ADD COLUMN google_sub TEXT UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
