const path = require("path");
const conn = require("../config/db");

exports.handleAdminSection = (req, res) => {
  const section = req.params.section;

  if (section === "users") {
    conn.query('SELECT * FROM userMaster WHERE type != "admin"', (err, users) => {
      if (err) return res.status(500).send("Database error");
      res.render("dashboard", { section, users });
    });

  } else if (section === "hotels") {
    conn.query("SELECT * FROM cityMaster", (err, cities) => {
      if (err) return res.status(500).send("Database error");
      conn.query("SELECT * FROM areaMaster", (err, areas) => {
        if (err) return res.status(500).send("Database error");
        res.render("dashboard", { section, cities, areas });
      });
    });

  } else if (section === "city") {
    conn.query("SELECT * FROM cityMaster", (err, cities) => {
      if (err) return res.status(500).send("Database error");
      res.render("dashboard", { section, cities });
    });

  } else {
    res.render("dashboard", { section });
  }
};

// ===================== HOTEL FORM HANDLING =====================

exports.addHotel = (req, res) => {
  const {
    name,
    address,
    city_name,
    area_name,
    email,
    contact,
    amenities
  } = req.body;
  const image = req.file ? req.file.filename : null;
  const rating = null;
  const reviewcount = null;

  const getCityId = new Promise((resolve, reject) => {
    const cityQuery = "SELECT city_id FROM citymaster WHERE city_name = ?";
    conn.query(cityQuery, [city_name], (err, rows) => {
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
    });
  });

  const getAreaId = new Promise((resolve, reject) => {
    const areaQuery = "SELECT area_id FROM areamaster WHERE area_name = ?";
    conn.query(areaQuery, [area_name], (err, rows) => {
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
    });
  });

  Promise.all([getCityId, getAreaId])
    .then(([city_id, area_id]) => {
      const insertHotel = `
        INSERT INTO hotelMaster
        (hotel_name, hotel_address, city_id, area_id, hotel_email, hotel_contact, rating, reviewcount, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      conn.query(
        insertHotel,
        [name, address, city_id, area_id, email, contact, rating, reviewcount, image],
        (err, result) => {
          if (err) return res.status(500).send("Error inserting hotel");
          const hotel_id = result.insertId;

          // Handle amenities
          if (!amenities || amenities.trim() === "")
            return res.redirect("/dashboard?section=view-hotels");

          const amenityList = amenities
            .split(",")
            .map((a) => a.trim())
            .filter((a) => a !== "");

          const getAmenityIds = amenityList.map((amenityName) => {
            return new Promise((resolve, reject) => {
              const checkQuery =
                "SELECT amenity_id FROM amenities WHERE amenity_name = ?";
              conn.query(checkQuery, [amenityName], (err, rows) => {
                if (err) return reject(err);
                if (rows.length > 0) return resolve(rows[0].amenity_id);

                conn.query(
                  "INSERT INTO amenities (amenity_name) VALUES (?)",
                  [amenityName],
                  (err2, result) => {
                    if (err2) return reject(err2);
                    resolve(result.insertId);
                  }
                );
              });
            });
          });

          Promise.all(getAmenityIds)
            .then((amenityIds) => {
              const values = amenityIds.map((aid) => [hotel_id, aid]);
              conn.query(
                "INSERT INTO hotelamenitiesjoin (hotel_id, amenity_id) VALUES ?",
                [values],
                (err3) => {
                  if (err3) return res.status(500).send("Error linking amenities");
                  res.redirect("/dashboard?section=view-hotels");
                }
              );
            })
            .catch(() => res.status(500).send("Failed processing amenities"));
        }
      );
    })
    .catch(() => res.status(500).send("Error resolving city or area"));
};
//================================
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
        SET hotel_name = ?, hotel_address = ?, hotel_email = ?, hotel_contact = ?,
            city_id = ?, area_id = ?
      `;
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
    FROM hotelMaster h
    JOIN cityMaster c ON h.city_id = c.city_id
    JOIN areaMaster a ON h.area_id = a.area_id
  `;

  conn.query(sql, (err, hotels) => {
    if (err) {
      console.error("Error fetching hotels:", err);
      return res.status(500).send("Database error");
    }

    res.render("view-hotels", { hotels });
  });
};