'use strict';

const AppError = require('./AppError');
const httpErrors = require('./httpErrors');

module.exports = {
  AppError,
  ...httpErrors,
};
