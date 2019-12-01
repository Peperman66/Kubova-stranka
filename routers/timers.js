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
    CREATE TABLE IF NOT EXISTS timers (id TEXT NOT NULL UNIQUE, 
    name TEXT NOT NULL UNIQUE, 
    title TEXT, 
    header TEXT NOT NULL, 
    footer TEXT, 
    endDate DATETIME NOT NULL, 
    expiryDate DATETIME,
    isPublic BOOLEAN NOT NULL DEFAULT 1,
    isLocked BOOLEAN NOT NULL DEFAULT 0,
    passwordHash TEXT, 
    salt TEXT,
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
        let searchQuery = `SELECT id, name, title, header, footer, endDate, expiryDate, isLocked FROM timers WHERE isPublic = 1;`;
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

        let checkQuery = `SELECT id, name FROM Timers;`;
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
                db.close();
                return;
            }
        }
        let insertQuery = `INSERT INTO timers (id, name, title, header, footer, endDate, expiryDate, isPublic, isLocked, passwordHash, salt) VALUES (?,?,?,?,?,?,?,?,?,?,?);`;
        let passwordHash = null;
        let passwordSalt = null;
        let isLocked = false;
        let isPublic = req.param('isPublic');
        if (req.param('password')) {
            if (isPublic == true) {
                res.status(409).json({ statusCode: 409, error: config.errorMessages.timerAPI.timerCantBePublicIfPasswordIsSpecified });
                db.close();
                return;
            }
            passwordSalt = crypto.randomBytes(16).toString('hex');
            let hash = crypto.createHmac('sha512', passwordSalt);
            hash.update(req.param('password'));
            passwordHash = hash.digest('hex');
            isLocked = true;
            isPublic = false;
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
                isPublic, 
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
            isPublic: req.param("isPublic") || true, 
            isLocked: isLocked}});

    } else {
        res.status(405).json({ statusCode: 405, error: config.errorMessages.timerAPI.methodNotAllowed });
        return;
    }
    db.close();
});



router.all('/:timer', (req, res) => {
    let timer = req.params.timer.toString();
    let db;
    try {
        db = new bettersqlite3(`./${config.databases.databaseDirectory}/${config.databases.general.databaseName}`);
    } catch (err) {
        res.status(500).json({ statusCode: 500, error: err.message });
        console.error(err);
        return;
    }
    if (req.method === 'GET') {
        let searchQuery = `SELECT id, name, title, header, footer, endDate, expiryDate, isPublic, isLocked, passwordHash, salt FROM timers WHERE ? in (id, name);`;
        let searchResult;
        try {
            searchResult = db.prepare(searchQuery).get(timer);
        } catch (err) {
            res.status(500).json({ statusCode: 500, error: err.message });
            console.error(err);
            db.close();
            return;
        }
        if (searchResult.length === 0) {
            res.status(404).json({ statusCode: 404, error: config.errorMessages.timerAPI.notFound });
            db.close();
            return;
        } else if (searchResult.isLocked == false){
            res.status(200).json({ statusCode: 200, result: {
                id: searchResult.id, 
                name: searchResult.name, 
                title: searchResult.title, 
                header: searchResult.header, 
                footer: searchResult.footer, 
                endDate: searchResult.endDate,
                expiryDate: searchResult.expiryDate,
                isPublic: searchResult.isPublic,
                isLocked: searchResult.isLocked}});
            db.close();
            return;
        } else if (req.param('password') == null) {
            res.status(401).json({statusCode: 401, error: config.errorMessages.timerAPI.unauthorizedToView});
            db.close();
            return;
        } else {
            passwordSalt = searchResult.salt
            let hash = crypto.createHmac('sha512', passwordSalt);
            hash.update(req.param('password'));
            passwordHash = hash.digest('hex');
            if (passwordHash === searchResult.passwordHash) {
                res.status(200).json({statusCode: 200, result: {
                    id: searchResult.id,
                    name: searchResult.name,
                    title: searchResult.title,
                    header: searchResult.header,
                    footer: searchResult.footer,
                    endDate: searchResult.endDate,
                    isPublic: searchResult.isPublic,
                    isLocked: searchResult.isLocked}});
                db.close();
                return;
            } else {
                res.status(403).json({statucCode: 403, error: config.errorMessages.timerAPI.forbiddenToView});
                db.close();
                return;
            }
        }

    } else if (req.method === 'POST') {

    } else if (req.method === 'PUT') {

    } else if (req.method === 'DELETE') {

    } else {
        res.status(405).json({ statusCode: 405, error: config.errorMessages.timerAPI.methodNotAllowed });
    }
});

module.exports = router;

function CheckIfNameExists(DBOutput, searchedName) {
    for (let value of DBOutput) {
        if (value.Name == searchedName) 
            return true; 
    };
    return false; 
}

function CheckIfIdExists(DBOutput, searchedId) {
    for(let value of DBOutput) {
        if (value.Name === searchedId)
            return true;
    };
    return false;
}