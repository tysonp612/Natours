const mongoose = require('mongoose');
const User = require('./userModel');
const Tour = require('./tourModel');
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Review must have a rating'],
    },
    createdAt: { type: Date, default: Date.now },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to an user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//Poplulate tour and user to show all reviews, use with review as parent referencing
reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: 'tour',
  //     select: '-guides name',
  //   }).populate({
  //     path: 'user',
  //     select: 'name photo',
  //   });

  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      //match all reviews with same tour ID
      $match: { tour: tourId },
    },
    {
      $group: {
        //_id === tour.id
        _id: '$tour',
        //calculate sum of rating everytime we have a new review. Number of rating === number of review
        nRating: { $sum: 1 },
        //calculate the average from rating field
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  console.log(stats);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingQuantity: stats[0].nRating,
      ratingAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingQuantity: 0,
      ratingAverage: 4.5,
    });
  }
};

//Happends each time we save the review, in other word, we create new review
reviewSchema.post('save', async function (next) {
  //Because we dont have access to Review before it is created, that is why we are using this. constructor, this === document, constructor === Review
  await this.constructor.calcAverageRatings(this.tour);
});

//Update or Delete all start with findOneAnd...

reviewSchema.pre(/^findOneAnd/, async function (next) {
  //save r with data found in pre find to model this
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function (next) {
  //this.r === whole data after pre find, constructor is used to access Model before defining
  //You only need to await something if you want to use its return value. We're not interested in the return value of calcAverageRatings, we just care that it does something.
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

/// PREVENT DUPLICATE REVIEW, USING INDEXES

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

//POST /tour/2345fa/revires
