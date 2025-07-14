const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');


router.get("/home", userController.renderUserDashboard);
// router.get("/home", userController.userHome);
router.get("/logout", userController.logout);

module.exports = router;
