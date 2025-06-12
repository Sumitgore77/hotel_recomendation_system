const express = require('express');
const app = express();
const path = require('path');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'views'));
const dotenv = require('dotenv');
dotenv.config();
const bodyParser = require("body-parser");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
let conn = require("./src/config/db");
app.use(express.json());

app.get("/", (req, res) => {
  const hotels = [
  {
    id: 1,
    name: "Hotel Taj",
    image: "/Images/1.jpg",
    rating: 4.8,
    description: "Luxury hotel with sea view and premium rooms."
  },
  {
    id: 2,
    name: "The Oberoi",
    image: "/Images/2.jpg",
    rating: 4.6,
    description: "Elegant ambiance with world-class dining experience."
  },
  {
    id: 3,
    name: "Trident",
    image: "/Images/3.jpg",
    rating: 4.4,
    description: "Affordable comfort and great hospitality."
  },
  {
    id: 4,
    name: "Leela Palace",
    image: "/Images/4.jpg",
    rating: 4.9,
    description: "Royal luxury with traditional Indian architecture."
  },
  {
    id: 5,
    name: "ITC Grand",
    image: "/Images/5.jpg",
    rating: 4.5,
    description: "Green hotel with exquisite fine dining."
  },
  {
    id: 6,
    name: "JW Marriott",
    image: "/Images/6.jpg",
    rating: 4.7,
    description: "Modern amenities with excellent customer service."
  },
  {
    id: 7,
    name: "Hyatt Regency",
    image: "/Images/7.jpg",
    rating: 4.3,
    description: "Business-friendly stay with elegant decor."
  },
  {
    id: 8,
    name: "Radisson Blu",
    image: "/Images/8.jpg",
    rating: 4.2,
    description: "Comfortable rooms with a lively bar and buffet."
  },
  {
    id: 9,
    name: "Fairmont Jaipur",
    image: "/Images/9.jpg",
    rating: 4.6,
    description: "Palace-style stay with luxury spa experience."
  }
];
  res.render("home", { hotels });
});



app.get('/login', (req, res) => {
  res.render('login'); // render login.ejs
});

// Register Form
app.get('/register', (req, res) => {
  res.render('register'); // render register.ejs (create this separately)
});

app.post("/saveReg", (req, res) => {
  const { name, email, password, confirm_password, contact} = req.body;
  const type="user";

  if (password !== confirm_password) {
    return res.send("Password and Confirm Password do not match.");
  }
  const sql = "INSERT INTO userMaster (username, useremail, password, contact, type) VALUES (?, ?, ?, ?,?)";

  conn.query(sql, [name, email, password, contact,type], (err, result) => {
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
  const { email, password} = req.body;
  const type="User";

  const sql = 'SELECT * FROM userMaster WHERE useremail = ? AND password = ? AND type =?';
  conn.query(sql, [email, password, type], (err, results) => {
    if (err) {
      console.error(err);
      return res.send('An error occurred.');
    }

    if (results.length > 0) {
      const user = results[0];
      res.send(Welcome ${user.username}, (${user.type}));
    } else {
      res.send('Invalid credentials or user type.');
    }
  });
});




app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});