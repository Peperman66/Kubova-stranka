const express = require('express');
const path = require('path');
const router = express.Router();

router.get('/:timer', (req, res) => {
    res.sendFile(path.join(__dirname, '../../web/dynamic/timers/viewTimer.html'));
});

module.exports = router;