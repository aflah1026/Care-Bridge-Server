const router = require("express").Router();
const authController = require("../controllers/authController");
const authorize = require("../middleware/authMiddleware");

// Register
router.post("/register", authController.register);

// Login
router.post("/login", authController.login);

// Verify Token
router.get("/is-verify", authorize, authController.verify);

module.exports = router;
