const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();
const bodyParser = require("body-parser");
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
let conn = require("./src/config/db");
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
const session = require('express-session');
app.use(session({secret: 'secret123', 
                resave: false,
                saveUninitialized: true
}));


// ================== HOME PAGE ===================
app.get("/", (req, res) => {
  const {
    search = '', rating = '', city = ''
  } = req.query;

  const allHotels = [{
      id: 1,
      name: "Hotel Taj",
      city: "Mumbai",
      image: "/Images/1.jpg",
      rating: 4.8,
      description: "Luxury hotel with sea view and premium rooms."
    },
    {
      id: 2,
      name: "The Oberoi",
      city: "Delhi",
      image: "/Images/2.jpg",
      rating: 4.6,
      description: "Elegant ambiance with world-class dining experience."
    },
    {
      id: 3,
      name: "Fairmont Jaipur",
      city: "Jaipur",
      image: "/Images/3.jpg",
      rating: 4.6,
      description: "Palace-style stay with luxury spa experience."
    }
  ];

  const filteredHotels = allHotels.filter(hotel => {
    const matchesSearch = search === '' || hotel.name.toLowerCase().includes(search.toLowerCase()) || hotel.description.toLowerCase().includes(search.toLowerCase());
    const matchesRating = rating === '' || hotel.rating >= parseFloat(rating);
    const matchesCity = city === '' || hotel.city.toLowerCase() === city.toLowerCase();
    return matchesSearch && matchesRating && matchesCity;
  });

  res.render("home", {
    hotels: filteredHotels,
    search,
    rating,
    city
  });
});

// ================== AUTH ROUTES ===================
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));

app.post("/saveReg", (req, res) => {
  const {
    name,
    email,
    password,
    confirm_password,
    contact
  } = req.body;
  const type = "user";

  if (password !== confirm_password) return res.send("Password and Confirm Password do not match.");

  const checkSql = "SELECT * FROM userMaster WHERE useremail = ?";
  conn.query(checkSql, [email], (err, results) => {
    if (err) return res.send("Error checking email.");
    if (results.length > 0) return res.send("User already registered with this email.");

    const hashedPassword = bcrypt.hashSync(password, 8);
    const insertSql = "INSERT INTO userMaster (username, useremail, password, contact, type) VALUES (?, ?, ?, ?, ?)";
    conn.query(insertSql, [name, email, hashedPassword, contact, type], (err) => {
      if (err) return res.send("Error registering user.");
      res.render("login");
    });
  });
});

app.post('/login', (req, res) => {
  const {
    email,
    password
  } = req.body;

  const sql = 'SELECT * FROM userMaster WHERE useremail = ?';
  conn.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).send('Server error.');
    if (results.length === 0) return res.status(401).send('Invalid email or password.');

    const user = results[0];
    const isMatch = user.type === 'admin' ? password === user.password : await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send('Invalid email or password.');

    const payload = {
      id: user.id,
      name: user.username,
      email: user.useremail,
      type: user.type
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    if (user.type === 'admin') {
      conn.query('SELECT * FROM userMaster WHERE type != "admin"', (err, result) => {
        if (err) return res.status(500).send('Database error');
        res.render('dashboard', {
          section: 'users',
          users: result
        });
      });
    } else {
      req.session.userId = user.userid;
      const sql = `
    SELECT 
  h.hotel_id,
  h.hotel_name,
  h.hotel_address,
  h.hotel_email AS hotel_email,   
  h.hotel_contact AS contact,
  h.image,
  c.city_name,
  a.area_name
FROM 
  hotelMaster h
JOIN 
  cityMaster c ON h.city_id = c.city_id
JOIN 
  areaMaster a ON h.area_id = a.area_id
  `;

      conn.query(sql, (err, hotels) => {
        if (err) return res.status(500).send('Database error');
        req.session.userId = results[0].userid;
        res.render("user-dashboard", {
          hotels
        });
      });
    }
  });
});

app.get('/debug-session', (req, res) => {
  res.json(req.session);
});


// ================== ADMIN ROUTES ===================
app.get('/admin/:section', (req, res) => {
  const section = req.params.section;

  if (section === 'users') {
    conn.query('SELECT * FROM userMaster WHERE type != "admin"', (err, result) => {
      if (err) return res.status(500).send('Database error');
      res.render('dashboard', {
        section,
        users: result
      });
    });

  } else if (section === 'hotels') {
    conn.query('SELECT * FROM cityMaster', (err, cities) => {
      if (err) return res.status(500).send('Database error');
      conn.query('SELECT * FROM areaMaster', (err, areas) => {
        if (err) return res.status(500).send('Database error');
        res.render('dashboard', {
          section,
          cities,
          areas
        });
      });
    });

  } else if (section === 'city') {
    conn.query('SELECT * FROM cityMaster', (err, cities) => {
      if (err) return res.status(500).send('Database error');
      res.render('dashboard', {
        section,
        cities
      });
    });

  } else {
    res.render('dashboard', {
      section
    });
  }
});
//===============================Hotel Adding Form  =================



const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

app.post('/admin/add-hotel', upload.single('image'), (req, res) => {
  const { name, address, city_name, area_name, email, contact, amenities } = req.body;
  const image = req.file ? req.file.filename : null;
  const rating = null;
  const reviewcount = null;

  // Step 1: Insert or fetch city
  const getCityId = new Promise((resolve, reject) => {
    const cityQuery = 'SELECT city_id FROM citymaster WHERE city_name = ?';
    conn.query(cityQuery, [city_name], (err, rows) => {
      if (err) return reject(err);
      if (rows.length > 0) return resolve(rows[0].city_id);

      conn.query('INSERT INTO citymaster (city_name) VALUES (?)', [city_name], (err2, result) => {
        if (err2) return reject(err2);
        resolve(result.insertId);
      });
    });
  });

  // Step 2: Insert or fetch area
  const getAreaId = new Promise((resolve, reject) => {
    const areaQuery = 'SELECT area_id FROM areamaster WHERE area_name = ?';
    conn.query(areaQuery, [area_name], (err, rows) => {
      if (err) return reject(err);
      if (rows.length > 0) return resolve(rows[0].area_id);

      conn.query('INSERT INTO areamaster (area_name) VALUES (?)', [area_name], (err2, result) => {
        if (err2) return reject(err2);
        resolve(result.insertId);
      });
    });
  });

  // Step 3: Execute both and insert hotel
  Promise.all([getCityId, getAreaId])
    .then(([city_id, area_id]) => {
      const insertHotel = `
        INSERT INTO hotelMaster
        (hotel_name, hotel_address, city_id, area_id, hotel_email, hotel_contact, rating, reviewcount, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      conn.query(insertHotel, [name, address, city_id, area_id, email, contact, rating, reviewcount, image], (err, result) => {
        if (err) return res.status(500).send('Error inserting hotel');
        const hotel_id = result.insertId;

        // Step 4: Handle amenities (comma-separated)
        if (!amenities || amenities.trim() === '') return res.redirect('/dashboard?section=view-hotels');

        const amenityList = amenities.split(',').map(a => a.trim()).filter(a => a !== '');
        const getAmenityIds = amenityList.map(amenityName => {
          return new Promise((resolve, reject) => {
            const checkQuery = 'SELECT amenity_id FROM amenities WHERE amenity_name = ?';
            conn.query(checkQuery, [amenityName], (err, rows) => {
              if (err) return reject(err);
              if (rows.length > 0) return resolve(rows[0].amenity_id);

              conn.query('INSERT INTO amenities (amenity_name) VALUES (?)', [amenityName], (err2, result) => {
                if (err2) return reject(err2);
                resolve(result.insertId);
              });
            });
          });
        });

        Promise.all(getAmenityIds)
          .then(amenityIds => {
            const values = amenityIds.map(aid => [hotel_id, aid]);
            conn.query('INSERT INTO hotelamenitiesjoin (hotel_id, amenity_id) VALUES ?', [values], (err3) => {
              if (err3) return res.status(500).send('Error linking amenities');
              res.redirect('/dashboard?section=view-hotels');
            });
          })
          .catch(() => res.status(500).send('Failed processing amenities'));
      });
    })
    .catch(() => res.status(500).send('Error resolving city or area'));
});

//========================   view Hotel   ==================================


app.get('/admin/view-hotels', (req, res) => {
  const sql = `
    SELECT h.*, c.city_name, a.area_name
    FROM hotelMaster h
    JOIN cityMaster c ON h.city_id = c.city_id
    JOIN areaMaster a ON h.area_id = a.area_id
  `;

  conn.query(sql, (err, hotels) => {
    if (err) {
      console.error('Error fetching hotels:', err);
      return res.status(500).send('Database error');
    }

    res.render('view-hotels', { hotels });
  });
});
//========================= Section Part ===================

app.get('/dashboard', (req, res) => {
  const section = req.query.section || '';
  const hotelId = req.query.id || null;

  const defaultRender = (overrideData = {}) => {
    res.render('dashboard', {
      section,
      bookings: [],
      hotels: [],
      cities: [],
      areas: [],
      hotel: null,
      ...overrideData
    });
  };


  if (section === 'view-hotels') {
    const sql = `
      SELECT h.*, c.city_name, a.area_name
      FROM hotelmaster h
      LEFT JOIN citymaster c ON h.city_id = c.city_id
      LEFT JOIN areamaster a ON h.area_id = a.area_id
    `;

    conn.query(sql, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Database error');
      }

      res.render('dashboard', {
        section: 'view-hotels',
        hotels: results || [] 
      });
    });
  }else if (section === 'add-hotel') {
    res.render('dashboard', {
      section: 'add-hotel',
      hotels: []
    });
  }else if (section === 'edit-hotel' && hotelId) {
    const sql = `
      SELECT h.*, c.city_name, a.area_name
      FROM hotelmaster h
      LEFT JOIN citymaster c ON h.city_id = c.city_id
      LEFT JOIN areamaster a ON h.area_id = a.area_id
      WHERE h.hotel_id = ?
    `;
    conn.query(sql, [hotelId], (err, result) => {
      if (err) throw err;

      if (result.length === 0) {
        return res.status(404).send("Hotel not found");
      }

      defaultRender({ hotel: result[0] });  
    });
  }
  else {
    res.render('dashboard', {
      section,
      hotels: [] 
    });
  }
});


app.get('/admin/add-hotel', (req, res) => {
  res.render('partials/content/add-hotel'); 
});


//============================ delete hotel logic  ====================
// DELETE hotel by ID
app.post('/admin/delete-hotel/:id', (req, res) => {
  const hotelId = req.params.id;

  const deleteSql = 'DELETE FROM hotelmaster WHERE hotel_id = ?';
  conn.query(deleteSql, [hotelId], (err, result) => {
    if (err) {
      console.error('Error deleting hotel:', err);
      return res.status(500).send('Error deleting hotel.');
    }

    res.redirect('/dashboard?section=view-hotels');
  });
});
//=========================== update hotel==========================
app.get('/admin/edit-hotel/:id', (req, res) => {
  const hotelId = req.params.id;

  const sql = 'SELECT * FROM hotelmaster WHERE hotel_id = ?';
  conn.query(sql, [hotelId], (err, result) => {
    if (err) return res.status(500).send('DB error');
    if (result.length === 0) return res.status(404).send('Hotel not found');
    res.render('partials/content/edit-hotel', { hotel: result[0] });
  });
});

app.post('/admin/update-hotel/:id', upload.single('hotel_image'), (req, res) => {
  const hotelId = req.params.id;
  const { hotel_name, hotel_address, hotel_email, hotel_contact, city_name, area_name } = req.body;
  const image = req.file ? req.file.filename : null;

  // Step 1: Get or insert city
  const getCityId = new Promise((resolve, reject) => {
    conn.query('SELECT city_id FROM citymaster WHERE city_name = ?', [city_name], (err, rows) => {
      if (err) return reject(err);
      if (rows.length > 0) return resolve(rows[0].city_id);
      conn.query('INSERT INTO citymaster (city_name) VALUES (?)', [city_name], (err2, result) => {
        if (err2) return reject(err2);
        resolve(result.insertId);
      });
    });
  });

  // Step 2: Get or insert area
  const getAreaId = new Promise((resolve, reject) => {
    conn.query('SELECT area_id FROM areamaster WHERE area_name = ?', [area_name], (err, rows) => {
      if (err) return reject(err);
      if (rows.length > 0) return resolve(rows[0].area_id);
      conn.query('INSERT INTO areamaster (area_name) VALUES (?)', [area_name], (err2, result) => {
        if (err2) return reject(err2);
        resolve(result.insertId);
      });
    });
  });

  Promise.all([getCityId, getAreaId])
    .then(([city_id, area_id]) => {
      let updateQuery = `
        UPDATE hotelmaster
        SET hotel_name = ?, hotel_address = ?, hotel_email = ?, hotel_contact = ?,
            city_id = ?, area_id = ?
      `;

      const queryParams = [hotel_name, hotel_address, hotel_email, hotel_contact, city_id, area_id];

      // If image uploaded, update it too
      if (image) {
        updateQuery += `, image = ?`;
        queryParams.push(image);
      }

      updateQuery += ` WHERE hotel_id = ?`;
      queryParams.push(hotelId);

      conn.query(updateQuery, queryParams, (err) => {
        if (err) {
          console.error('Error updating hotel:', err);
          return res.status(500).send('Error updating hotel');
        }

        res.redirect('/dashboard?section=view-hotels');
      });
    })
    .catch(err => {
      console.error('City/Area update error:', err);
      res.status(500).send('Internal server error');
    });
});





// ================== DELETE USER ===================
app.post('/admin/delete-user/:id', (req, res) => {
  const userId = req.params.id;
  const sql = 'DELETE FROM userMaster WHERE userid = ? AND type != "admin"';
  conn.query(sql, [userId], (err) => {
    if (err) return res.status(500).send('Database error.');
    res.redirect('/admin/users');
  });
});

// ============ ADD CITY ============
app.post('/admin/add-city', (req, res) => {
  const {
    city_name,
    pincode
  } = req.body;
  const sql = "INSERT INTO cityMaster (city_name, pincode) VALUES (?, ?)";

  conn.query(sql, [city_name, pincode], (err) => {
    if (err) {
      console.error("City insertion failed:", err);
      return res.status(500).send("Failed to add city.");
    }
    res.redirect('/admin/city');
  });
});

//============================ User Login Dashboard===========================
// GET: Show booking form for a hotel
app.get('/user/book/:hotel_id', (req, res) => {
  const hotelId = req.params.hotel_id;

  if (!req.session.userId) {
    return res.redirect('/user/login');
  }

  const sql = `SELECT hotel_id, hotel_name, hotel_address FROM hotelMaster WHERE hotel_id = ?`;

  conn.query(sql, [hotelId], (err, result) => {
    if (err) return res.status(500).send("Server error");
    if (result.length === 0) return res.status(404).send("Hotel not found");

    res.render('book-hotel', {
      hotel: result[0]
    }); 
  });
});

// POST: Handle hotel booking
app.post('/user/book/:hotel_id', (req, res) => {
  const hotelId = req.params.hotel_id;
  const userId = req.session.userId;

  if (!userId) {
    return res.redirect('/user/login');
  }

  const {
    checkin_date,
    checkin_time,
    checkout_date,
    checkout_time
  } = req.body;
  const bookingDate = new Date().toISOString().slice(0, 10);

  const insertBooking = `
    INSERT INTO bookingmaster (
      userid, hotel_id, booking_date, checkin_date, checkin_time, checkout_date, checkout_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  conn.query(
    insertBooking,
    [userId, hotelId, bookingDate, checkin_date, checkin_time, checkout_date, checkout_time],
    (err, result) => {
      if (err) {
        console.error("❌ Booking error:", err);
        return res.status(500).send("Error saving booking.");
      }

      const bookingId = result.insertId;

      const fetchDetails = `
  SELECT b.*, h.hotel_name, h.hotel_address, h.hotel_email
  FROM bookingmaster b
  JOIN hotelMaster h ON b.hotel_id = h.hotel_id
  WHERE b.booking_id = ?
`;

      conn.query(fetchDetails, [bookingId], (err2, rows) => {
        if (err2 || rows.length === 0) {
          console.warn("⚠️ Confirmation fetch failed:", err2);
          return res.send(`<script>alert("Booking saved, but confirmation failed."); window.location.href='/user/home';</script>`);
        }

        console.log("✅ Rendering confirmation:", rows[0]);
        res.render('booking-confirmation', {
          booking: rows[0]
        });
      });
    }
  );
});


// ================== LOGOUT ===================
app.get('/logout', (req, res) => {
  if (req.session) req.session.destroy();
  res.clearCookie('token');
  res.redirect('/');
});
// ================== START SERVER ===================
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});