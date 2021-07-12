const Tour = require('../model/tourModel');
// const APIFeature = require('./../utils/apiFeature');
const catchAsync = require('../utils/catchAsync');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AppError = require('../utils/appError');
const Booking = require('../model/bookingModel');
const factory = require('./handlerFactory');
exports.getCheckoutSession = async (req, res, next) => {
  //1 Get current tour
  const tour = await Tour.findById(req.params.tourId);
  //2 Create checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tours/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: `${tour.summary}`,
        images: [`https://www.natours.dev/img/tours/tour-1-cover.jpg`],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1,
      },
    ],
  });
  //3 Send it to client
  res.status(200).json({
    status: 'success',
    session,
  });
};

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  //This is only Temporary, because it is unsecured and everyone can make bookings without paying
  const { tour, user, price } = req.query;
  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });
  res.redirect(req.originalUrl.split('?')[0]); //redirect url to make url more secure
});

exports.updateBooking = factory.updateOne(Booking);

exports.getAllBooking = factory.getAll(Booking);

exports.deleteBooking = factory.deleteOne(Booking);

exports.createBooking = factory.createOne(Booking);

exports.getOneBooking = factory.getOne(Booking);
