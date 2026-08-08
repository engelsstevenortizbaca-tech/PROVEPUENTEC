'use strict';

const bcrypt = require('bcrypt');
const env = require('../config/env');

// Genera el hash de una contraseña en claro.
const hashPassword = (plain) => bcrypt.hash(plain, env.auth.bcryptRounds);

// Compara una contraseña en claro con su hash almacenado.
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

module.exports = { hashPassword, verifyPassword };
