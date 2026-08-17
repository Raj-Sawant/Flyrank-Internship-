const cors = require('cors');

// All public endpoints (widget.js, config, submissions) accept any origin
const publicCors = cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

module.exports = { publicCors };
