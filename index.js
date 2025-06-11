const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();
const bodyParser = require("body-parser");
app.use(express.urlencoded({ extended: true }));
let conn = require("./src/config/db");


app.use(express.json());

app.get('/', (req, res) => {
      res.render('home.ejs'); 
});

app.post("/saveReg",(req,res)=>{

  const{name,email,password,confirm_password,contact,type}=req.body;

  if(password==confirm_password){

  conn.query("insert into usermaster values('0',?,?,?,?,?)",[name,email,password,contact,type],(err,result)=>{

    if(err){
      console.log("Data is not inserted ",err);
    }
    else{
      res.send("Registration Successfully...!");
    }
  })
  }
  else{
    console.log("Password is not match");
  }
})

app.get("loginUser",(req,res)=>{

  if()

})

app.get("/register",(req,res)=>{
  res.render("register.ejs");
})

app.get("/login",(req,res)=>{

  res.render("login.ejs");
})


app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
