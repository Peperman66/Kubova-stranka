const express = require('express');
const router = express.Router();
const bettersqlite3 = require('better-sqlite3');
const crypto = require('crypto');
const config = require('../../config.json');

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
    endText TEXT NOT NULL, 
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

    try {
        DeleteExpiredTimers(db);
    } catch (err) {
        res.status(500).json({statusCode: 500, error: err.message});
    }

    if (req.method === 'GET') {
        let searchQuery = `SELECT id, name, title, header, footer, endText, endDate, expiryDate FROM timers WHERE isPublic = 1;`;
        let result;
        try {
            result = db.prepare(searchQuery).all();
        } catch (err) {
            res.status(500).json({ statusCode: 500, error: err.message });
            console.error(err);
            db.close();
            return;
        }
        if (!result) {
            res.status(404).json({ statusCode: 404, error: config.errorMessages.timerAPI.noTimers });
        } else {
            res.status(200).json({ statusCode: 200, result: result});
        }

    } else if (req.method === 'POST') {
        if (!req.param('endDate') || !req.param('header') || !req.param('endText')) {
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
        let insertQuery = `INSERT INTO timers (id, name, title, header, footer, endText, endDate, expiryDate, isPublic, isLocked, passwordHash, salt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?);`;
        let passwordHash = null;
        let passwordSalt = null;
        let isLocked = 0;
        let isPublic = parseInt(req.param('isPublic')); //Ensure to parse from true/false to 1/0
        if (req.param('password')) {
            if (isPublic == 1) {
                res.status(409).json({ statusCode: 409, error: config.errorMessages.timerAPI.timerCantBePublicIfPasswordSpecified });
                db.close();
                return;
            }
            passwordSalt = crypto.randomBytes(16).toString('hex');
            let hash = crypto.createHmac('sha512', passwordSalt);
            hash.update(req.param('password'));
            passwordHash = hash.digest('hex');
            isLocked = 1;
            isPublic = 0;
        } else {
            if (!isPublic) {
                isPublic = 1;
            }
        }
        let endDate = new Date(req.param('endDate')).getTime();
        let expiryDate = new Date(req.param('expiryDate')).getTime() || Date.parse(req.param('endDate')).getTime() + (7 * 24 * 60 * 60 * 1000)
        try {
            db.prepare(insertQuery).run(
                randomId, 
                req.param('name') || randomName, 
                req.param('title'), 
                req.param('header'), 
                req.param('footer'), 
                req.param('endText'),
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
            isPublic: req.param("isPublic") || 1, 
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

    try {
        DeleteExpiredTimers(db);
    } catch (err) {
        res.status(500).json({ statusCode: 500, error: err.message });
    }

    if (req.method === 'GET') {
        let searchQuery = `SELECT id, name, title, header, footer, endText, endDate, expiryDate, isPublic, isLocked, passwordHash, salt FROM timers WHERE ? in (id, name);`;
        let searchResult;
        try {
            searchResult = db.prepare(searchQuery).get(timer);
        } catch (err) {
            res.status(500).json({ statusCode: 500, error: err.message });
            console.error(err);
            db.close();
            return;
        }
        if (!searchResult) {
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
                endText: searchResult.endText,
                endDate: searchResult.endDate,
                expiryDate: searchResult.expiryDate,
                isPublic: searchResult.isPublic,
                isLocked: searchResult.isLocked}});
            db.close();
            return;
        } else if (req.param('password') == null) {
            res.status(401).json({statusCode: 401, error: config.errorMessages.timerAPI.unauthorized});
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
                    endText: searchResult.endText,
                    endDate: searchResult.endDate,
                    expiryDate: searchResult.expiryDate,
                    isPublic: searchResult.isPublic,
                    isLocked: searchResult.isLocked}});
                db.close();
                return;
            } else {
                res.status(403).json({statucCode: 403, error: config.errorMessages.timerAPI.forbidden});
                db.close();
                return;
            }
        }

    } else if (req.method === 'PUT') {
        let searchQuery = `SELECT id, name, title, header, footer, endDate, expiryDate, isPublic, isLocked, passwordHash, salt FROM timers WHERE ? in (id, name);`;
        let searchResult;
        try {
            searchResult =  db.prepare(searchQuery).get(req.params.timer.toString());
        } catch (err) {
            res.status(500).json({ statusCode: 500, error: err.message });
            console.error(err);
            db.close();
            return;
        }
        if (!searchResult) {
        let allowedParams = ["name", "title", "header", "footer", "endText", "endDate", "expiryDate"];
            res.status(404).json({ statusCode: 404, error: config.errorMessages.timerAPI.notFound });
            db.close();
            return;
        } else if (searchResult.isLocked == false) {
            res.status(401).json({statusCode: 403, error: config.errorMessages.timerAPI.cannotEditOrDeleteNonLockedTimers});
            db.close();
            return;
        } else if (!req.param("password")) {
            res.status(401).json({statusCode: 401, error: config.errorMessages.timerAPI.unauthorized});
            db.close();
            return;
        } else {
            passwordSalt = searchResult.salt;
            let hash = crypto.createHmac('sha512', passwordSalt);
            hash.update(req.param('password'));
            passwordHash = hash.digest('hex');
            if (passwordHash != searchResult.passwordHash) {
                res.status(403).json(config.errorMessages.timerAPI.forbidden);
                db.close();
                return;
            } else if (!Object.keys(req.body).some(param => allowedParams.includes(param))) {
                res.status(400).json({ statusCode: 400, error: config.errorMessages.timerAPI.noValidParamsForPutRequest });
                db.close();
                return;
            } else {
                let id = searchResult.id;
                let name = searchResult.name;
                let title = req.param("title") || searchResult.title;
                let header = req.param("header") || searchResult.header;
                let footer = req.param("footer") || searchResult.footer;
                let endDate = new Date(req.param("endDate")).getTime() || searchResult.endDate;
                let expiryDate = searchResult.expiryDate;
                if (req.param("expiryDate") != null ) {
                    if (endDate + (7 * 24 * 60 * 60 * 1000) < new Date(req.param("expiryDate")).getTime()){
                        res.status(400).json({statusCode: 400, error: config.errorMessages.timerAPI.invalidExpiryDate});
                        db.close();
                        return;
                    } else {
                        expiryDate = new Date(req.param("expiryDate")).getTime();
                    }
                } else {
                    expiryDate = endDate + (7 * 24 * 60 * 60 * 1000);
                }
                let updateQuery = `UPDATE timers SET name = ?, title = ?, header = ?, footer = ?, endDate = ?, expiryDate = ? WHERE id = ?;`;
                try {
                    db.prepare(updateQuery).run(name, title, header, footer, endDate, expiryDate, id);
                } catch (err) {
                    res.status(500).json({ statusCode: 500, error: err.message });
                    db.close();
                    console.error(err);
                    return;
                }
                res.status(204).end();
                db.close();
                return;
            }
        }

    } else if (req.method === 'DELETE') {
        let searchQuery = `SELECT id, name, isLocked, passwordHash, salt FROM timers WHERE ? in (id, name);`;
        let searchResult;
        try {
            searchResult = db.prepare(searchQuery).get(req.params.timer.toString());
        } catch (err) {
            res.status(500).json({ statusCode: 500, error: err.message });
            console.error(err);
            db.close();
            return;
        }
        if (!searchResult) {
            res.status(404).json({ statusCode: 404, error: config.errorMessages.timerAPI.notFound });
            db.close();
            return;
        } else if (searchResult.isLocked == false) {
            res.status(401).json({ statusCode: 403, error: config.errorMessages.timerAPI.cannotEditOrDeleteNonLockedTimers });
            db.close();
            return;
        } else if (!req.param("password")) {
            res.status(401).json({ statusCode: 401, error: config.errorMessages.timerAPI.unauthorized });
            db.close();
            return;
        } else {
            passwordSalt = searchResult.salt;
            let hash = crypto.createHmac('sha512', passwordSalt);
            hash.update(req.param('password'));
            passwordHash = hash.digest('hex');
            if (passwordHash != searchResult.passwordHash) {
                res.status(403).json(config.errorMessages.timerAPI.forbidden);
                db.close();
                return;
            } else {
                let deleteQuery = `DELETE FROM timers WHERE id = ?;`;
                try {
                    db.prepare(deleteQuery).run(searchResult.id);
                } catch (err) {
                    res.status(500).json({ statusCode: 500, error: err.message });
                    console.error(err);
                    db.close();
                    return;
                }
                res.status(204).end();
                db.close();
                return;
            }
        }
        
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

function DeleteExpiredTimers(db) {
    let searchQuery = `DELETE FROM timers WHERE expiryDate < ?;`;
    db.prepare(searchQuery).run(Date.now());
}