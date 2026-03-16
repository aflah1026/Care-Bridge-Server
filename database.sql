CREATE DATABASE carebridge;

\c carebridge;

-- Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'parent', -- parent, mentor, admin
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Growth Logs Table
CREATE TABLE growth_logs (
    log_id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(child_id) ON DELETE CASCADE,
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
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    meeting_link VARCHAR(255),
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
