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
                    timestamp: Date.parse(body.action.date)
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
            },
            body: webhookBody
        }
        https.request(postOptions, (response) => {
            if (response.statusCode == 200 || response.statusCode == 204) {
                res.statusCode(204).end();
            } else {
                console.log(response.statusCode);
            }
        });
    } else {
        res.status(400).json({});
        console.log(service);
        return;
    }
});

module.exports = router;