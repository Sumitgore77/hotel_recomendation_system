const conn = require('../config/db');

exports.deleteHotel = (req, res) => {
  const hotelId = req.params.id;

  const deleteSql = "DELETE FROM hotelmaster WHERE hotel_id = ?";
  conn.query(deleteSql, [hotelId], (err) => {
    if (err) {
      console.error("Error deleting hotel:", err);
      return res.status(500).send("Error deleting hotel.");
    }

    res.redirect("/dashboard?section=view-hotels");
  });
};

exports.renderAddHotelForm = (req, res) => {
  res.render("partials/content/add-hotel");
};