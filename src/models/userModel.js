const conn = require('../config/db');

exports.findUserByEmail = (email, callback) => {
  conn.query('SELECT * FROM userMaster WHERE useremail = ?', [email], callback);
};

exports.createUser = (user, callback) => {
  const { name, email, password, contact, type } = user;
  const query = 'INSERT INTO userMaster (username, useremail, password, contact, type) VALUES (?, ?, ?, ?, ?)';
  conn.query(query, [name, email, password, contact, type], callback);
};

exports.loginUser = (email, password, type, callback) => {
  const query = 'SELECT * FROM userMaster WHERE useremail = ? AND password = ? AND type = ?';
  conn.query(query, [email, password, type], callback);
};
