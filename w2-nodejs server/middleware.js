function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]  ${req.method}  ${req.originalUrl}`);
  next();
}

function errorHandler(err, req, res, next) {
  console.error(`❌ Error: ${err.message}`);
  console.error(err.stack);

  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      status: err.status || 500,
    },
  });
}

module.exports = { requestLogger, errorHandler };
