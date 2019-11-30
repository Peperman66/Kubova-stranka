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

router.all('/:timer', (req, res) => {
    let timer = req.params.timer.toString();
    let db;

    if (req.method === 'GET') {
        db = sqlite3.Database(config.dbDirectory + 'timers.sqlite3', sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
            }
        });
        let query = sql`SELECT id, name, title, header, footer, enddate, expirydate FROM timers WHERE ? in (id, name);`;
        db.get(query, [timer], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (!row) {
                res.status(404).json({ error: config.errorMessages.timerAPI.notFound});
            } else if (Date.parse(row.expiryDate) > Date.now()){
                let deleteQuery = sql`DELETE FROM timers WHERE id IS ?;`
                db.run(deleteQuery, [row.id], (err) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                    }
                });
                res.status(404).json({ error: config.errorMessages.timerAPI.expired});
            } else {
                res.status(200).json(row);
            }
        });

    } else if (req.method === 'POST'){
        
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