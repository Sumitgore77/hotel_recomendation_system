const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const bodyParser = require("body-parser");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
let conn = require("./src/config/db");

// ================== HOME PAGE ===================
app.get("/", (req, res) => {
  const { search = '', rating = '', city = '' } = req.query;

  const allHotels = [
    {
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
    // Add more hotels if needed
  ];

  let filteredHotels = allHotels.filter(hotel => {
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
app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post("/saveReg", (req, res) => {
  const { name, email, password, confirm_password, contact } = req.body;
  const type = "user";

  if (password !== confirm_password) {
    return res.send("Password and Confirm Password do not match.");
  }

  const checkSql = "SELECT * FROM userMaster WHERE useremail = ?";
  conn.query(checkSql, [email], (err, results) => {
    if (err) {
      console.error("Error checking email:", err);
      return res.send("Error checking email.");
    }

    if (results.length > 0) {
      return res.send("User already registered with this email.");
    }

    const hashedPassword = bcrypt.hashSync(password, 8);
    const insertSql = "INSERT INTO userMaster (username, useremail, password, contact, type) VALUES (?, ?, ?, ?, ?)";
    conn.query(insertSql, [name, email, hashedPassword, contact, type], (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res.send("Error registering user.");
      } else {
        res.render("login");
      }
    });
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM userMaster WHERE useremail = ?';
  conn.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Query error:", err);
      return res.status(500).send('Server error.');
    }

    if (results.length === 0) {
      return res.status(401).send('Invalid email or password.');
    }

    const user = results[0];
    let isMatch = false;

    if (user.type === 'admin') {
      isMatch = password === user.password;
    } else {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(401).send('Invalid email or password.');
    }

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
      const sql = 'SELECT * FROM userMaster WHERE type != "admin"';
      conn.query(sql, (err, result) => {
        if (err) {
          console.error("Error fetching users:", err);
          return res.status(500).send('Database error');
        }
        return res.render('dashboard', {
          section: 'users',
          users: result
        });
      });
    } else {
      res.json({
        message: `Welcome ${user.type} ${user.username}!`,
        token
      });
    }
  });
});

// ================== DASHBOARD ADMIN ===================
app.get('/admin', (req, res) => {
  const sql = 'SELECT * FROM userMaster WHERE type != "admin"';
  conn.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).send('Database error');
    }
    res.render('dashboard', { section: 'users', users: result });
  });
});

app.get('/admin/:section', (req, res) => {
  const section = req.params.section;

  if (section === 'users') {
    const sql = 'SELECT * FROM userMaster WHERE type != "admin"';
    conn.query(sql, (err, result) => {
      if (err) {
        console.error("Error fetching users:", err);
        return res.status(500).send('Database error');
      }
      res.render('dashboard', { section, users: result });
    });
  } else {
    res.render('dashboard', { section });
  }
});

// ================== LOGOUT ===================
app.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy();
  }
  res.clearCookie('token');
  res.redirect('/');
});

// ================== USERS PAGE ===================
app.get('/users', (req, res) => {
  const sql = 'SELECT * FROM userMaster WHERE type != "admin"';
  conn.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).send('Database error');
    }
    res.render('users', { users: result });
  });
});

// ================== Delete User ===================

app.post('/admin/delete-user/:id', (req, res) => {
  const userId = req.params.id;

  const sql = 'DELETE FROM userMaster WHERE userid = ? AND type != "admin"';

  conn.query(sql, [userId], (err, result) => {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).send('Database error.');
    }

    console.log(`User with ID ${userId} deleted.`);
    res.redirect('/admin/users'); // Redirect back to the users list
  });
});



app.get('/admin/users', (req, res) => {
  const sql = 'SELECT * FROM userMaster WHERE type != "admin"';
  conn.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).send('Database error');
    }

    res.render('dashboard', {
      section: 'users',
      users: result
    });
  });
});


// ================== START SERVER ===================
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
