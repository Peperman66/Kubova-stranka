const express = require('express');
const router = express.Router();
const bettersqlite3 = require('better-sqlite3');
const crypto = require('crypto');
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
        db.close();
        return;
    }

    if (req.method === 'GET') {
        let searchQuery = `SELECT Id, Name, Title, Header, Footer, EndDate, ExpiryDate FROM Timers WHERE IsPublic = 1;`;
        let result;
        try {
            result = db.prepare(searchQuery).all();
        } catch (err) {
            res.status(500).json({ statusCode: 500, error: err.message });
            console.error(err);
            db.close();
            return;
        }
        if (result.length === 0) {
            res.status(404).json({ statusCode: 404, error: config.errorMessages.timerAPI.noTimers });
        } else {
            res.status(200).json({ statusCode: 200, result: result});
        }

    } else if (req.method === 'POST') {
        if (req.param('endDate') == null || req.param('header') == null) {
            res.status(400).json({ statusCode: 400, error: config.errorMessages.timerAPI.missingParametersOnCreating});
            return;
        }

        let checkQuery = `SELECT Id, Name FROM Timers;`;
        let checkResult;
        try {
            checkResult = db.prepare(checkQuery).all();
        } catch (err) {
            res.status(500).json({ statusCode: 500, error: err.message });
            console.error(err);
            db.close();
            return;
        }
        let randomId;
        let randomName;
        do {
            randomId = Math.round(Math.random() * Math.floor(1000000)).toString();
        } while (CheckIfIdExists(checkResult, randomId));
        if (!req.param("name")){
            do {
                randomName = crypto.randomBytes(8).toString('hex');
            } while (CheckIfNameExists(checkResult, randomName));
        } else {
            if (CheckIfNameExists(checkResult, req.param("name"))) {
                res.status(409).json({statusCode: 409, error: config.errorMessages.timerAPI.alreadyExistingName});
                return;
            }
        }
        let insertQuery = `INSERT INTO timers (Id, Name, Title, Header, Footer, EndDate, ExpiryDate, IsPublic, IsLocked, PasswordHash, Salt) VALUES (?,?,?,?,?,?,?,?,?,?,?);`;
        let passwordHash = null;
        let passwordSalt = null;
        let isLocked = 0;
        if (req.param('password')) {
            passwordSalt = crypto.randomBytes(16).toString('hex');
            let hash = crypto.createHmac('sha512', salt);
            hash.update(req.param('password'));
            passwordHash = hash.digest('hex');
            isLocked = 1;
        }
        let endDate = new Date(req.param('endDate')).getTime();
        let expiryDate = new Date(req.param('expiryDate')).getTime() || Date.parse(req.param('endDate')) + (7 * 24 * 60 * 60 * 1000)
        try {
            db.prepare(insertQuery).run(
                randomId, 
                req.param('name') || randomName, 
                req.param('title'), 
                req.param('header'), 
                req.param('footer'), 
                endDate, 
                expiryDate, 
                req.param('isPublic') || 1, 
                isLocked, 
                passwordHash, 
                passwordSalt);
        } catch (err) {
            res.status(500).json({ statusCode: 500, error: err.message });
            console.error(err);
            db.close();
            return;
        }
        res.status(201).json({ statusCode: 201, result: { 
            id: randomId, 
            name: randomName, 
            title: req.param('Title'),
            header: req.param('header'), 
            endDate: endDate, 
            expiryDate: expiryDate, 
            isPublic: req.param("isPublic") || 1, 
            isLocked: req.param("isLocked") || 0}});

    } else {
        res.status(405).json({ statusCode: 405, error: config.errorMessages.timerAPI.methodNotAllowed });
        return;
    }
    db.close();
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