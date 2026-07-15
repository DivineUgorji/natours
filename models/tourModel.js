const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal to 40 characters'],
      minlength: [10, 'A tour name must have more or equal to 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain charaters'],
    },
    slug: String,
    duration: { type: Number, required: [true, 'A tour must have a duration'] },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy, medium, or difficult',
      },
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be 1 or above'],
      max: [5, 'Rating must be 5 or below'],
    },
    ratingsQuantity: { type: Number, default: 0 },
    price: { type: Number, required: [true, 'A tour must have a price'] },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // This only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below the regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // MongoDb uses GeoJSON to specify Geo data
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },

      coordinates: [Number],
      address: String,
      description: String,
    },

    locations: [
      {
        type: {
          type: String,
          default: ['Point'],
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Virtual properties are fields we can define
 * in our schema that won't be persisted (stored in the Db).
 * These are fields that can be derived from one another
 and it makes no sense to save them to the database.
 e.g conversion of distance from miles to kilometers.

 NB: Virtual properties can not be used in a query
 because they're not a part of the database technically.
 */
// Example of virtual property in Mongo
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

/**
 * Just like in express, there's also a concept of middlewares in Mongoose.
 * These middleswares can be used to make something happen between two events.
 * For instance, each time a document is saved to the database, we can run a function
 * between when the save command is made and when the document gets saved in the db.
 * We can always define a function to run before or after saving an event in the database.
 *
 * There are four kinds of middlewares in Mongoose which are:
 * -Document
 * -Query
 * -Aggregate and
 * -Model middlewares
 */

// Example of pre DOCUMENT MIDDLEWARE runs before .save() and .create()
// but does not work on .insertMany()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// This Document query embedds the user guides data in the tour document.
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
// });

// Example of post Document middleware: runs before .save() and .create()
// but does not work on .insertMany()
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

/**
 * The query middleware allows us to excute a function before
 * and after a query is made to the database.
 */
// Example of the pre-save Query middleware
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

// Example of the post Query middleware, this is run after a save to the db
tourSchema.post(/^find/, function (docs, next) {
  console.log(`query took ${Date.now() - this.start} milliseconds`);
  console.log(docs);
  next();
});

// Query middleware to populate the tours documemt with users (guides) reference
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

/**
 * Aggregation middleware allows us to exscute functions and
 * add hooks before an aggregation happens
 */
tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  next();
});

/**
 * DATA VALIDATION
 * Validatin is simply checking if the data entered are in the right format
 * for each field in our document schema and that values have been entered
 * for all of the required fields.
 * Mongoose provides us powerful ways to do data validation.
 *
 * Sanitization ensures that the received or inputed data is clean
 * and ensures that no malicious code is being injected
 * into our application and database.
 */

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
