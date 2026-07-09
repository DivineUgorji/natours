const express = require('express');
const { json } = require('stream/consumers');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

const AppError = require('./utils/appError');
const globalErorrHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

// Global Middlewares
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this ip, please try again in an hour',
});
app.use('/api', limiter);

app.use(express.json());
// Serving static files using Express.js
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

// Middleware for Handling  Unhandled Routes
/**
 * Middlewares are executed in the order that they're added.
 * Hence, any request that gets here must not have been handled
 * by by the request handlers above, hence, they'd be handled here.
 */
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`));
});

// Global middleware for handling operational errors
app.use(globalErorrHandler);

module.exports = app;
