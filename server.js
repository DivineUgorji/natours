const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');

// Handling uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled Exception! 🚨 Shutting down');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const DB = process.env.DATABASE;
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('DB connection succesful'));

mongoose.connection.once('open', () => {
  console.log('Connected to:', mongoose.connection.name);
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App listening on port ${port}...`);
});

// Handling Unhandled Rejected Promises in our application
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled Rejection! 🚨 Shutting down');
  server.close(() => {
    process.exit(1);
  });
});
