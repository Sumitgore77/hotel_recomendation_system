const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.post('/delete-booking/:id', bookingController.deleteBooking);
router.get('/admin/bookings', bookingController.getAdminBookings);
// GET booking form
router.get("/user/book/:hotel_id", bookingController.renderBookingForm);

// POST booking submission
router.post("/user/book/:hotel_id", bookingController.bookHotel);
module.exports = router;
