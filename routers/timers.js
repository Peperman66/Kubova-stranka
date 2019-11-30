const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const config = require('../config.js');

router.get('/', (req, res) => {

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
        
    }
    db.close((err) => {
        if (err) {
            res.status(500).json({ error: err.message });
        }
    }
});

module.exports = router;