// src/utils/jwt.js
const jwt = require('jsonwebtoken');

const generarToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE,
      algorithm: 'HS256'
    }
  );
};

const verificarToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const generarRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET + '_refresh',
    { 
      expiresIn: '30d',
      algorithm: 'HS256'
    }
  );
};

module.exports = {
  generarToken,
  verificarToken,
  generarRefreshToken
};



