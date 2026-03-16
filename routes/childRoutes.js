const router = require("express").Router();
const authorize = require("../middleware/authMiddleware");
const pool = require("../db");

// Get all children for a user
router.get("/", authorize, async (req, res) => {
    try {
        const children = await pool.query(
            "SELECT * FROM children WHERE user_id = $1",
            [req.user.id]
        );
        res.json(children.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Add a child
router.post("/", authorize, async (req, res) => {
    try {
        const { name, date_of_birth, gender, diagnosis_date } = req.body;

        // Handle empty date strings (Postgres throws error on empty string for DATE type)
        const formattedDiagnosisDate = diagnosis_date === "" ? null : diagnosis_date;

        const newChild = await pool.query(
            "INSERT INTO children (user_id, name, date_of_birth, gender, diagnosis_date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [req.user.id, name, date_of_birth, gender, formattedDiagnosisDate]
        );
        res.json(newChild.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get growth logs for a child
router.get("/:id/growth", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        // Verify child belongs to user (optional but good for security)
        const child = await pool.query("SELECT * FROM children WHERE child_id = $1 AND user_id = $2", [id, req.user.id]);
        if (child.rows.length === 0) {
            return res.status(403).json("Not Authorized");
        }

        const logs = await pool.query("SELECT * FROM growth_logs WHERE child_id = $1 ORDER BY recorded_at DESC", [id]);
        res.json(logs.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Add growth log
router.post("/:id/growth", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const { height_cm, weight_kg, head_circumference_cm, note } = req.body;

        // Verify child belongs to user
        const child = await pool.query("SELECT * FROM children WHERE child_id = $1 AND user_id = $2", [id, req.user.id]);
        if (child.rows.length === 0) {
            return res.status(403).json("Not Authorized");
        }

        const newLog = await pool.query(
            "INSERT INTO growth_logs (child_id, height_cm, weight_kg, head_circumference_cm, note) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [id, height_cm, weight_kg, head_circumference_cm, note]
        );
        res.json(newLog.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
