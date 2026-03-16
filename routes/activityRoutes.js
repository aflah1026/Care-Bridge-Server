const router = require("express").Router();
const authorize = require("../middleware/authMiddleware");
const pool = require("../db");

// Get activities for a child
router.get("/:childId", authorize, async (req, res) => {
    try {
        const { childId } = req.params;

        // Check ownership
        const child = await pool.query("SELECT * FROM children WHERE child_id = $1 AND user_id = $2", [childId, req.user.id]);
        if (child.rows.length === 0) {
            return res.status(403).json("Not Authorized");
        }

        const activities = await pool.query(
            "SELECT * FROM activities WHERE child_id = $1 ORDER BY scheduled_time ASC",
            [childId]
        );
        res.json(activities.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Add activity
router.post("/:childId", authorize, async (req, res) => {
    try {
        const { childId } = req.params;
        const { title, description, activity_type, scheduled_time } = req.body;

        // Check ownership
        const child = await pool.query("SELECT * FROM children WHERE child_id = $1 AND user_id = $2", [childId, req.user.id]);
        if (child.rows.length === 0) {
            return res.status(403).json("Not Authorized");
        }

        const newActivity = await pool.query(
            "INSERT INTO activities (child_id, title, description, activity_type, scheduled_time) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [childId, title, description, activity_type, scheduled_time]
        );
        res.json(newActivity.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
