const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'views'));
const dotenv = require('dotenv');
dotenv.config();
const bodyParser = require("body-parser");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
let conn = require("./src/config/db");
app.use(express.json());
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');



//home page
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
    },
    // add remaining hotels with `city` field
  ];

  let filteredHotels = allHotels.filter(hotel => {
    const matchesSearch = search === '' || hotel.name.toLowerCase().includes(search.toLowerCase()) || hotel.description.toLowerCase().includes(search.toLowerCase());
    const matchesRating = rating === '' || hotel.rating >= parseFloat(rating);
    const matchesCity = city === '' || hotel.city.toLowerCase() === city.toLowerCase();
    return matchesSearch && matchesRating && matchesCity;
  });

  res.render("home", { hotels: filteredHotels, search, rating, city });
});



//login page 1 call
app.get('/login', (req, res) => {
  res.render('login'); // render login.ejs
});

// Register Form call
app.get('/register', (req, res) => {
  res.render('register'); // render register.ejs (create this separately)
});

//Save Register Data
app.post("/saveReg", (req, res) => {
  const { name, email, password, confirm_password, contact} = req.body;
   const hashedPassword = bcrypt.hashSync(password, 8);

  const type="user";

  if (password !== confirm_password) {
    return res.send("Password and Confirm Password do not match.");
  }
  const sql = "INSERT INTO userMaster (username, useremail, password, contact, type) VALUES (?, ?, ?, ?,?)";

  conn.query(sql, [name, email, hashedPassword, contact,type], (err, result) => {
    if (err) {
      console.error("Error inserting data:", err);
      return res.send("Error registering user.");
    }
    else{
       res.render("login.ejs",);
    }
  });
});

// Handle login POST
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

    const isMatch = await bcrypt.compare(password, user.password);
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

    res.json({
      message: `Welcome ${user.type} ${user.username}!`,
      token
    });
  });
});





app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
