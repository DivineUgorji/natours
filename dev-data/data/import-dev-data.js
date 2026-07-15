const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

dotenv.config({ path: './config.env' });
// console.log(process.env);
console.log(process.env.DATABASE);

mongoose.set('bufferCommands', false);

const DB = process.env.DATABASE;
// mongoose
//   .connect(DB, {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//     useFindAndModify: false,
//   })
//   .then(() => console.log('DB connection succesful'));

// mongoose.connection.once('open', () => {
//   console.log('Connected to:', mongoose.connection.name);
// });

const start = async () => {
  try {
    // await mongoose.connect(DB, {
    //   useNewUrlParser: true,
    //   useCreateIndex: true,
    //   useFindAndModify: false,
    //   useFindAndModify: false,
    // });

    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });

    console.log('DB connection successful');

    if (process.argv[2] === '--import') {
      await importData();
    } else if (process.argv[2] === '--delete') {
      await deleteData();
    }
  } catch (err) {
    console.error(err);
  }

  process.exit();
};

start();

// READ JSON FILE
// const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
// const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'),
);

// Import data into database
const importData = async () => {
  try {
    // console.log('Importing tours...');
    // await Tour.create(tours);
    // console.log('✓ Tours imported');

    // console.log('Importing users...');
    // await User.create(users);
    // console.log('✓ Users imported');

    console.log('Importing reviews...');
    await Review.create(reviews);
    console.log('✓ Reviews imported');

    console.log('Finished!');
  } catch (err) {
    console.error(err);
  }
};
// const importData = async () => {
//   try {
//     await Tour.create(tours);
//     await User.create(users, { validateBeforeSave: false });
//     await Review.create(reviews);
//     console.log('Data successfully loaded');
//   } catch (err) {
//     console.log(err);
//   }
// };

// Delete existing data from DB collection
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data deleted successfully');
  } catch (err) {
    console.log(err);
  }
  // process.exit();
};

// if (process.argv[2] === '--import') {
//   importData();
// } else if (process.argv[2] === '--delete') {
//   deleteData();
// }

console.log(process.argv);
