const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');

// DELETE hotel route
router.post('/admin/delete-hotel/:id', hotelController.deleteHotel);
router.get('/admin/add-hotel', hotelController.renderAddHotelForm);

module.exports = router;
