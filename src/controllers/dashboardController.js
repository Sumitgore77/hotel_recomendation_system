const conn = require('../config/db');


const renderDashboard = (res, data = {}) => {
  res.render("dashboard", {
    section: '',
    bookings: [],
    hotels: [],
    cities: [],
    areas: [],
    hotel: null,
    users: [],
    ...data,
  });
};

exports.handleDashboard = (req, res) => {
  const section = req.query.section || "";
  const hotelId = req.query.id || null;

  if (section === "view-hotels") {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : "%%";

    const countQuery = `
      SELECT COUNT(DISTINCT h.hotel_id) AS total
      FROM hotelmaster h
      LEFT JOIN citymaster c ON h.city_id = c.city_id
      LEFT JOIN areamaster a ON h.area_id = a.area_id
      WHERE h.hotel_name LIKE ? OR h.hotel_address LIKE ?
    `;

    const dataQuery = `
      SELECT 
        h.hotel_id,
        h.hotel_name,
        h.hotel_address,
        h.hotel_email,
        h.hotel_contact AS contact,
        h.image,
        c.city_name,
        a.area_name,
        IFNULL(rc.count, 0) AS review_count,
        GROUP_CONCAT(am.amenity_name SEPARATOR ', ') AS amenities
      FROM hotelmaster h
      LEFT JOIN citymaster c ON h.city_id = c.city_id
      LEFT JOIN areamaster a ON h.area_id = a.area_id
      LEFT JOIN hotelreviewcount rc ON h.hotel_id = rc.hotel_id
      LEFT JOIN hotelamenitiesjoin haj ON h.hotel_id = haj.hotel_id
      LEFT JOIN amenities am ON haj.amenity_id = am.amenity_id
      WHERE h.hotel_name LIKE ? OR h.hotel_address LIKE ?
      GROUP BY h.hotel_id
      LIMIT ? OFFSET ?
    `;

    conn.query(countQuery, [search, search], (err, countResult) => {
      if (err) return res.status(500).send("Database error");

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      conn.query(dataQuery, [search, search, limit, offset], (err, results) => {
        if (err) return res.status(500).send("Database error");

        const hotels = results.map((hotel) => ({
          ...hotel,
          amenities: hotel.amenities ? hotel.amenities.split(",").map((a) => a.trim()) : [],
        }));

        res.render("dashboard", {
          section: "view-hotels",
          hotels,
          page,
          totalPages,
          search: req.query.search || "",
        });
      });
    });
  } else if (section === "users") {
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 10;
    const offset = (page - 1) * itemsPerPage;

    const sql = `SELECT * FROM usermaster WHERE type = 'user' LIMIT ? OFFSET ?`;
    conn.query(sql, [itemsPerPage, offset], (err, users) => {
      if (err) return renderDashboard(res);

      const countSql = `SELECT COUNT(*) as total FROM usermaster WHERE type = 'user'`;
      conn.query(countSql, (countErr, countResult) => {
        if (countErr) return renderDashboard(res);

        const totalPages = Math.ceil(countResult[0].total / itemsPerPage);
        renderDashboard(res, { section, users, page, totalPages });
      });
    });
  } else if (section === "bookings") {
    const sql = `
      SELECT b.*, u.username, h.hotel_name, h.image
      FROM bookingmaster b
      JOIN usermaster u ON b.userid = u.userid
      JOIN hotelmaster h ON b.hotel_id = h.hotel_id
      ORDER BY b.booking_date DESC
    `;

    conn.query(sql, (err, bookings) => {
      if (err) return res.status(500).send("Server error while fetching bookings");
      renderDashboard(res, { section, bookings });
    });
  } else if (section === "edit-hotel" && hotelId) {
    const sql = `
      SELECT h.*, c.city_name, a.area_name
      FROM hotelmaster h
      LEFT JOIN citymaster c ON h.city_id = c.city_id
      LEFT JOIN areamaster a ON h.area_id = a.area_id
      WHERE h.hotel_id = ?
    `;
    conn.query(sql, [hotelId], (err, result) => {
      if (err) return res.status(500).send("Error finding hotel");

      if (result.length === 0) return res.status(404).send("Hotel not found");

      renderDashboard(res, { hotel: result[0], section });
    });
  } else {
    renderDashboard(res, { section });
  }
};
