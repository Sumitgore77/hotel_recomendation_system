const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();
const bodyParser = require("body-parser");
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let conn = require("./src/config/db");

// ================== HOME PAGE ===================
app.get("/", (req, res) => {
  const { search = '', rating = '', city = '' } = req.query;

  const allHotels = [
    { id: 1, name: "Hotel Taj", city: "Mumbai", image: "/Images/1.jpg", rating: 4.8, description: "Luxury hotel with sea view and premium rooms." },
    { id: 2, name: "The Oberoi", city: "Delhi", image: "/Images/2.jpg", rating: 4.6, description: "Elegant ambiance with world-class dining experience." },
    { id: 3, name: "Fairmont Jaipur", city: "Jaipur", image: "/Images/3.jpg", rating: 4.6, description: "Palace-style stay with luxury spa experience." }
  ];

  let filteredHotels = allHotels.filter(hotel => {
    const matchesSearch = search === '' || hotel.name.toLowerCase().includes(search.toLowerCase()) || hotel.description.toLowerCase().includes(search.toLowerCase());
    const matchesRating = rating === '' || hotel.rating >= parseFloat(rating);
    const matchesCity = city === '' || hotel.city.toLowerCase() === city.toLowerCase();
    return matchesSearch && matchesRating && matchesCity;
  });

  res.render("home", { hotels: filteredHotels, search, rating, city });
});

// ================== AUTH ROUTES ===================
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));

app.post("/saveReg", (req, res) => {
  const { name, email, password, confirm_password, contact } = req.body;
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
  const { email, password } = req.body;

  const sql = 'SELECT * FROM userMaster WHERE useremail = ?';
  conn.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).send('Server error.');
    if (results.length === 0) return res.status(401).send('Invalid email or password.');

    const user = results[0];
    const isMatch = user.type === 'admin' ? password === user.password : await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send('Invalid email or password.');

    const payload = { id: user.id, name: user.username, email: user.useremail, type: user.type };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    if (user.type === 'admin') {
      conn.query('SELECT * FROM userMaster WHERE type != "admin"', (err, result) => {
        if (err) return res.status(500).send('Database error');
        res.render('dashboard', { section: 'users', users: result });
      });
    } else {
      res.json({ message: `Welcome ${user.type} ${user.username}!`, token });
    }
  });
});

// ================== ADMIN DASHBOARD ===================
app.get('/admin', (req, res) => {
  conn.query('SELECT * FROM userMaster WHERE type != "admin"', (err, result) => {
    if (err) return res.status(500).send('Database error');
    res.render('dashboard', { section: 'users', users: result });
  });
});

app.get('/admin/:section', (req, res) => {
  const section = req.params.section;

  if (section === 'users') {
    conn.query('SELECT * FROM userMaster WHERE type != "admin"', (err, result) => {
      if (err) return res.status(500).send('Database error');
      res.render('dashboard', { section, users: result });
    });

  } else if (section === 'hotels') {
    const citySql = 'SELECT * FROM cityMaster';
    const areaSql = 'SELECT * FROM areaMaster';

    conn.query(citySql, (err, cities) => {
      if (err) return res.status(500).send('Database error');

      conn.query(areaSql, (err, areas) => {
        if (err) return res.status(500).send('Database error');
        res.render('dashboard', { section, cities, areas });
      });
    });

  } else {
    res.render('dashboard', { section });
  }
});

// ================== LOGOUT ===================
app.get('/logout', (req, res) => {
  if (req.session) req.session.destroy();
  res.clearCookie('token');
  res.redirect('/');
});

// ================== USERS PAGE ===================
app.get('/users', (req, res) => {
  conn.query('SELECT * FROM userMaster WHERE type != "admin"', (err, result) => {
    if (err) return res.status(500).send('Database error');
    res.render('users', { users: result });
  });
});

app.post('/admin/delete-user/:id', (req, res) => {
  const userId = req.params.id;
  const sql = 'DELETE FROM userMaster WHERE userid = ? AND type != "admin"';
  conn.query(sql, [userId], (err) => {
    if (err) return res.status(500).send('Database error.');
    res.redirect('/admin/users');
  });
});

app.get('/admin/users', (req, res) => {
  conn.query('SELECT * FROM userMaster WHERE type != "admin"', (err, result) => {
    if (err) return res.status(500).send('Database error');
    res.render('dashboard', { section: 'users', users: result });
  });
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
const upload = multer({ storage });

app.get('/admin/add-hotel', (req, res) => {
  res.render('add-hotel');
});

app.post('/admin/add-hotel', upload.single('image'), (req, res) => {
  const { name, address, contact, email } = req.body;
  const city_id = 1;
  const area_id = 1;
  const rating = null;
  const reviewcount = null;

  const sql = `
    INSERT INTO hotelMaster 
    (hotel_name, hotel_address, city_id, area_id, hotel_email, hotel_contact, rating, reviewcount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  conn.query(sql, [name, address, city_id, area_id, email, contact, rating, reviewcount], (err) => {
    if (err) return res.status(500).send('Database error.');
    res.redirect('/dashboard?section=view-hotels');
  });
});

// ================== VIEW HOTELS ===================
app.get('/dashboard', (req, res) => {
  const section = req.query.section || '';

  if (section === 'view-hotels') {
    const sql = `
      SELECT h.*, c.city_name, a.area_name
      FROM hotelMaster h
      JOIN cityMaster c ON h.city_id = c.city_id
      JOIN areaMaster a ON h.area_id = a.area_id
    `;
    conn.query(sql, (err, hotels) => {
      if (err) return res.status(500).send('Database error');
      res.render('dashboard', { section, hotels });
    });

  } else if (section === 'hotels') {
    const citySql = 'SELECT * FROM cityMaster';
    const areaSql = 'SELECT * FROM areaMaster';

    conn.query(citySql, (err, cities) => {
      if (err) return res.status(500).send('Database error');
      conn.query(areaSql, (err, areas) => {
        if (err) return res.status(500).send('Database error');
        res.render('dashboard', { section, cities, areas });
      });
    });

  } else {
    res.render('dashboard', { section });
  }
});

// ================== START SERVER ===================
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
