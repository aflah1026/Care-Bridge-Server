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

// Get speech logs for a child
router.get("/:childId", authorize, async (req, res) => {
    try {
        const { childId } = req.params;
        const allowed = await verifyAccess(childId, req.user.id);
        if (!allowed) {
            return res.status(403).json("Not Authorized");
        }

        const logs = await pool.query(
            "SELECT * FROM speech_logs WHERE child_id = $1 ORDER BY created_at DESC",
            [childId]
        );
        res.json(logs.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Add speech log
router.post("/:childId", authorize, async (req, res) => {
    try {
        const { childId } = req.params;
        const { activity_name, minutes, notes } = req.body;

        const allowed = await verifyAccess(childId, req.user.id);
        if (!allowed) {
            return res.status(403).json("Not Authorized");
        }

        if (!activity_name) {
            return res.status(400).json("Activity name is required");
        }

        const newLog = await pool.query(
            "INSERT INTO speech_logs (child_id, activity_name, minutes, notes) VALUES ($1, $2, $3, $4) RETURNING *",
            [childId, activity_name, minutes || null, notes || null]
        );
        res.json(newLog.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
