const jwt = require("jsonwebtoken");
const pool = require("../db");
require("dotenv").config();

module.exports = async (req, res, next) => {
    try {
        const jwtToken = req.header("token");

        if (!jwtToken) {
            return res.status(403).json("Not Authorized");
        }

        const payload = jwt.verify(jwtToken, process.env.JWT_SECRET);

        req.user = payload.user || { id: payload.user_id };

        if (!req.user?.role) {
            const user = await pool.query(
                "SELECT role, name, email FROM users WHERE user_id = $1",
                [req.user.id]
            );
            if (user.rows[0]) {
                req.user = {
                    ...req.user,
                    role: user.rows[0].role,
                    name: user.rows[0].name,
                    email: user.rows[0].email
                };
            }
        }
        next();
    } catch (err) {
        console.error(err.message);
        return res.status(403).json("Not Authorized");
    }
};
