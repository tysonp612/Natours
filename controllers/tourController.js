const Tour = require('../model/tourModel');
// const APIFeature = require('./../utils/apiFeature');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingAverage,price';
  req.query.fields = 'name,price,ratingAverage,summary,difficulty';
  next();
};

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};

//When 1 image:
// upload.single('images')
// When >1 images:
// upload.array('images',5)
// When mix or diffrent images:
// upload.fileds([
//   { name: 'imageCover', maxCount: 1 },
//   { name: 'images', maxCount: 3 },
// ]);
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadTourPhoto = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourPhoto = async (req, res, next) => {
  console.log(req.files);
  if (!req.files.imageCover || !req.files.images) return next();

  //1) Cover images
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  //2) images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(req.files.images[i].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    })
  );
  next();
};

//CLASS API REFACTORING API
// class APIFeature {
//   constructor(query, queryString) {
//     this.query = query;
//     this.queryString = queryString;
//   }
//   filter() {
//     const queryObj = { ...this.queryString };
//     const excludedFields = ['page', 'sort', 'limit', 'fields'];
//     excludedFields.forEach((el) => delete queryObj[el]);

//     //1B Advanced filtering: less than, less and equal then...

//     let queryStr = JSON.stringify(queryObj);

//     queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // Function to replace gte.. with $gte...

//     this.query = this.query.find(JSON.parse(queryStr));
//     return this; //return the entire object in order to have access to ohter methods
//   }
//   sort() {
//     if (this.queryString.sort) {
//       //       //check if we have sort ?
//       const sortBy = this.queryString.sort.split(',').join(' '); //remove ',' between 2 sort requirement
//       this.query = this.query.sort(sortBy); // sort excecuted
//     } else {
//       this.query = this.query.sort('_id');
//     }
//     return this;
//   }

//   limitFields() {
//     if (this.queryString.fields) {
//       const fields = this.queryString.fields.split(',').join(' ');
//       this.query = this.query.select(fields);
//     } else {
//       this.query = this.query.select('-__v');
//     }
//     return this;
//   }

//   paginate() {
//     const page = this.queryString.page * 1 || 1; //conver to number
//     const limit = this.queryString.limit * 1 || 100;
//     const skip = (page - 1) * limit;
//     // page=2&limit=10 meaning 1-10 on page 1, 11-20 on page 2, 21-30 on page 3, then skip 10 result
//     //limit means how many data we send on 1 page
//     this.query = this.query.skip(skip).limit(limit);

//     return this;
//   }
// }

//OLD FASHION WAY

// exports.getAllTour = async (req, res) => {
//   try {
//     // BUILD QUERY
//     //1A FILTERING QUERY
//     const queryObj = { ...req.query };
//     const excludedFields = ['page', 'sort', 'limit', 'fields'];
//     excludedFields.forEach((el) => delete queryObj[el]);

//     //1B Advanced filtering: less than, less and equal then...

//     let queryStr = JSON.stringify(queryObj);

//     queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // Function to replace gte.. with $gte...

//     let query = Tour.find(JSON.parse(queryStr));

//     //2) SORTING

//     if (req.query.sort) {
//       //check if we have sort ?
//       const sortBy = req.query.sort.split(',').join(' '); //remove ',' between 2 sort requirement
//       query = query.sort(sortBy); // sort excecuted
//     } else {
//       query = query.sort('_id'); // new comes first
//     }

//     //3)FIELD LIMITING

//     if (req.query.fields) {
//       const fields = req.query.fields.split(',').join(' ');
//       query = query.select(fields);
//     } else {
//       query = query.select('-__v');
//     }

//     //4)PAGINATION
//     const page = req.query.page * 1 || 1; //conver to number
//     const limit = req.query.limit * 1 || 100;
//     const skip = (page - 1) * limit;
//     // page=2&limit=10 meaning 1-10 on page 1, 11-20 on page 2, 21-30 on page 3, then skip 10 result
//     //limit means how many data we send on 1 page
//     query = query.skip(skip).limit(limit);
//     if (req.query.page) {
//       const numTours = await Tour.countDocuments();
//       if (skip >= numTours) throw new Error('This page does not exist');
//     }

//EXECUTE QUERY
// const features = new APIFeature(Tour.find(), req.query).filter().sort();
// const tours = await features.query;

//     //SEND QUERY
//     res.status(201).json({
//       status: 'success',
//       result: tours.length,
//       data: {
//         tour: tours,
//       },
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: 'fail',
//       message: err.message,
//     });
//   }
// };

//GET ALL TOURs
exports.getAllTour = factory.getAll(Tour);
//URL ROUTING: GET 1 TOUR
exports.getTour = factory.getOne(Tour, { path: 'reviews' });

//POST METHOD: CREATE TOUR
exports.createTour = factory.createOne(Tour);

//PATCH MEDTHOD: UPDATE TOUR

exports.updateTour = factory.updateOne(Tour);

//DELETE METHOD: DELETE TOURS
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = async (req, res) => {
  try {
    const stats = await Tour.aggregate([
      //start with an array, then object for each stage
      {
        $match: { ratingAverage: { $gte: 4.5 } },
      },
      {
        $group: {
          _id: '$difficulty', // use to define by what catergory we want to group
          avgRating: { $avg: '$ratingAverage' },
          numTours: { $sum: 1 },
          numRating: { $sum: '$ratingQuantity' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      {
        $sort: { avgPrice: 1 }, //have to use the same name as above, use 1 for accending
      },
      {
        $match: { _id: { $ne: 'easy' } }, //not equal
      },
    ]);
    res.status(201).json({
      status: 'success',
      data: {
        stats,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.getMonthlyPlan = async (req, res) => {
  try {
    const year = req.params.year * 1;
    console.log(year);

    const plan = await Tour.aggregate([
      {
        $unwind: '$startDates',
      },
      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$startDates' },
          numTourStarts: { $sum: 1 },
          tours: { $push: '$name' },
        },
      },
      {
        $addFields: { month: '$_id' },
      },
      {
        $project: {
          _id: 0,
        },
      },
      {
        $sort: {
          numTourStarts: -1,
        },
      },
    ]);
    res.status(201).json({
      status: 'success',
      data: {
        plan,
      },
    });
  } catch (error) {
    res.status(404).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.getTourWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide lattitude and longtitude in the format lat,lng',
        400
      )
    );
  }
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  console.log(distance, lat, lng, unit);
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide lattitude and longtitude in the format lat,lng',
        400
      )
    );
  }
  const distances = await Tour.aggregate([
    {
      //need to be the first stage
      $geoNear: {
        //near property, distances will be calculated between this point and startLocation
        near: {
          type: 'point',
          coordinates: [lng * 1, lat * 1],
        },
        //where distances will be stored
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      //choose what to appear and what not
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',

    data: {
      data: distances,
    },
  });
});
