const express = require('express');
const router = express.Router();

router.use('/timers', require('./timers/timers.js'));
router.use('/webhooks', require('./webhooks/webhook.js'));

module.exports = router;