const express = require('express');
const path = require('path');
const router = express.Router();
const https = require('https');

router.post('/:webhookId/:webhookToken/:service', (req, res) => {
    const discordAddress = `/api/webhooks/${req.params.webhookId}/${req.params.webhookToken}`;
    const service = req.params.service;
    const body = req.body;
    if (service.toLowerCase() === 'trello') {
        let webhookBody = {
            username: 'Trello',
            embeds: [
                {
                    author: {
                        name: body.action.memberCreator.fullName,
                        url: `https://trello.com/${body.action.memberCreator.username}`
                    },
                    url: body.model.url,
                    timestamp: body.action.date
                }
            ]
        }
        if (body.action.type === 'addLabelToCard') {
            webhookBody.embeds[0].title = `[${body.model.name}] A new label was added to ${"``" + body.action.data.card.name + "``"}`;
            let description = `A \`\`${body.action.data.card.label}\`\` label was added to the ${"``" + body.action.data.card.name + "``"} card.`
            webhookBody.embeds[0].description = description;
        }
        webhookBody = JSON.stringify(webhookBody);
        let postOptions = {
            hostname: 'discordapp.com',
            port: 443,
            path: discordAddress,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(webhookBody)
            }
        }
        let request = https.request(postOptions, (response) => {
            if (response.statusCode == 200 || response.statusCode == 204) {
                res.statusCode(204).end();
            } else {
                res.statusCode(502).end();
                console.log(response.statusCode);
                response.on('data', (data) => console.log(data.toString()));
            }
        });
        request.write(webhookBody);
        request.end();
    } else {
        res.status(400).json({});
        console.log(service);
        return;
    }
});

router.head('/:webhookId/:webhookToken/:service', (req, res) => {
    const discordAddress = `/api/webhooks/${req.params.webhookId}/${req.params.webhookToken}`;
    let requestOptions = {
        hostname: 'discordapp.com',
        port: 443,
        path: discordAddress,
        method: 'HEAD',
        headers: {
            'Content-Type': 'application/json',
        }
    }
    let request = https.request(requestOptions, (response) => {
        if (response.statusCode == 200) {
            res.headers = response.headers;
            res.status(200).end();
        } else {
            res.status(502).end();
        }
    });
    request.end();
})

module.exports = router;