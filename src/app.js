// src/app.js
const express = require("express");
const path = require("path");
require("dotenv").config();
const session = require("express-session");

const app = express();

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());

// Session
app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true,
}));

// Disable caching
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// DB Connection
require("./config/db");

// Routes
const homeRoutes = require("./routes/homeRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const userRoutes = require("./routes/userRoutes");
const recommendRoutes = require("./routes/recommendRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

app.use("/", homeRoutes);
app.use("/", authRoutes);
app.use("/", adminRoutes);
app.use("/", dashboardRoutes);
app.use("/", bookingRoutes);
app.use("/", hotelRoutes);
app.use("/", recommendRoutes);
app.use("/", reviewRoutes);
app.use("/user", userRoutes);

module.exports = app;
