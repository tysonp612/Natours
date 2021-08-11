const dotenv = require('dotenv');
const mongoose = require('mongoose');
//Uncaught Exceptions
process.on('uncaughtException', (err) => {
  // console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((con) => {
    console.log('db connection successful');
  });
const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

//Unhandled Rejection
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  //shut down application, put 1 for uncaught exceptions
  //server.close to give time for server to run all request before being abrubted exit
  server.close(() => {
    process.exit(1);
  });
});
