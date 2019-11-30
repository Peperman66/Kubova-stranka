const express = require('express');
const router = express.Router();
const bettersqlite3 = require('better-sqlite3');
const config = require('../config.json');

router.all('/', (req, res) => {
    let db;
    try {
        db = new bettersqlite3(`./${config.databases.databaseDirectory}/${config.databases.general.databaseName}`);
    } catch (err) {
        res.status(500).json({ statusCode: 500, error: err.message });
        console.error(err);
        return;
    }
    let createQuery = `
    CREATE TABLE IF NOT EXISTS timers (Id TEXT NOT NULL UNIQUE, 
    Name TEXT NOT NULL UNIQUE, 
    Title TEXT, 
    Header TEXT NOT NULL, 
    Footer TEXT, 
    EndDate DATETIME NOT NULL, 
    ExpiryDate DATETIME,
    IsPublic BOOLEAN NOT NULL DEFAULT 1,
    IsLocked BOOLEAN NOT NULL DEFAULT 0,
    PasswordHash TEXT, 
    Salt TEXT,
    PRIMARY KEY(Id, Name));`;
    try {
        db.prepare(createQuery).run();
    } catch (err) {
        res.status(500).json({ statusCode: 500, error: err.message });
        console.error(err);
        return;
    }
    if (req.method === 'GET') {
        let searchQuery = `SELECT Id, Name, Title, Header, Footer, EndDate, ExpiryDate FROM Timers WHERE IsPublic = 1;`
        let result;
        try {
            result = db.prepare(searchQuery).all();
        } catch (err) {
            res.status(500).json({ statusCode: 500, error: err.message });
            console.error(err);
            return;
        }
        if (result.length === 0) {
            res.status(404).json({ statusCode: 404, error: config.errorMessages.timerAPI.noTimers });
        } else {
            res.status(200).json(result);
        }


    } else if (req.method === 'POST') {
        
    } else {
        res.status(405).json({ statusCode: 405, error: config.errorMessages.timerAPI.methodNotAllowed });
        return;
    }
});

router.all('/:timer', (req, res) => {
    let timer = req.params.timer.toString();
    let db;

    if (req.method === 'GET') {
        db = sqlite3.Database(config.dbDirectory + 'timers.sqlite3', sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                res.status(500).json({ statusCode: 500, error: err.message });
            }
        });
        let query = sql`SELECT id, name, title, header, footer, enddate, expirydate FROM timers WHERE ? in (id, name);`;
        db.get(query, [timer], (err, row) => {
            if (err) {
                res.status(500).json({ statusCode: 500, error: err.message });
            } else if (!row) {
                res.status(404).json({ statusCode: 404, error: config.errorMessages.timerAPI.notFound});
            } else if (Date.parse(row.expiryDate) > Date.now()){
                let deleteQuery = sql`DELETE FROM timers WHERE id IS ?;`;
                db.run(deleteQuery, [row.id], (err) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                    }
                });
                res.status(404).json({ statusCode: 404, error: config.errorMessages.timerAPI.expired});
            } else {
                res.status(200).json(row);
            }
        });

    } else if (req.method === 'POST'){
        
    } else if (req.method === 'PUT') {
    
    } else if (req.method === 'DELETE') {
        
    } else {
        res.status(405).json({ statusCode: 405, error: config.errorMessages.timerAPI.methodNotAllowed});
    }
    db.close((err) => {
        if (err) {
            res.status(500).json({ statusCode: 500, error: err.message });
        }
    });
});

module.exports = router;