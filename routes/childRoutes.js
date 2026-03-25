const router = require("express").Router();
const authorize = require("../middleware/authMiddleware");
const pool = require("../db");

const verifyAccess = async (childId, userId) => {
    const child = await pool.query(
        `SELECT c.child_id FROM children c
         LEFT JOIN mentor_clients mc ON c.user_id = mc.parent_id
         WHERE c.child_id = $1 AND (c.user_id = $2 OR (mc.mentor_id = $2 AND mc.status = 'active'))`,
        [childId, userId]
    );
    return child.rows.length > 0;
};

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

// Get a single child (parent or connected mentor)
router.get("/:id", authorize, async (req, res) => {
    try {
        const { id } = req.params;
        const allowed = await verifyAccess(id, req.user.id);
        if (!allowed) {
            return res.status(403).json("Not Authorized");
        }

        const child = await pool.query("SELECT * FROM children WHERE child_id = $1", [id]);
        if (child.rows.length === 0) {
            return res.status(404).json("Child not found");
        }
        res.json(child.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Add a child
router.post("/", authorize, async (req, res) => {
    try {
        const { name, date_of_birth, gender, diagnosis_date, diagnosis_details, bio } = req.body;

        // Handle empty date strings (Postgres throws error on empty string for DATE type)
        const formattedDiagnosisDate = diagnosis_date === "" ? null : diagnosis_date;

        const newChild = await pool.query(
            "INSERT INTO children (user_id, name, date_of_birth, gender, diagnosis_date, diagnosis_details, bio) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [req.user.id, name, date_of_birth, gender, formattedDiagnosisDate, diagnosis_details || null, bio || null]
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
        const allowed = await verifyAccess(id, req.user.id);
        if (!allowed) {
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
        const { height_cm, weight_kg, head_circumference_cm, note, category, value } = req.body;

        const allowed = await verifyAccess(id, req.user.id);
        if (!allowed) {
            return res.status(403).json("Not Authorized");
        }

        const newLog = await pool.query(
            "INSERT INTO growth_logs (child_id, category, value, height_cm, weight_kg, head_circumference_cm, note) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [id, category || null, value || null, height_cm, weight_kg, head_circumference_cm, note]
        );
        res.json(newLog.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
