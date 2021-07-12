const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();
router.use(authController.protect);
router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

router.use(authController.restrictTo('admin', 'lead-guide'));
router.route('/').get(bookingController.getAllBooking);

router
  .route('/:id')
  .patch(bookingController.updateBooking)
  .get(bookingController.getOneBooking)
  .post(bookingController.createBooking)
  .delete(bookingController.deleteBooking);
module.exports = router;
