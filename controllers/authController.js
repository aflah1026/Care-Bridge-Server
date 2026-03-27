const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwtGenerator = require("../utils/jwtGenerator");

exports.register = async (req, res) => {
    try {
        const { name, email, password, role, specialty, credentials, bio } = req.body;

        const user = await pool.query("SELECT * FROM users WHERE email = $1", [
            email
        ]);

        if (user.rows.length !== 0) {
            return res.status(401).send("User already exists");
        }

        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO users (name, email, password_hash, role, specialty, credentials, bio) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [name, email, bcryptPassword, role || 'parent', specialty || null, credentials || null, bio || null]
        );

        const token = jwtGenerator(newUser.rows[0]);

        res.json({ token, user: newUser.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await pool.query("SELECT * FROM users WHERE email = $1", [
            email
        ]);

        if (user.rows.length === 0) {
            return res.status(401).json("Password or Email is incorrect");
        }

        const validPassword = await bcrypt.compare(
            password,
            user.rows[0].password_hash
        );

        if (!validPassword) {
            return res.status(401).json("Password or Email is incorrect");
        }

        const token = jwtGenerator(user.rows[0]);

        res.json({ token, user: user.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

exports.verify = async (req, res) => {
    try {
        // req.user is set by authMiddleware (contains user_id)
        const user = await pool.query("SELECT user_id, name, email, role, created_at FROM users WHERE user_id = $1", [
            req.user.id
        ]);

        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};
