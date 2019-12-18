const express = require('express');
const path = require('path');
const router = express.Router();

router.post('/:webhookId/:webhookToken/:service', (req, res) => {
    const discordAddress = `https://discordapp.com/api/webhooks/${req.params.webhookId}/${req.params.webhookToken}`;
    const service = req.params.service;
    const body = req.body;
    if (service.toLowerCase() === 'trello') {
        let embed = {
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
            embed.embeds[0].title = `[${body.model.name}] A new label was added to ${"``" + body.action.data.card.name + "``"}`;
            let description = `A \`\`${body.action.data.card.label}\`\` label was added to the ${"``" + body.action.data.card.name + "``"} card.`
            embed.embeds[0].description = description;
        }
    } else {
        res.status(400).json({});
        console.log(service);
        return;
    }
});

module.exports = router;