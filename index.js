require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/api', require('./routers/api.js'));
app.use('/timer', require('./routers/web/timer.js'));

app.use(express.static('./web/static/', {extensions: ['html', 'js', 'css']}));

app.listen(port, () => {
    console.log(`Server listening at port ${port}`);
});
