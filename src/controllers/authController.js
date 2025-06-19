const bcrypt = require("bcryptjs");
const conn = require("../config/db");

exports.renderLogin = (req, res) => res.render("login");
exports.renderRegister = (req, res) => res.render("register");

exports.registerUser = (req, res) => {
  const { name, email, password, confirm_password, contact } = req.body;
  const type = "user";

  if (password !== confirm_password)
    return res.send("Password and Confirm Password do not match.");

  const checkSql = "SELECT * FROM userMaster WHERE useremail = ?";
  conn.query(checkSql, [email], (err, results) => {
    if (err) return res.send("Error checking email.");
    if (results.length > 0)
      return res.send("User already registered with this email.");

    const hashedPassword = bcrypt.hashSync(password, 8);
    const insertSql =
      "INSERT INTO userMaster (username, useremail, password, contact, type) VALUES (?, ?, ?, ?, ?)";
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
  const { email, password } = req.body;

  const sql = "SELECT * FROM userMaster WHERE useremail = ?";
  conn.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).send("Server error.");
    if (results.length === 0)
      return res.status(401).send("Invalid email or password.");

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

    if (user.type === "admin") {
      return res.redirect("/admin/dashboard");
    } else {
      return res.redirect("/user/home");
    }
  });
};
