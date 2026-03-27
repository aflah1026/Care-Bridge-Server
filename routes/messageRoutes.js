const router = require('express').Router();
const pool = require('../db');
const authorize = require('../middleware/authMiddleware');

// Get messages between user and another user
router.get('/:otherUserId', authorize, async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const myId = req.user.id;

        const messages = await pool.query(
            `SELECT m.*, u.name as sender_name 
             FROM messages m
             JOIN users u ON m.sender_id = u.user_id
             WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
             OR (m.sender_id = $2 AND m.receiver_id = $1)
             ORDER BY m.created_at ASC`,
            [myId, otherUserId]
        );

        res.json(messages.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

// Send a message
router.post('/:receiverId', authorize, async (req, res) => {
    try {
        const { receiverId } = req.params;
        const senderId = req.user.id;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json("Content is required");
        }

        const inserted = await pool.query(
            "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *",
            [senderId, receiverId, content]
        );
        const messageId = inserted.rows[0].message_id;

        const messageWithSender = await pool.query(
            `SELECT m.*, u.name as sender_name 
             FROM messages m
             JOIN users u ON m.sender_id = u.user_id
             WHERE m.message_id = $1`,
            [messageId]
        );

        const payload = messageWithSender.rows[0];

        const io = req.app.get('io');
        if (io && payload) {
            io.to(`user:${receiverId}`).emit('message:new', payload);
            io.to(`user:${senderId}`).emit('message:new', payload);
        }

        res.json(payload);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

module.exports = router;
