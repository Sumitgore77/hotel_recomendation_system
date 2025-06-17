const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.showLogin);
router.post('/login', authController.loginUser);

router.get('/register', authController.showRegister);
router.post('/saveReg', authController.registerUser);

module.exports = router;
