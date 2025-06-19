const express = require("express");
const app = express();
const path = require("path");
require("dotenv").config();
const bodyParser = require("body-parser");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();
let conn = require("./src/config/db");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true,}));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
const session = require("express-session");
app.use(session({
    secret: "secret123",
    resave: false,
    saveUninitialized: true,
  })
);

const homeRoutes = require("./src/routes/homeRoutes");
const authRoutes = require("./src/routes/authRoutes");
app.use("/", homeRoutes);
app.use("/", authRoutes);

//-----------------------------------------

const adminRoutes = require("./src/routes/adminRoutes");
app.use("/", adminRoutes);

//------------------------------------------

const dashboardRoutes = require('./src/routes/dashboardRoutes');
app.use('/', dashboardRoutes);

//------------------------------------------

const bookingRoutes = require('./src/routes/bookingRoutes');
app.use('/', bookingRoutes);
app.use(bookingRoutes);

//------------------------------------------

const hotelRoutes = require('./src/routes/hotelRoutes');
app.use('/', hotelRoutes);

//---------------------------------------------

const userRoutes = require('./src/routes/userRoutes');
app.use(userRoutes);
app.use('/user', userRoutes);



//===================review ================
const reviewRoutes = require('./src/routes/reviewRoutes');
app.use('/', reviewRoutes);  


// ================== START SERVER ===================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});