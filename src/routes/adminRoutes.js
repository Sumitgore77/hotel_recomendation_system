const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const multer = require("multer");
const path = require("path");

// Setup multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

router.get("/admin/:section", adminController.handleAdminSection);
// Route to add hotel
router.post("/admin/add-hotel", upload.single("image"), adminController.addHotel);

router.get("/admin/edit-hotel/:id", adminController.editHotel);
router.post("/admin/update-hotel/:id", upload.single("hotel_image"), adminController.updateHotel);

router.get('/admin/view-hotels', adminController.renderViewHotels);

module.exports = router;
