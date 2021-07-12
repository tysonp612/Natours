const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModel');
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      // maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      // minlength: [10, 'A tour name must have more or equal than 10 characters'],
      // validate: [validator.isAlpha, 'The name must only contain character'],
    },
    slug: {
      type: String,
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: "Difficulty is either 'easy' or 'medium or difficult'",
      },
    },
    ratingAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1'],
      max: [5, 'Rating must be below 5'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //THIS ONLY POINTS TO CURRENT DOC ON NEW DOCUMENT CREATION, NOT ON UPDATING DOCUMENTS
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a discription'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover Image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      select: false,
      default: Date.now(),
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON to specify Geo data
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    // Use array to specify locations
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    slug: String,
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review', //name of the reference model
  foreignField: 'tour', //In that model, where the referecnce to the current model is stored,
  localField: '_id', // In current model, Id is what stored in foreignFied
});

// save === document middleware
// find === query middleware
//DOCUMENT MIDDLWARE : runs before .save() and .crrate()
// tourSchema.pre('save', function (next) {
//   this.slug = slugify(this.name, { lower: true });
//   next();
// });

// //In post middleware, we no longer have access to this because it is finished, but we have access on doc (finished doc)
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

//Embedding Tour guide example, only work when create new documents
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guide.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
// });

//QUERY MIDDLWARE
// DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});
tourSchema.pre('/^find/', function (next) {
  this.find({ secretTour: { $ne: true } });
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

//INDEXES:
tourSchema.index({ price: 1, ratingAverage: -1 });
tourSchema.index({ startLocation: '2dsphere' });
//AGGREGATION MIDDLWARE

// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
