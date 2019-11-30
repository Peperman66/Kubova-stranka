const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const config = require('../config.js');

router.all('/', (req, res) => {
    if (req.method === 'get') {

    } else if (req.method === 'post') {

    } else {
        res.status(405).json({ error: config.errorMessages.timerAPI.methodNotAllowed });
    }
});

router.all('/:timerName', (req, res) => {
    let error;
    let db = sqlite3.Database(config.dbDirectory + 'timers.sqlite3', sqlite3.OPEN_CREATE, (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
        }
    });
    if (req.method === 'GET') {
        
    } else if (req.method === 'POST') {
        
    } else if (req.method === 'PUT') {
        
    } else if (req.method === 'DELETE') {
        
    } else {
        res.status(405).json({error: config.errorMessages.timerAPI.methodNotAllowed});
    }
    db.close((err) => {
        if (err) {
            res.status(500).json({ error: err.message });
        }
    }
});

module.exports = router;