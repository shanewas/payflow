require('dotenv').config();

const app = require('./app');
const db = require('./config/database');

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const gracefulShutdown = () => {
  console.log('Received kill signal, shutting down gracefully.');
  server.close(() => {
    console.log('Closed out remaining connections.');
    db.close().then(() => {
       console.log('Database connection closed.');
       process.exit(0);
    });
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
