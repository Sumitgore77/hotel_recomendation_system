// src/routes/recommendRoutes.js
const express = require('express');
const router = express.Router();
const recommendController = require('../controllers/recommendController');

router.get('/user/recommend', recommendController.getRecommendations);


module.exports = router;
