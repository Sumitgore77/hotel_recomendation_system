const path = require("path");
const conn = require('../config/db');

exports.handleAdminSection = (req, res) => {
  const section = req.params.section;

  if (section === "users") {
    conn.query('SELECT * FROM usermaster WHERE type != "admin"', (err, users) => {
      if (err) return res.status(500).send("Database error");
      res.render("dashboard", { section, users });
    });

  } else if (section === "hotels") {
    conn.query("SELECT * FROM citymaster", (err, cities) => {
      if (err) return res.status(500).send("Database error");
      conn.query("SELECT * FROM areamaster", (err, areas) => {
        if (err) return res.status(500).send("Database error");
        res.render("dashboard", { section, cities, areas });
      });
    });

  } else if (section === "city") {
    conn.query("SELECT * FROM citymaster", (err, cities) => {
      if (err) return res.status(500).send("Database error");
      res.render("dashboard", { section, cities });
    });

  } else {
    res.render("dashboard", { section });
  }
};

// ===================== HOTEL FORM HANDLING =====================

// ================= BACKEND: addHotel Controller =================
const validator = require("validator");

exports.addHotel = (req, res) => {
  const {
    name,address,city_name,area_name,email,contact,amenities,room_type,price} = req.body;

  const image = req.file ? req.file.filename : null;
  const rating = null;
  const reviewcount = null;

  // === Basic Input Validation ===
  if (!name || name.trim().length < 3) return res.status(400).send("Invalid hotel name.");
  if (!address || address.trim() === "") return res.status(400).send("Invalid address.");
  if (!city_name || city_name.trim() === "") return res.status(400).send("Invalid city.");
  if (!area_name || area_name.trim() === "") return res.status(400).send("Invalid area.");
  if (!email || !validator.isEmail(email)) return res.status(400).send("Invalid email format.");
  if (!contact || !/^[6-9]\d{9}$/.test(contact)) return res.status(400).send("Invalid contact number.");
  if (!room_type || !price) return res.status(400).send("Room type and price required.");

  const roomTypeList = room_type.split(",").map(r => r.trim()).filter(r => r !== "");
  const priceList = price.split(",").map(p => parseFloat(p.trim())).filter(p => !isNaN(p));

  if (roomTypeList.length !== priceList.length) {
    return res.status(400).send("Room types and prices count mismatch.");
  }

  const amenityList = (amenities || "").split(",").map(a => a.trim()).filter(a => a !== "");

  // === City and Area Insertion ===
  const getCityId = new Promise((resolve, reject) => {
    conn.query("SELECT city_id FROM citymaster WHERE city_name = ?", [city_name], (err, rows) => {
      if (err) return reject(err);
      if (rows.length > 0) return resolve(rows[0].city_id);
      conn.query("INSERT INTO citymaster (city_name) VALUES (?)", [city_name], (err2, result) => {
        if (err2) return reject(err2);
        resolve(result.insertId);
      });
    });
  });

  const getAreaId = new Promise((resolve, reject) => {
    conn.query("SELECT area_id FROM areamaster WHERE area_name = ?", [area_name], (err, rows) => {
      if (err) return reject(err);
      if (rows.length > 0) return resolve(rows[0].area_id);
      conn.query("INSERT INTO areamaster (area_name) VALUES (?)", [area_name], (err2, result) => {
        if (err2) return reject(err2);
        resolve(result.insertId);
      });
    });
  });

  // === Hotel Insertion and Chained Logic ===
  Promise.all([getCityId, getAreaId])
    .then(([city_id, area_id]) => {
      const insertHotel = `
        INSERT INTO hotelmaster
        (hotel_name, hotel_address, city_id, area_id, hotel_email, hotel_contact, rating, reviewcount, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      conn.query(insertHotel, [name, address, city_id, area_id, email, contact, rating, reviewcount, image], (err, result) => {
        if (err) return res.status(500).send("Error inserting hotel.");

        const hotel_id = result.insertId;

        const roomInsertPromises = roomTypeList.map((roomType, index) => {
          return new Promise((resolve, reject) => {
            conn.query("SELECT room_id FROM roomsmaster WHERE room_type = ?", [roomType], (err, rows) => {
              if (err) return reject(err);
              if (rows.length > 0) return resolve({ room_id: rows[0].room_id, price: priceList[index] });
              conn.query("INSERT INTO roomsmaster (room_type) VALUES (?)", [roomType], (err2, result) => {
                if (err2) return reject(err2);
                resolve({ room_id: result.insertId, price: priceList[index] });
              });
            });
          });
        });

        Promise.all(roomInsertPromises).then((roomDataList) => {
          const hotelRoomValues = roomDataList.map(({ room_id, price }) => [hotel_id, room_id, price]);
          conn.query("INSERT INTO hotelroomjoin (hotel_id, room_id, price) VALUES ?", [hotelRoomValues], (err2) => {
            if (err2) return res.status(500).send("Error linking rooms");

            const getAmenityIds = amenityList.map((amenityName) => {
              return new Promise((resolve, reject) => {
                conn.query("SELECT amenity_id FROM amenities WHERE amenity_name = ?", [amenityName], (err, rows) => {
                  if (err) return reject(err);
                  if (rows.length > 0) return resolve(rows[0].amenity_id);
                  conn.query("INSERT INTO amenities (amenity_name) VALUES (?)", [amenityName], (err2, result) => {
                    if (err2) return reject(err2);
                    resolve(result.insertId);
                  });
                });
              });
            });

            Promise.all(getAmenityIds)
              .then((amenityIds) => {
                if (amenityIds.length === 0) return res.redirect("/dashboard?section=view-hotels");

                const amenityValues = amenityIds.map((aid) => [hotel_id, aid]);
                conn.query("INSERT INTO hotelamenitiesjoin (hotel_id, amenity_id) VALUES ?", [amenityValues], (err3) => {
                  if (err3) return res.status(500).send("Error linking amenities");
                  res.redirect("/dashboard?section=view-hotels");
                });
              })
              .catch(() => res.status(500).send("Error processing amenities"));
          });
        }).catch(() => res.status(500).send("Error linking room types"));
      });
    })
    .catch(() => res.status(500).send("Error resolving city or area"));
};

// GET: Render Edit Hotel Form
exports.editHotel = (req, res) => {
  const hotelId = req.params.id;

  const sql = "SELECT * FROM hotelmaster WHERE hotel_id = ?";
  conn.query(sql, [hotelId], (err, result) => {
    if (err) return res.status(500).send("DB error");
    if (result.length === 0) return res.status(404).send("Hotel not found");
    res.render("partials/content/edit-hotel", {
      hotel: result[0],
    });
  });
};

//delete user login
exports.deleteUser = (req, res) => {
  const userId = req.params.id;
  const sql = 'DELETE FROM usermaster WHERE userid = ? AND type != "admin"';

  conn.query(sql, [userId], (err) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Database error.");
    }
    res.redirect("/admin/users"); // Change to your actual user list page
  });
};


// POST: Update Hotel
exports.updateHotel = (req, res) => {
  const hotelId = req.params.id;
  const {
    hotel_name,
    hotel_address,
    hotel_email,
    hotel_contact,
    city_name,
    area_name,
  } = req.body;
  const image = req.file ? req.file.filename : null;

  const getCityId = new Promise((resolve, reject) => {
    conn.query(
      "SELECT city_id FROM citymaster WHERE city_name = ?",
      [city_name],
      (err, rows) => {
        if (err) return reject(err);
        if (rows.length > 0) return resolve(rows[0].city_id);
        conn.query(
          "INSERT INTO citymaster (city_name) VALUES (?)",
          [city_name],
          (err2, result) => {
            if (err2) return reject(err2);
            resolve(result.insertId);
          }
        );
      }
    );
  });

  const getAreaId = new Promise((resolve, reject) => {
    conn.query(
      "SELECT area_id FROM areamaster WHERE area_name = ?",
      [area_name],
      (err, rows) => {
        if (err) return reject(err);
        if (rows.length > 0) return resolve(rows[0].area_id);
        conn.query(
          "INSERT INTO areamaster (area_name) VALUES (?)",
          [area_name],
          (err2, result) => {
            if (err2) return reject(err2);
            resolve(result.insertId);
          }
        );
      }
    );
  });

  Promise.all([getCityId, getAreaId])
    .then(([city_id, area_id]) => {
      let updateQuery = `
        UPDATE hotelmaster
        SET hotel_name = ?, hotel_address = ?, hotel_email = ?, hotel_contact = ?,city_id = ?, area_id = ?`;
        
      const queryParams = [
        hotel_name,
        hotel_address,
        hotel_email,
        hotel_contact,
        city_id,
        area_id,
      ];

      if (image) {
        updateQuery += `, image = ?`;
        queryParams.push(image);
      }

      updateQuery += ` WHERE hotel_id = ?`;
      queryParams.push(hotelId);

      conn.query(updateQuery, queryParams, (err) => {
        if (err) {
          console.error("Error updating hotel:", err);
          return res.status(500).send("Error updating hotel");
        }

        res.redirect("/dashboard?section=view-hotels");
      });
    })
    .catch((err) => {
      console.error("City/Area update error:", err);
      res.status(500).send("Internal server error");
    });
};
//================================
exports.renderViewHotels = (req, res) => {
  const sql = `
    SELECT h.*, c.city_name, a.area_name
    FROM hotelmaster h
    JOIN citymaster c ON h.city_id = c.city_id
    JOIN areamaster a ON h.area_id = a.area_id
  `;

  conn.query(sql, (err, hotels) => {
    if (err) {
      console.error("Error fetching hotels:", err);
      return res.status(500).send("Database error");
    }

    res.render("view-hotels", { hotels });
  });
};