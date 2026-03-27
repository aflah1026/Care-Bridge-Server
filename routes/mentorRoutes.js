const router = require("express").Router();
const authorize = require("../middleware/authMiddleware");
const pool = require("../db");

// Get all mentors (for parents to browse)
router.get("/list", authorize, async (req, res) => {
    try {
        const mentors = await pool.query(
            "SELECT user_id, name, email, specialty, credentials, bio FROM users WHERE role = 'mentor'"
        );
        res.json(mentors.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Connect Parent to Mentor
router.post("/connect", authorize, async (req, res) => {
    try {
        const { mentor_id } = req.body;
        const parent_id = req.user.id;

        // Check if connection already exists
        const existing = await pool.query(
            "SELECT * FROM mentor_clients WHERE mentor_id = $1 AND parent_id = $2",
            [mentor_id, parent_id]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json("Already connected to this mentor");
        }

        const newConnection = await pool.query(
            "INSERT INTO mentor_clients (mentor_id, parent_id) VALUES ($1, $2) RETURNING *",
            [mentor_id, parent_id]
        );

        res.json(newConnection.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get My Mentor (for Parent)
router.get("/my-mentor", authorize, async (req, res) => {
    try {
        const myMentor = await pool.query(
            `SELECT u.user_id, u.name, u.email 
             FROM mentor_clients mc 
             JOIN users u ON mc.mentor_id = u.user_id 
             WHERE mc.parent_id = $1`,
            [req.user.id]
        );
        res.json(myMentor.rows[0] || null);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get My Clients (for Mentor)
router.get("/my-clients", authorize, async (req, res) => {
    try {
        // Ensure requester is a mentor
        if (req.user.role !== 'mentor') {
            // In a real app we'd check DB role, but here we rely on the token payload or trust the query logic
            // Ideally: const checkRole = await pool.query(...)
        }

        const clients = await pool.query(
            `SELECT u.user_id, u.name, u.email, 
             COALESCE(json_agg(c.name) FILTER (WHERE c.name IS NOT NULL), '[]') as children_names
             FROM mentor_clients mc 
             JOIN users u ON mc.parent_id = u.user_id 
             LEFT JOIN children c ON u.user_id = c.user_id
             WHERE mc.mentor_id = $1
             GROUP BY u.user_id, u.name, u.email`,
            [req.user.id]
        );
        res.json(clients.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get children for a specific client (mentor only)
router.get("/clients/:parentId/children", authorize, async (req, res) => {
    try {
        if (req.user.role !== 'mentor') {
            return res.status(403).json("Not Authorized");
        }

        const { parentId } = req.params;
        const allowed = await pool.query(
            "SELECT 1 FROM mentor_clients WHERE mentor_id = $1 AND parent_id = $2 AND status = 'active'",
            [req.user.id, parentId]
        );

        if (allowed.rows.length === 0) {
            return res.status(403).json("Not Authorized");
        }

        const children = await pool.query(
            "SELECT * FROM children WHERE user_id = $1 ORDER BY child_id ASC",
            [parentId]
        );

        res.json(children.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// --- SESSIONS ---

// Create Session (Mentor Only)
router.post("/sessions", authorize, async (req, res) => {
    try {
        const { title, description, start_time, parent_id } = req.body;

        if (!parent_id) {
            return res.status(400).json("Client is required for a session");
        }

        const allowed = await pool.query(
            "SELECT 1 FROM mentor_clients WHERE mentor_id = $1 AND parent_id = $2 AND status = 'active'",
            [req.user.id, parent_id]
        );
        if (allowed.rows.length === 0) {
            return res.status(403).json("Not Authorized");
        }

        const newSession = await pool.query(
            "INSERT INTO sessions (mentor_id, parent_id, title, description, start_time, status) VALUES ($1, $2, $3, $4, $5, 'scheduled') RETURNING *",
            [req.user.id, parent_id, title, description, start_time]
        );

        res.json(newSession.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Mark session as completed (mentor only)
router.patch("/sessions/:sessionId/complete", authorize, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { completed_at } = req.body || {};

        const session = await pool.query(
            "SELECT * FROM sessions WHERE session_id = $1 AND mentor_id = $2",
            [sessionId, req.user.id]
        );
        if (session.rows.length === 0) {
            return res.status(404).json("Session not found");
        }

        const updated = await pool.query(
            "UPDATE sessions SET status = 'completed', completed_at = COALESCE($2, CURRENT_TIMESTAMP) WHERE session_id = $1 RETURNING *",
            [sessionId, completed_at || null]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get Sessions
// - If Mentor: Get sessions I created
// - If Parent: Get sessions of my connected mentor(s)
router.get("/sessions", authorize, async (req, res) => {
    try {
        // We need to know the role. Auth middleware only gives ID if we don't put role in payload.
        // Let's fetch the user role first to be safe, or check both tables.

        const user = await pool.query("SELECT role FROM users WHERE user_id = $1", [req.user.id]);
        const role = user.rows[0].role;

        let sessions;
        if (role === 'mentor') {
            sessions = await pool.query(
                `SELECT s.*, u.name as parent_name, u.email as parent_email
                 FROM sessions s
                 LEFT JOIN users u ON s.parent_id = u.user_id
                 WHERE s.mentor_id = $1
                 ORDER BY s.start_time ASC`,
                [req.user.id]
            );
        } else {
            // Parent: Sessions explicitly scheduled for this parent
            sessions = await pool.query(
                `SELECT s.*, u.name as mentor_name
                 FROM sessions s
                 JOIN users u ON s.mentor_id = u.user_id
                 WHERE s.parent_id = $1
                 ORDER BY s.start_time ASC`,
                [req.user.id]
            );
        }

        res.json(sessions.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
