const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");

router.get("/review/:hotel_id", reviewController.renderReviewPage);
router.post("/submit-review", reviewController.submitReview);

module.exports = router;
