const pool = require('../config/db');
const jwt = require('jsonwebtoken');

exports.registerUser = async ({ name, email, password, contact, type }) => {
  const [existing] = await pool.query(
    'SELECT * FROM usermaster WHERE useremail = ?',
    [email]
  );

  if (existing.length > 0) {
    throw new Error('User already exists with this email.');
  }

  await pool.query(
    'INSERT INTO usermaster (username, useremail, password, contact, type) VALUES (?, ?, ?, ?, ?)',
    [name, email, password, contact, type]
  );

  return '✅ Registered successfully!';
};

exports.authenticateUser = async ({ email, password, type }) => {
  const [users] = await pool.query(
    'SELECT * FROM usermaster WHERE useremail = ? AND password = ? AND type = ?',
    [email, password, type]
  );

  if (users.length === 0) {
    throw new Error('Invalid credentials or user not found.');
  }

  const user = users[0];
  const token = jwt.sign(
    { id: user.userid, name: user.username, email: user.useremail, type: user.type },
    'process.env.JWT_SECRET', 
    { expiresIn: '1h' }
  );

  return { ...user, token };
};
