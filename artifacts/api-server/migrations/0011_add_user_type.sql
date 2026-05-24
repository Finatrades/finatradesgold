CREATE TYPE user_type AS ENUM ('exporter', 'importer', 'government');

ALTER TABLE users ADD COLUMN user_type user_type;

UPDATE users SET user_type = 'exporter' WHERE user_type IS NULL AND finabridge_role = 'exporter';

UPDATE users SET user_type = 'importer' WHERE user_type IS NULL AND finabridge_role IN ('importer', 'both');

UPDATE users SET user_type = 'exporter' WHERE user_type IS NULL;

ALTER TABLE users ALTER COLUMN user_type SET NOT NULL;

ALTER TABLE users ALTER COLUMN user_type SET DEFAULT 'exporter';
