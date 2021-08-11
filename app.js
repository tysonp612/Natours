const express = require('express');
const path = require('path');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const globalErrorHandler = require('./controllers/errorController');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const AppError = require('./utils/appError');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');
const cookieParser = require('cookie-parser');
const compression = require('compression');

//START HERE
const app = express();
//Using Middleware
//Middleware is a function that can modify the incoming request data
// If we use middleware, the request will have a body contains all the data that the client send back to server

//Set up pug
app.set('view engine', 'pug');
// create path to views folder, does not have to define ./
app.set('views', path.join(__dirname, 'views'));

//Middleware example
app.use((req, res, next) => {
  // console.log('Hello from the middleware');
  next();
});

//1) Global Middleware
//Set security HTTPS headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", 'data:', 'blob:', 'https:', 'ws:'],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        scriptSrc: [
          "'self'",
          'https:',
          'http:',
          'blob:',
          'https://*.mapbox.com',
          'https://js.stripe.com',
          'https://m.stripe.network',
          'https://*.cloudflare.com',
        ],
        frameSrc: ["'self'", 'https://js.stripe.com'],
        objectSrc: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        workerSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.tiles.mapbox.com',
          'https://api.mapbox.com',
          'https://events.mapbox.com',
          'https://m.stripe.network',
        ],
        childSrc: ["'self'", 'blob:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        formAction: ["'self'"],
        connectSrc: [
          "'self'",
          "'unsafe-inline'",
          'data:',
          'blob:',
          'https://*.stripe.com',
          'https://*.mapbox.com',
          'https://*.cloudflare.com/',
          'https://bundle.js:*',
          'ws://127.0.0.1:*/',
        ],
        upgradeInsecureRequests: [],
      },
    },
  })
);
//Limit requests from same API
const limiter = rateLimit({
  max: 100, //max request
  windowMs: 60 * 60 * 1000, //in how much time
  message: 'Too many requests from this IP, please try again in an hour',
});
app.use('/api', limiter); //count amount of request with all route started with /api

//Body parser, reading data from into req.body

//Specify option to limit amount of data coming from request , maximun 10kb, pasrse data from body
app.use(express.json({ limit: '10kb' })); //How to use middleware
app.use(cookieParser()); //parse data from cookie
//Perfect place to do data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

//Prevent Parameter Pollution, use at the end co lear up query string (duplicated parameter)
app.use(
  hpp({
    //whitelist is an array that contains fields that we allow to be duplicated
    whitelist: [
      'duration',
      'ratingAverage',
      'ratingQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

//Serving static files to use CSS and ICON
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  next();
});
// 3/ ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: '404 Not Found',
  //   message: `Can not find ${req.originalUrl} on this server!`,
  // });
  // const err = new Error(`Can not find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;
  next(new AppError(`Can not find ${req.originalUrl} on this server!`, 404));
});

app.use(compression());

//Using Globale Error Handler
app.use(globalErrorHandler);
module.exports = app;
