const bcrypt = require("bcryptjs");
const conn = require("../config/db");

exports.renderLogin = (req, res) => res.render("login");


exports.renderRegister = (req, res) => {
  res.render("register")
};

exports.registerUser = (req, res) => {
  const { name, email, password, confirm_password, contact } = req.body;
  const type = "user";

  if (password !== confirm_password)
    return res.send("Password and Confirm Password do not match.");

  const checkSql = "SELECT * FROM usermaster WHERE useremail = ?";
  conn.query(checkSql, [email], (err, results) => {
    if (err) return res.send("Error checking email.");
    if (results.length > 0)
      return res.send("User already registered with this email.");

    const hashedPassword = bcrypt.hashSync(password, 8);
    const insertSql =
      "INSERT INTO usermaster (username, useremail, password, contact, type) VALUES (?, ?, ?, ?, ?)";
    conn.query(
      insertSql,
      [name, email, hashedPassword, contact, type],
      (err) => {
        if (err) return res.send("Error registering user.");
        res.render("login");
      }
    );
  });
};

exports.loginUser = (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send("Email and password required.");
    }

    const sql = "SELECT * FROM usermaster WHERE useremail = ?";
    conn.query(sql, [email], async (err, results) => {
      if (err) {
        console.error("SQL Error:", err);
        return res.status(500).send("Server error.");
      }

      if (results.length === 0) {
        return res.status(401).send("Invalid email or password.");
      }

      const user = results[0];
      const isMatch =
        user.type === "admin"
          ? password === user.password
          : await bcrypt.compare(password, user.password);

      if (!isMatch) return res.status(401).send("Invalid email or password.");

      req.session.userId = user.userid;
      req.session.userType = user.type;
      req.session.username = user.username;
      req.session.email = user.useremail;
      req.session.contact = user.contact;

      console.log("Login success:", req.session);

      return user.type === "admin"
        ? res.redirect("/admin/dashboard")
        : res.redirect("/user/home");
    });
  } catch (err) {
    console.error("Login Handler Crash:", err);
    return res.status(500).send("Internal Server Error.");
  }
};


exports.logout = (req, res) => {
  const userType = req.session?.userType; // Save type before destroying session

   if (userType === "admin"  || userType === "user") {

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }

    res.clearCookie('connect.secret123');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

   
      res.redirect("/login"); // You can customize this route if needed
    } 
  );
}
};
