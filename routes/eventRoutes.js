const router = require("express").Router();
const authorize = require("../middleware/authMiddleware");
const pool = require("../db");

// Get events
router.get("/", authorize, async (req, res) => {
    try {
        const events = await pool.query(
            "SELECT * FROM events ORDER BY event_date ASC"
        );
        res.json(events.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Create event (Mentor/Admin)
router.post("/", authorize, async (req, res) => {
    try {
        if (req.user.role !== "mentor" && req.user.role !== "admin") {
            return res.status(403).json("Not Authorized");
        }

        const { title, description, event_date, link } = req.body;
        if (!title || !event_date) {
            return res.status(400).json("Title and date are required");
        }

        const newEvent = await pool.query(
            "INSERT INTO events (title, description, event_date, link) VALUES ($1, $2, $3, $4) RETURNING *",
            [title, description || null, event_date, link || null]
        );

        res.json(newEvent.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
