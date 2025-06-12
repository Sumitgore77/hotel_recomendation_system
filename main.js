
const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();

app.set("view engine", "ejs");

let conn = require("./src/config/db");


app.use(express.static("public"));
app.use(express.json());



// app.get("/", (req, res) => {
  
//   conn.query(`
//   SELECT h.hotel_id, h.hotel_name, h.hotel_address, h.rating, h.reviewcount,
//          c.city_name, a.area_name
//   FROM hotelmaster h
//   JOIN citymaster c ON h.city_id = c.city_id
//   JOIN areamaster a ON h.area_id = a.area_id
// `, (err, result) => {
//   if (err) {
//     console.log("error", err);
//   } else {
//     res.render("home.ejs", { h: result });
//   }
// });

// });




app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});


app.get("/", (req, res) => {
  conn.query(`
    SELECT h.hotel_id, h.hotel_name, h.hotel_address, h.rating, h.reviewcount,
           c.city_name, a.area_name
    FROM hotelmaster h
    JOIN citymaster c ON h.city_id = c.city_id
    JOIN areamaster a ON h.area_id = a.area_id
  `, (err, result) => {
    if (err) {
      console.error("Database error:", err);   // 🔍 Full error
      return res.status(500).send("Internal Server Error");
    } else {
      console.log("Fetched hotels:", result);  // ✅ Check data
      res.render("home.ejs", { h:[]});
    }
  });
});

