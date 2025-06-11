const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
let conn = require("./src/config/db");

const app = express();
app.use(express.json());


app.get('/', (req, res) => {
  
      res.render('home.ejs'); 
  
});

app.get("/register",(req,res)=>{
  res.render("register.ejs");
})

app.get("/login",(req,res)=>{

  res.render("login.ejs");
})


app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
