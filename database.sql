CREATE DATABASE carebridge;

\c carebridge;

-- Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'parent', -- parent, mentor, admin
    specialty VARCHAR(255),
    credentials VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Children Table
CREATE TABLE children (
    child_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(50),
    diagnosis_date DATE,
    diagnosis_details TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Growth Logs Table
CREATE TABLE growth_logs (
    log_id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(child_id) ON DELETE CASCADE,
    category VARCHAR(50), -- Physical, Behavioral, Developmental
    value DECIMAL(7,2),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    head_circumference_cm DECIMAL(5,2),
    note TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities Table (Scheduling)
CREATE TABLE activities (
    activity_id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(child_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(100), -- speech, therapy, learning, play
    scheduled_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, skipped
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mentor-Parent Connection
CREATE TABLE mentor_clients (
    connection_id SERIAL PRIMARY KEY,
    mentor_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active', -- active, archived
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mentor_id, parent_id)
);

-- Therapy Sessions
CREATE TABLE sessions (
    session_id SERIAL PRIMARY KEY,
    mentor_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resources (Learning & Speech)
CREATE TABLE resources (
    resource_id SERIAL PRIMARY KEY,
    author_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- speech, behavioral, sensory, education
    type VARCHAR(50), -- video, article, exercise
    url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Community Forum
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    author_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT NOT NULL,
    category VARCHAR(50), -- General, Question, Success Story, Advice
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Daily Observations (Mood/Sleep/Appetite)
CREATE TABLE IF NOT EXISTS daily_observations (
    observation_id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(child_id) ON DELETE CASCADE,
    mood VARCHAR(20),
    sleep_quality VARCHAR(20),
    appetite_level VARCHAR(20),
    notes TEXT,
    observed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Speech & Learning Activity Logs
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

-- Note: The following alter statements are for updating the specific activities table
-- ALTER TABLE activities ADD COLUMN assigned_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
-- ALTER TABLE activities ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
-- ALTER TABLE activities ADD COLUMN feedback TEXT;
-- ALTER TABLE activities ADD COLUMN completed_at TIMESTAMP;
