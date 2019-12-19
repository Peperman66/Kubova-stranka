const express = require('express');
const path = require('path');
const router = express.Router();
const https = require('https');
const fs = require('fs');

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
                        url: body.action.memberCreator.avatarUrl
                    },
                    url: body.model.url,
                    timestamp: body.action.date
                }
            ]
        }
        if (body.action.type === 'addLabelToCard') {
            let labelName = body.action.data.label.name;
            if (labelName == '') {
                labelName = body.action.data.label.color;
            }
            webhookBody.embeds[0].title = `[${body.model.name}] A new label was added to ${"``" + body.action.data.card.name + "``"}`;
            let description = `A \`\`${labelName}\`\` label was added to the ${"``" + body.action.data.card.name + "``"} card.`
            webhookBody.embeds[0].description = description;
            if (webhookBody.embeds[0].color != null) {
                webhookBody.embeds[0].color = JSON.parse(fs.readFileSync(path.resolve('./labelColors.json')))[body.action.data.label.color];
            } 
        } else if (body.action.type === 'removeLabelFromCard') {
            let labelName = body.action.data.label.name;
            if (labelName == '') {
                labelName = body.action.data.label.color;
            }
            webhookBody.embeds[0].title = `[${body.model.name}] A label was removed from ${"``" + body.action.data.card.name + "``"}`;
            let description = `A \`\`${labelName}\`\` label was removed from the ${"``" + body.action.data.card.name + "``"} card.`
            webhookBody.embeds[0].description = description;
            if (webhookBody.embeds[0].color != null) {
                webhookBody.embeds[0].color = JSON.parse(fs.readFileSync(path.resolve('./labelColors.json')))[body.action.data.label.color];
            } 
        } else {
            res.header('Retry-After', '600');
            res.status(504).end();
            console.log(body)
            return;
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