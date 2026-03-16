const router = require("express").Router();
const authorize = require("../middleware/authMiddleware");
const pool = require("../db");

// Get Feed (All posts with author info, optional category filter)
router.get("/posts", authorize, async (req, res) => {
    try {
        const { category } = req.query;
        let query = `
            SELECT p.*, u.name as author_name, 
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) as comment_count
            FROM posts p
            JOIN users u ON p.author_id = u.user_id
        `;
        const params = [];

        if (category && category !== 'All Posts') {
            query += " WHERE p.category = $1";
            params.push(category);
        }

        query += " ORDER BY p.created_at DESC";

        const posts = await pool.query(query, params);
        res.json(posts.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Create Post
router.post("/posts", authorize, async (req, res) => {
    try {
        const { content, category } = req.body;
        const newPost = await pool.query(
            "INSERT INTO posts (author_id, content, category) VALUES ($1, $2, $3) RETURNING *",
            [req.user.id, content, category]
        );
        res.json(newPost.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Like Post
router.put("/posts/:id/like", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const post = await pool.query(
            "UPDATE posts SET likes_count = likes_count + 1 WHERE post_id = $1 RETURNING *",
            [id]
        );
        res.json(post.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get Comments for a Post
router.get("/posts/:id/comments", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const comments = await pool.query(`
            SELECT c.*, u.name as author_name
            FROM comments c
            JOIN users u ON c.author_id = u.user_id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
        `, [id]);
        res.json(comments.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Add Comment
router.post("/posts/:id/comments", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        const newComment = await pool.query(
            "INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING *",
            [id, req.user.id, content]
        );

        res.json(newComment.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
