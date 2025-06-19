const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/login", authController.renderLogin);
router.get("/register", authController.renderRegister);
router.post("/saveReg", authController.registerUser);
router.post("/login", authController.loginUser);

module.exports = router;
