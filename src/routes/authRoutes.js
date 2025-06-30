const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/login", (req, res) => {
  authController.renderLogin(req, res); 
});

router.get("/register", authController.renderRegister);
router.post("/saveReg", authController.registerUser);
router.post("/login", authController.loginUser);
router.get("/logout", authController.logout); 



module.exports = router;
