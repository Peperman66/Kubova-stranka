const express = require('express');
const path = require('path');
const router = express.Router();

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../web/dynamic/timers/viewTimers.html'));
});

router.get('/:timer', (req, res) => {
    res.sendFile(path.join(__dirname, '../../web/dynamic/timers/viewTimer.html'));
});

router.get('/:timer/update', (req, res) => {
    res.sendFile(path.join(__dirname, '../../web/dynamic/timers/updateTimer.html'));
});

router.get('/:timer/delete', (req, res) => {
    res.sendFile(path.join(__dirname, '../../web/dynamic/timers/deleteTimer.html'));
});

module.exports = router;