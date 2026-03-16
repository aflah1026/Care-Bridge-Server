const pool = require("../db");

const updateSchema = async () => {
    try {
        console.log("Updating schema for Resources...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS resources (
                resource_id SERIAL PRIMARY KEY,
                author_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100), -- speech, behavioral, sensory, education
                type VARCHAR(50), -- video, article, exercise
                url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Resources table created successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error updating schema:", err);
        process.exit(1);
    }
};

updateSchema();
