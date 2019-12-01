const express = require('express');
const router = express.Router();

router.use('/timers', require('./timers/timers.js'));

module.exports = router;