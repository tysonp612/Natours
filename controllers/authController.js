const { promisify } = require('util');
const User = require('../model/userModel');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  //create cookie options
  const cookieOptions = {
    //convert to milisecond
    expries: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),

    //to prevent cross side scripting, nobody can hear from this protocol
    httpOnly: true,
  };
  //send cookie
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1check if email & password exits

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  //2Check if user exists and password is correct
  //to select password from unselected field, use .select('+password')
  const user = await User.findOne({ email: email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('Password or Email is not correct', 401));

  //3 If everything ok, send token to
  createSendToken(user, 200, res);
});

exports.logout = (req, res, next) => {
  //This is pascals solution you can just delete the cookie immediately by setting time to the past
  res.cookie('jwt', 'null', {
    expires: new Date(Date.now() - 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  //1) get the token, check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in!, Please log in to get access', 401)
    );
  }
  ///Only for render pages, no errors!

  //2) validate the token, verification step
  //   To validate token:
  //  jwt.verify(token, Secret, a callback function if token is verified)
  // To make the function return a promise that we can await, use promisify from util
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //if token is not valid or token is exprired, we delicate the error into global error handler
  //3) if validation is successful, check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('No user found with this token', 401));
  }

  //4) Check if currentUser changed password after token was issued
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again', 401)
    );
  }
  //5) if everything is verified, next
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    //1 verify token
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET
    );

    //2) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next();
    }

    //4) Check if currentUser changed password after token was issued
    if (currentUser.changePasswordAfter(decoded.iat)) {
      return next();
    }
    //5) if everything is verified, There is a logged in user
    res.locals.user = currentUser;

    return next();
  }

  next();
};
//In case we want to pass parameters into controller function, we use a wrapper function :
exports.restrictTo = (...role) => {
  return (req, res, next) => {
    // role [admin,lead-guide].
    if (!role.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1 Get User based on posted email;
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user found', 404));
  }
  //2 Generate random token and
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // as we call the function above, we only modify the data, then we have to save it in order to save it into the database
  //Also deactive required field before save

  //3 Send it back as an email

  // const message = `Forgot your password ? Submit a Patch request with your new password and password confirm to the reset url : ${resetURL}. \n If you did not foget your password, please ignore this email `;
  // try {
  //   await sendEmail({
  //     email: user.email,
  //     subject: 'Your password reset token (valid for 10 min)',
  //     message,
  //   });

  //   res.status(200).json({
  //     status: 'sucess',
  //     message: 'Token sent to email',
  //   });
  // } catch (err) {
  //   user.passwordResetToken = undefined;
  //   user.passwordResetExpires = undefined;
  //   await user.save({ validateBeforeSave: false });
  //   return next(
  //     new AppError('There was an error sending the email. Try again later', 404)
  //   );
  // }

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'sucess',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the email. Try again later', 404)
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1 Get user based on token
  const hasedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hasedToken,
    //check if token has yet expired, if true, then token is still valid
    passwordResetExpires: { $gt: Date.now() },
  });
  //2 Set new password only if token has not expire
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  //3 Update password for the current user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  //always have to await when save, so the data will not change right away but have to wait for validation
  await user.save();

  //4 Change ChangedPasswordAt property
  //5 Log the user in, send jwt
  createSendToken(user, 201, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1 get user from collection
  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return next(new AppError('No user found', 404));
  }

  //2 check if posted password is correct,

  const checkedPassword = await user.correctPassword(
    req.body.passwordCurrent,
    user.password
  );
  if (!checkedPassword) {
    return next(new AppError('Password is incorrect', 401));
  }

  //3 if password is correct, update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4 log user in, send jwt, with new password
  createSendToken(user, 201, res);
});
