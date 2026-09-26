USE beol;

ALTER TABLE users
  ADD COLUMN verification_token_hash CHAR(64) NULL,
  ADD COLUMN verification_code_hash CHAR(64) NULL,
  ADD COLUMN verification_expires_at DATETIME NULL,
  ADD COLUMN verified_at DATETIME NULL;
