const Tour = require('../model/tourModel');
const Booking = require('../model/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');
exports.getOverview = catchAsync(async (req, res, next) => {
  //1 Get Tour data from collection
  const tours = await Tour.find();
  //2 Build template based on data

  //3 Render that template using tour data from step 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours: tours,
  });
});
exports.getLoginForm = catchAsync(async (req, res) => {
  //3 Render that template
  res
    .status(200)

    .render('login', {
      title: 'Login',
    });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your Account',
  });
};
exports.getMyTours = catchAsync(async (req, res, next) => {
  //1 Find our bookings of current users
  const bookings = await Booking.find({ user: req.user.id });
  //2 Fund tours with returned ID
  const tourID = bookings.map((el) => el.tour);
  // Basically means find tours with the tour id IN tourID variable
  const tours = await Tour.find({ _id: { $in: tourID } });
  //3 Render that template
  res.status(200).render('overview', {
    title: 'My Tours',
    tours: tours,
  });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your Account',
  });
};

exports.getTour = catchAsync(async (req, res, next) => {
  //1 Get the data, for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }
  //2 Build template

  //3 Render data
  res
    .status(200)

    .render('tour', {
      title: `${tour.name}`,
      tour: tour,
    });
});
