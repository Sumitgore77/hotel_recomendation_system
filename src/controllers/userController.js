const conn = require('../config/db');

// Delete user - restricted to non-admins
exports.deleteUser = (req, res) => {
  const userId = req.params.id;
  const sql = 'DELETE FROM userMaster WHERE userid = ? AND type != "admin"';

  conn.query(sql, [userId], (err) => {
    if (err) return res.status(500).send("Database error.");
    res.redirect("/admin/users");
  });
};

// Render user dashboard
exports.renderUserDashboard = (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect("/user/login");
  }

  // Set Cache-Control to prevent browser caching
   res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  // Query hotels and amenities
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
      GROUP_CONCAT(DISTINCT am.amenity_name SEPARATOR ', ') AS Amenities
    FROM hotelmaster h
    LEFT JOIN citymaster c ON h.city_id = c.city_id
    LEFT JOIN areamaster a ON h.area_id = a.area_id
    LEFT JOIN hotelamenitiesjoin haj ON h.hotel_id = haj.hotel_id
    LEFT JOIN amenities am ON haj.amenity_id = am.amenity_id
    GROUP BY h.hotel_id;
  `;

  conn.query(hotelQuery, (err, hotels) => {
    if (err) {
      console.error("❌ Hotel SQL Error:", err.sqlMessage || err.message || err);
      return res.status(500).send("Server Error while loading hotels.");
    }

    const roomQuery = `
      SELECT 
        hrj.hotel_id,
        r.room_type,
        hrj.price
      FROM hotelroomjoin hrj
      JOIN roomsmaster r ON hrj.room_id = r.room_id;
    `;

    conn.query(roomQuery, (err2, roomData) => {
      if (err2) {
        console.error("❌ Room SQL Error:", err2.sqlMessage || err2.message || err2);
        return res.status(500).send("Server Error while loading rooms.");
      }

      // Map rooms to hotels
      const hotelMap = {};
      hotels.forEach(hotel => {
        hotel.rooms = [];
        hotel.amenities = hotel.Amenities ? hotel.Amenities.split(',').map(a => a.trim()) : [];
        hotelMap[hotel.hotel_id] = hotel;
      });

      roomData.forEach(room => {
        if (hotelMap[room.hotel_id]) {
          hotelMap[room.hotel_id].rooms.push({
            room_type: room.room_type,
            price: room.price
          });
        }
      });

      // Render dashboard
      res.render("user-dashboard", {
        hotels,
        username: req.session.username,
        email: req.session.email,
        contact: req.session.contact,
      });
    });
  });
};


exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.clearCookie('connect.sid'); // Default cookie name for express-session
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.redirect('/login');
  });
};

