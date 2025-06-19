const conn = require('../config/db');

exports.deleteUser = (req, res) => {
  const userId = req.params.id;
  const sql = 'DELETE FROM userMaster WHERE userid = ? AND type != "admin"';

  conn.query(sql, [userId], (err) => {
    if (err) return res.status(500).send("Database error.");
    res.redirect("/admin/users");
  });
};


exports.renderUserDashboard = (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/user/login");
  }

  console.log("Session Data:", {
    username: req.session.username,
    email: req.session.email,
    contact: req.session.contact,
  });

  const hotelQuery = `
    SELECT 
      h.hotel_id,
      h.hotel_name,
      h.hotel_email,
      h.hotel_contact,
      h.hotel_address,
      c.city_name,
      a.area_name,
      h.image,
      GROUP_CONCAT(am.amenity_name SEPARATOR ', ') AS Amenities
    FROM hotelmaster h
    LEFT JOIN citymaster c ON h.city_id = c.city_id
    LEFT JOIN areamaster a ON h.area_id = a.area_id
    LEFT JOIN hotelamenitiesjoin haj ON h.hotel_id = haj.hotel_id
    LEFT JOIN amenities am ON haj.amenity_id = am.amenity_id
    GROUP BY h.hotel_id;
  `;

  conn.query(hotelQuery, (err, result) => {
    if (err) {
      console.error("❌ SQL Error:", err.sqlMessage || err.message || err);
      return res.status(500).send("Server Error");
    }

    res.render("user-dashboard", {
      hotels: result,
      username: req.session.username,
      email: req.session.email,
      contact: req.session.contact,
    });
  });
};

// Logout handler
exports.logout = (req, res) => {
  if (req.session) req.session.destroy();
  res.clearCookie("token");
  res.redirect("/");
};
