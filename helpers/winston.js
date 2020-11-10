// winston.js

/**
 * Required External Modules
 */

const appRoot = require('app-root-path');
const winston = require('winston');

/**
 * Variables
 */

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: `${appRoot}/log/app.log`,
      level: 'info',
      format: winston.format.json(),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      colorize: false
    }),
    new winston.transports.Http({
      level: 'warn',
      format: winston.format.json()
    }),
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
  exitOnError: false, // do not exit on handled exceptions
});

logger.stream = {
  write: function(message, encoding) {
    logger.info(message);
  },
};

module.exports = logger;