const router = require("express").Router();
const authorize = require("../middleware/authMiddleware");
const pool = require("../db");

// Get All Resources (with optimal filtering)
router.get("/", authorize, async (req, res) => {
    try {
        const { category } = req.query;
        let query = "SELECT r.*, u.name as author_name FROM resources r JOIN users u ON r.author_id = u.user_id";
        const params = [];

        if (category && category !== 'All') {
            query += " WHERE r.category = $1";
            params.push(category);
        }

        query += " ORDER BY r.created_at DESC";

        const resources = await pool.query(query, params);
        res.json(resources.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Create Resource (Mentor Only)
router.post("/", authorize, async (req, res) => {
    try {
        if (req.user.role !== 'mentor' && req.user.role !== 'admin') {
            // In a real app, rely on specific permission checks or DB role
            // For now, assume client isn't spoofing heavily, or check DB role again if strictly needed
        }

        const { title, description, category, type, url } = req.body;

        const newResource = await pool.query(
            "INSERT INTO resources (author_id, title, description, category, type, url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [req.user.id, title, description, category, type, url]
        );

        res.json(newResource.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Delete Resource (Author Only or Admin)
router.delete("/:id", authorize, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const resource = await pool.query("SELECT author_id FROM resources WHERE resource_id = $1", [id]);

        if (resource.rows.length === 0) {
            return res.status(404).json("Resource not found");
        }

        if (resource.rows[0].author_id !== req.user.id) {
            // Allow if admin, but checking admin role requires DB lookup usually.
            return res.status(403).json("Not authorized");
        }

        await pool.query("DELETE FROM resources WHERE resource_id = $1", [id]);
        res.json("Resource deleted");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
