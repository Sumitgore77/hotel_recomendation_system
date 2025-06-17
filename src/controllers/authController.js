const userService = require('../services/userService');

// Render the login page
exports.showLogin = (req, res) => {
  res.render('login');
};

// Render the register page
exports.showRegister = (req, res) => {
  res.render('register');
};

// Handle Registration
exports.registerUser = async (req, res) => {
  const { name, email, password, confirm_password, contact } = req.body;
  const type = "User";

  if (password !== confirm_password) {
    return res.send('❌ Passwords do not match.');
  }

  try {
    const result = await userService.registerUser({ name, email, password, contact, type });
    console.log(result);
    res.redirect('/login');
  } catch (error) {
    res.send(`❌ Registration error: ${error.message}`);
  }
};

// Handle Login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  const type = "User";

  try {
    const user = await userService.authenticateUser({ email, password, type }); // ✅ Make sure this resolves

    if (!user) {
      return res.send('❌ Invalid credentials');
    }

    // Store in session
    req.session.user = {
  id: user.userid,
  name: user.username,
  email: user.useremail,
  type: user.type
};

console.log('SESSION DATA:', req.session);
res.render("afterLogin.ejs");
//res.send(`✅ Welcome ${user.username} (${user.type})! Your token: ${user.token}`);


  } catch (error) {
    res.send(`❌ Login error: ${error.message}`);
  }
};
