const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

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
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  console.log('login controller hit');
  const { email, password } = req.body;
  console.log('Email:', email);

  // 1) check if email and password exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  // 2) check if user email and password exists in the db
  const user = await User.findOne({ email }).select('+password');
  // const correct = ;

  // 3) Compare if the provided password and the saved one match,
  // then, if everything is okay, sign token and send to client
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, res);
});

/**This is a middleware function to protect the get allTours
 * route and ensure it can only be accessed by users with login access.
 */
exports.protect = catchAsync(async (req, res, next) => {
  // 1). Getting the token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // console.log(token);
  if (!token) {
    return next(
      new AppError('You are not logged in, please login to get access', 401),
      // Status code 401, access denied
    );
  }
  // 2). Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log('DECODED', decoded);
  // 3). Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists', 401),
    );
  }
  // 4). Check if user changed passwords after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password, pleasee login again', 401),
    );
  }

  // Grant access to the protected route
  req.user = currentUser;
  next();
});

/* This middleware function restricts access to certain operations 
on the application to the just the admin and lead-guide */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1). Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }
  // 2). Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  /* The validateBeforeSave in the user.save() method,
   * helps to save this document to the database without requiring
   * the validation parameter we put in place.
   */

  // 3). Send it back as an email
  // const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a patch request with your new password
  and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 mins)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  console.log(req.params.token);

  // 1). Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  console.log(hashedToken);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiresAt: { $gt: Date.now() },
  });
  // 2). If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
  // 3). Update changedPasswordAt property for the user
  // 4). Login the user, send JWT
  createSendToken(user, 200, res);
});

// Implement password update for logged-in users
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get the user from the collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if the posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is not correct', 401));
  }

  // 3) If the password is correct, update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
