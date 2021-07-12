const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    unique: true,
    required: [true, 'Please provide your email'],
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: true,
    //ONLY WORK ON CREATE & SAVE, When update, remember to save
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordCurrent: String,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//Encrypt password before save
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified;
  if (!this.isModified('password')) return next();

  //Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  //Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

//Instant method that apply to every model, used for verifying input password and encrypted password in database
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  //return true or false, due to password select is false, this.password is not available
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changePasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    //change date format of passwordChangedAt by convert to interger
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp; // if true, means password has been changed after token was issued
  }
  //False means the password has not been changed after the token was issued
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); //convert to heximal string, give to user
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex'); // encrypt orginial token, store in db, then will be used later to compare with the token provided by user
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //expires in 10 minutes
  return resetToken; //return original token for user
};

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//find user with active: true
userSchema.pre(/^find/, function (next) {
  //this points to the current query
  //only find user with active set to true
  this.find({ active: { $ne: false } });
  next();
});
const User = mongoose.model('User', userSchema);

module.exports = User;
