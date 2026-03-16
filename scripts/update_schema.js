const pool = require("../db");

const updateSchema = async () => {
    try {
        console.log("Updating schema...");

        await pool.query(`
            -- Mentor-Parent Connection
            CREATE TABLE IF NOT EXISTS mentor_clients (
                connection_id SERIAL PRIMARY KEY,
                mentor_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                parent_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(mentor_id, parent_id)
            );

            -- Therapy Sessions
            CREATE TABLE IF NOT EXISTS sessions (
                session_id SERIAL PRIMARY KEY,
                mentor_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_time TIMESTAMP NOT NULL,
                meeting_link VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Schema updated successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error updating schema:", err);
        process.exit(1);
    }
};

updateSchema();
