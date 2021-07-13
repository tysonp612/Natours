const User = require('../model/userModel');
const sharp = require('sharp');
const APIFeature = require('../utils/apiFeature');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');

exports.getAllUsers = factory.getAll(User);

exports.getUser = factory.getOne(User);

exports.deleteUser = factory.deleteOne(User);

exports.updateUser = factory.updateOne(User);

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });
//As it is not recommended to save photo in disk but in buffer memory, we dont save it in file, but only save it in memory so we can change the size of the photo before saving into database
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadUserPhoto = upload.single('photo');
exports.resizeUserPhoto = async (req, res, next) => {
  if (!req.file) return next();
  //resize photo in buffer memory
  //Define filename so we can use in updateMe
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);
  next();
};
//oop through the object and for each element check if it's one of the allowed fields, and if it is, simply add it to a new object, that we're then gonna return in the end.
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  console.log(newObj);
  return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //1 Create an error if user tries to update password
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for updating password, please use /updatePassword',
        400
      )
    );
  }

  //2 Filtered out only fields that are allowed
  const filterdBody = filterObj(req.body, 'name', 'email');
  if (req.file) filterdBody.photo = req.file.filename;
  //3 Update user document

  //create a variable for which we allow user to update by using filter

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filterdBody, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: updatedUser,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email }).select('+password');
  if (!(await user.correctPassword(password, user.password)))
    return next(new AppError('Password or Email is not correct', 401));
  await User.findByIdAndUpdate(user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// exports.deleteUser = catchAsync(async (req, res) => {
//   await User.findByIdAndUpdate(req.user.id, { active: false });

//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

//Create User is not nessesary since we can use sign up
