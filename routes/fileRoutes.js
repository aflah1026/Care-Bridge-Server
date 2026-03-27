const router = require('express').Router();
const pool = require('../db');
const authorize = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Get shared files between user and another user
router.get('/:otherUserId', authorize, async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const myId = req.user.id;

        const files = await pool.query(
            `SELECT * FROM shared_files 
             WHERE (uploader_id = $1 AND receiver_id = $2) 
             OR (uploader_id = $2 AND receiver_id = $1)
             ORDER BY created_at DESC`,
            [myId, otherUserId]
        );

        res.json(files.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

// Upload a file
router.post('/:receiverId', authorize, upload.single('file'), async (req, res) => {
    try {
        const { receiverId } = req.params;
        const uploaderId = req.user.id;
        
        if (!req.file) {
            return res.status(400).json("No file uploaded");
        }

        const fileName = req.file.originalname;
        // The URL will just be the path they can fetch it from, e.g. /uploads/filename
        const fileUrl = `/uploads/${req.file.filename}`;

        const newFile = await pool.query(
            "INSERT INTO shared_files (uploader_id, receiver_id, file_name, file_url) VALUES ($1, $2, $3, $4) RETURNING *",
            [uploaderId, receiverId, fileName, fileUrl]
        );

        res.json(newFile.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

module.exports = router;
