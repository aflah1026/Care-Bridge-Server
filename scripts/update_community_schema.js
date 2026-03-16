const pool = require("../db");

const updateSchema = async () => {
    try {
        console.log("Updating schema for Community Forum...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                post_id SERIAL PRIMARY KEY,
                author_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                category VARCHAR(50),
                likes_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS comments (
                comment_id SERIAL PRIMARY KEY,
                post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
                author_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Community tables created successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error updating schema:", err);
        process.exit(1);
    }
};

updateSchema();
