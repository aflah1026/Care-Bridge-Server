const jwt = require("jsonwebtoken");
require("dotenv").config();

function jwtGenerator(user) {
    const payload = {
        user: {
            id: user.user_id || user.id || user,
            role: user.role,
            name: user.name,
            email: user.email
        }
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
}

module.exports = jwtGenerator;
