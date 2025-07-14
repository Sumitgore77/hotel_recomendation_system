const conn = require('../config/db');

exports.deleteBooking = (req, res) => {
  const bookingId = req.params.id;

  conn.query(
    "DELETE FROM bookingmaster WHERE booking_id = ?",
    [bookingId],
    (err) => {
      if (err) {
        console.error("Error deleting booking:", err);
        return res.status(500).send("Server error");
      }

      res.redirect("/dashboard?section=bookings");
    }
  );
};

exports.getAdminBookings = (req, res) => {
  const sql = `
    SELECT b.*, u.username, h.hotel_name, h.image
    FROM bookingmaster b
    JOIN usermaster u ON b.userid = u.userid
    JOIN hoteldetail h ON b.hotel_id = h.hotel_id
    ORDER BY b.booking_date DESC
  `;

  conn.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching bookings:", err);
      return res.status(500).send("Error loading bookings.");
    }

    res.render("admin-bookings", {
      bookings: results,
    });
  });
};

exports.getAdminBookings = (req, res) => {
  const sql = `
    SELECT b.*, u.username, h.hotel_name, h.image
    FROM bookingmaster b
    JOIN usermaster u ON b.userid = u.userid
    JOIN hotelmaster h ON b.hotel_id = h.hotel_id
    ORDER BY b.booking_date DESC
  `;

  conn.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching bookings:", err);
      return res.status(500).send("Error loading bookings.");
    }

    res.render("admin-bookings", {
      bookings: results,
    });
  });
};

// ✅ GET Booking Form (User)
exports.renderBookingForm = (req, res) => {
  const hotelId = req.params.hotel_id;

  if (!req.session.userId) return res.redirect("/user/login");

  const hotelQuery = `
    SELECT hotel_id, hotel_name, hotel_address, hotel_email, hotel_contact 
    FROM hotelmaster 
    WHERE hotel_id = ?
  `;

  conn.query(hotelQuery, [hotelId], (err, hotelRows) => {
    if (err) return res.status(500).send("Server error");
    if (hotelRows.length === 0) return res.status(404).send("Hotel not found");

    const hotel = hotelRows[0];

    const roomQuery = `
      SELECT r.room_id, r.room_type, j.price
      FROM hotelroomjoin j
      JOIN roomsmaster r ON j.room_id = r.room_id
      WHERE j.hotel_id = ?
    `;

    conn.query(roomQuery, [hotelId], (err2, roomRows) => {
      if (err2) {
        console.error("Room fetch error:", err2);
        return res.status(500).send("Error fetching room types");
      }

      hotel.rooms = roomRows || [];
      res.render("book-hotel", { hotel });
    });
  });
};


exports.bookHotel = (req, res) => {
  const hotelId = req.params.hotel_id;
  const userId = req.session.userId;

  if (!userId) return res.redirect("/user/login");

  const {
    checkin_date,
    checkin_time,
    checkout_date,
    checkout_time,
    room_id
  } = req.body;

  const bookingDate = new Date().toISOString().slice(0, 10);

  const insertBooking = `
    INSERT INTO bookingmaster (
      userid, hotel_id, room_id, booking_date, checkin_date, checkin_time, checkout_date, checkout_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  conn.query(
    insertBooking,
    [userId, hotelId, room_id, bookingDate, checkin_date, checkin_time, checkout_date, checkout_time],
    (err, result) => {
      if (err) {
        console.error("❌ Booking error:", err);
        return res.status(500).send("Error saving booking.");
      }

      const bookingId = result.insertId;

      const fetchDetails = `
        SELECT b.*, h.hotel_name, h.hotel_address, h.hotel_email,
               r.room_type, j.price
        FROM bookingmaster b
        JOIN hotelmaster h ON b.hotel_id = h.hotel_id
        JOIN roomsmaster r ON b.room_id = r.room_id
        JOIN hotelroomjoin j ON b.hotel_id = j.hotel_id AND b.room_id = j.room_id
        WHERE b.booking_id = ?
      `;

      conn.query(fetchDetails, [bookingId], (err2, rows) => {
        if (err2 || rows.length === 0) {
          console.warn("⚠️ Confirmation fetch failed:", err2);
          return res.send(
            `<script>alert("Booking saved, but confirmation failed."); window.location.href='/user/home';</script>`
          );
        }

        res.render("booking-confirmation", {
          booking: rows[0],
        });
      });
    }
  );
};