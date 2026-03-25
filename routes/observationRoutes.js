const router = require("express").Router();
const authorize = require("../middleware/authMiddleware");
const pool = require("../db");

const verifyAccess = async (childId, userId) => {
    const child = await pool.query(
        `SELECT c.* FROM children c
         LEFT JOIN mentor_clients mc ON c.user_id = mc.parent_id
         WHERE c.child_id = $1 AND (c.user_id = $2 OR (mc.mentor_id = $2 AND mc.status = 'active'))`,
        [childId, userId]
    );
    return child.rows.length > 0;
};

// Get observations for a child
router.get("/:childId", authorize, async (req, res) => {
    try {
        const { childId } = req.params;
        const allowed = await verifyAccess(childId, req.user.id);
        if (!allowed) {
            return res.status(403).json("Not Authorized");
        }

        const observations = await pool.query(
            "SELECT * FROM daily_observations WHERE child_id = $1 ORDER BY observed_at DESC",
            [childId]
        );
        res.json(observations.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Add observation
router.post("/:childId", authorize, async (req, res) => {
    try {
        const { childId } = req.params;
        const { mood, sleep_quality, appetite_level, notes, observed_at } = req.body;

        const allowed = await verifyAccess(childId, req.user.id);
        if (!allowed) {
            return res.status(403).json("Not Authorized");
        }

        const newObservation = await pool.query(
            "INSERT INTO daily_observations (child_id, mood, sleep_quality, appetite_level, notes, observed_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [childId, mood || null, sleep_quality || null, appetite_level || null, notes || null, observed_at || new Date()]
        );

        res.json(newObservation.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
