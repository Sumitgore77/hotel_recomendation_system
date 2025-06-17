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
app.use(express.urlencoded({
  extended: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const session = require('express-session');

app.use(session({
  secret: 'secret123', // change this to something secure
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

// ================== IMAGE UPLOAD ===================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, filename);
  }
});
const upload = multer({
  storage
});

// ================== ADD HOTEL ===================
app.get('/admin/add-hotel', (req, res) => {
  res.render('add-hotel');
});

app.post('/admin/add-hotel', upload.single('image'), (req, res) => {
  const {
    name,
    address,
    contact,
    email,
    city_id
  } = req.body;
  const area_id = 1;
  const rating = null;
  const reviewcount = null;
  const image = req.file ? req.file.filename : null;

  const sql = `
    INSERT INTO hotelMaster 
    (hotel_name, hotel_address, city_id, area_id, hotel_email, hotel_contact, rating, reviewcount, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  conn.query(sql, [name, address, city_id, area_id, email, contact, rating, reviewcount, image], (err) => {
    if (err) return res.status(500).send('Database error.');
    res.redirect('/dashboard?section=view-hotels');
  });
});

// ================== DELETE HOTEL ===================
app.post('/admin/delete-hotel/:id', (req, res) => {
  const hotelId = req.params.id;
  const sql = 'DELETE FROM hotelMaster WHERE hotel_id = ?';

  conn.query(sql, [hotelId], (err) => {
    if (err) return res.status(500).send('Database error.');
    res.redirect('/dashboard?section=view-hotels');
  });
});

// ================== EDIT HOTEL ===================
app.get('/admin/edit-hotel/:id', (req, res) => {
  const hotelId = req.params.id;
  const sql = `
    SELECT h.*, c.city_name, a.area_name 
    FROM hotelMaster h
    JOIN cityMaster c ON h.city_id = c.city_id
    JOIN areaMaster a ON h.area_id = a.area_id
    WHERE hotel_id = ?
  `;

  conn.query(sql, [hotelId], (err, results) => {
    if (err) return res.status(500).send('Database error.');
    if (results.length === 0) return res.status(404).send('Hotel not found.');
    res.render('edit-hotel', {
      hotel: results[0]
    });
  });
});

app.post('/admin/update-hotel/:id', upload.single('image'), (req, res) => {
  const hotelId = req.params.id;
  const {
    hotel_name,
    hotel_address,
    hotel_email,
    hotel_contact
  } = req.body;
  const image = req.file ? req.file.filename : null;

  let sql, params;
  if (image) {
    sql = `UPDATE hotelMaster SET hotel_name=?, hotel_address=?, hotel_email=?, hotel_contact=?, image=? WHERE hotel_id=?`;
    params = [hotel_name, hotel_address, hotel_email, hotel_contact, image, hotelId];
  } else {
    sql = `UPDATE hotelMaster SET hotel_name=?, hotel_address=?, hotel_email=?, hotel_contact=? WHERE hotel_id=?`;
    params = [hotel_name, hotel_address, hotel_email, hotel_contact, hotelId];
  }

  conn.query(sql, params, (err) => {
    if (err) return res.status(500).send('Database update failed.');
    res.redirect('/dashboard?section=view-hotels');
  });
});

// ================== VIEW HOTELS ===================
app.get('/dashboard', (req, res) => {
  const section = req.query.section || '';

  const defaultRender = (overrideData = {}) => {
    res.render('dashboard', {
      section,
      bookings: [],
      hotels: [],
      cities: [],
      areas: [],
      amenities: [],
      ...overrideData
    });
  };

  if (section === 'view-hotels') {
    const sql = `
      SELECT h.*, c.city_name, a.area_name
      FROM hotelMaster h
      JOIN cityMaster c ON h.city_id = c.city_id
      JOIN areaMaster a ON h.area_id = a.area_id
    `;
    conn.query(sql, (err, hotels) => {
      if (err) return res.status(500).send('Database error');
      defaultRender({
        hotels
      });
    });

  } else if (section === 'hotels') {
    conn.query('SELECT * FROM cityMaster', (err, cities) => {
      if (err) return res.status(500).send('Database error');
      conn.query('SELECT * FROM areaMaster', (err, areas) => {
        if (err) return res.status(500).send('Database error');
        defaultRender({
          cities,
          areas
        });
      });
    });

  } else if (section === 'city') {
    conn.query('SELECT * FROM cityMaster', (err, cities) => {
      if (err) return res.status(500).send('Database error');
      defaultRender({
        cities
      });
    });

  } else if (section === 'amenities') {
    const sql = 'SELECT * FROM amenities';
    conn.query(sql, (err, result) => {
      if (err) {
        console.error('Error fetching amenities:', err);
        return res.status(500).send('Database error');
      }
      defaultRender({
        amenities: result
      });
    });
  } else {
    defaultRender();
  }
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

// ============ DELETE CITY ============
app.post('/admin/delete-city/:id', (req, res) => {
  const cityId = req.params.id;
  const sql = "DELETE FROM cityMaster WHERE city_id = ?";

  conn.query(sql, [cityId], (err) => {
    if (err) {
      console.error("Failed to delete city:", err);
      return res.status(500).send("Failed to delete city.");
    }
    res.redirect('/admin/city');
  });
});
//=============amenities=================
// ============ ADD AMENITY ============
app.post('/admin/add-amenity', (req, res) => {
  const {
    amenity_name
  } = req.body;
  const sql = "INSERT INTO amenities (amenity_name) VALUES (?)";

  conn.query(sql, [amenity_name], (err) => {
    if (err) {
      console.error("Amenity insertion failed:", err);
      return res.status(500).send("Failed to add amenity.");
    }
    res.redirect('/dashboard?section=amenities');
  });
});

// ============ DELETE AMENITY ============
app.post('/admin/delete-amenity/:id', (req, res) => {
  const amenityId = req.params.id;
  const sql = "DELETE FROM amenities WHERE amenity_id = ?";
  conn.query(sql, [amenityId], (err) => {
    if (err) {
      console.error("Failed to delete amenity:", err);
      return res.status(500).send("Failed to delete amenity.");
    }
    res.redirect('/dashboard?section=amenities');
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
    }); // render form
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
      console.log("🆔 New bookingId:", bookingId);

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