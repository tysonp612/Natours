const catchAsync = require('./../utils/catchAsync');
const APIFeature = require('./../utils/apiFeature');
const AppError = require('./../utils/appError');
exports.deleteOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
};

exports.updateOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return next(new AppError('No Document found with that ID', 404));
    }
    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};

exports.createOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};

//Get One with populate options
//To use populate options in get one, first save query in a variable, manipulate it, then await when some condition is met
exports.getOne = (Model, popOptions) => {
  return catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;
    if (!doc) {
      return next(new AppError('No Document found with that ID', 404));
    }
    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};

exports.getAll = (Model) => {
  return catchAsync(async (req, res, next) => {
    //To allow for nested GET reviews on Tour (hack)
    let filter = {};
    if (req.params.tourId) {
      filter = { tour: req.params.tourId };
    }
    const features = new APIFeature(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    //Use explain for document statistic
    // const doc = await features.query.explain();
    const doc = await features.query;

    res.status(200).json({
      status: 'success',
      result: doc.length,
      data: {
        data: doc,
      },
    });
  });
};
