// winston.js

/**
 * Required External Modules
 */

import appRoot from 'app-root-path';
import { createLogger, transports as _transports, format as _format } from 'winston';

/**
 * Variables
 */

const logger = createLogger({
  transports: [
    new _transports.File({
      filename: `${appRoot}/log/app.log`,
      level: 'info',
      format: _format.json(),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      colorize: false
    }),
    new _transports.Http({
      level: 'warn',
      format: _format.json()
    }),
    new _transports.Console({
      level: 'info',
      format: _format.combine(
        _format.colorize(),
        _format.simple()
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

export function error(message) {
  log('error', message);
}

export function info(message) {
  log('info', message);
}

export function warn(message) {
  log('warn', message);
}

let log = function(level, message) {
  logger.log({
    level: level,
    message: message
  });
}

export default logger;