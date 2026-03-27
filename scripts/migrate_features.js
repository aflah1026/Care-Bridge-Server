const { Pool } = require('pg');
const path = require('path');
// Ensure we load the server/.env regardless of current working directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'carebridge',
});

const migrationSql = `
-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shared Files Table
CREATE TABLE IF NOT EXISTS shared_files (
    file_id SERIAL PRIMARY KEY,
    uploader_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update Activities table for growth tracking
ALTER TABLE activities ADD COLUMN IF NOT EXISTS assigned_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Users: Mentor profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS credentials VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Children: Extra profile details
ALTER TABLE children ADD COLUMN IF NOT EXISTS diagnosis_details TEXT;
ALTER TABLE children ADD COLUMN IF NOT EXISTS bio TEXT;

-- Growth logs: Generic category/value
ALTER TABLE growth_logs ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE growth_logs ADD COLUMN IF NOT EXISTS value DECIMAL(7,2);

-- Sessions: Link to parent client
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'scheduled';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
UPDATE sessions SET status = 'scheduled' WHERE status IS NULL;

-- Posts: Title
ALTER TABLE posts ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Daily Observations
CREATE TABLE IF NOT EXISTS daily_observations (
    observation_id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(child_id) ON DELETE CASCADE,
    mood VARCHAR(20),
    sleep_quality VARCHAR(20),
    appetite_level VARCHAR(20),
    notes TEXT,
    observed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Speech Logs
CREATE TABLE IF NOT EXISTS speech_logs (
    log_id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(child_id) ON DELETE CASCADE,
    activity_name VARCHAR(255) NOT NULL,
    minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events
CREATE TABLE IF NOT EXISTS events (
    event_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP NOT NULL,
    link TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_growth_logs_child_id ON growth_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_activities_child_id ON activities(child_id);
CREATE INDEX IF NOT EXISTS idx_daily_observations_child_id ON daily_observations(child_id);
CREATE INDEX IF NOT EXISTS idx_speech_logs_child_id ON speech_logs(child_id);
`;

(async () => {
    try {
        console.log("Running migration...");
        await pool.query(migrationSql);
        console.log("Migration successful!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        pool.end();
    }
})();
