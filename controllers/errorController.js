const { stack } = require('../app');
const AppError = require('../utils/appError');

/**
 * Global Middleware For Handling Errors in Express
 *
 * There are generally two kinds of errors that could occur
 * in our application.
 * 1) Operational Error: This represents a known, predictable runtime failure
 * that happens during the normal execution of a correctly written application.
 * Operational errors are caused by external factors such as network hiccups, missing files, or system resource limits.
 *
 * 2) Programming Error: Programming error (also called a bug) is a flaw in the application's logic
 * or syntax that can only be fixed by changing the source code.
 * Examples are; ReferenceError, TypeError, SyntaxError, RangeError.
 *
 * We handle these errors by defining a global error handling middleware using the error mechanisms available in Express.js
 * in our application to intercepts these errors (especially operational error) and handle them appropriately
 * without crashing the application.
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  //   const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const value = Object.values(err.keyValue)[0];
  console.log(err);
  const message = `Duplicate field value "${value}": use another one`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// 401 error code for unauthorized
const handleJWTError = (err) =>
  new AppError('Invalid token, please login again', 401);

const handleJWTExpiredError = (err) =>
  new AppError('Your token has expired. Please login again', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  //   Programming or other unknown error we don't want to leak to the client
  else {
    // 1. Log console.error
    console.error('ERROR 🚨', err);

    // 2. Send generic error message to the client
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    /*
     * This conditional statement is for handling cast errrors
     * from the Mongoose and database, marking them as operational errors
     * and returning an error message that the user can understand.
     */
    let error = err;
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);

    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (error.name === 'TokenExpiredError')
      error = handleJWTExpiredError(error);
    sendErrorProd(error, res);
  }
};
