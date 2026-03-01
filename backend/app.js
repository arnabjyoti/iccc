const createError = require('http-errors');
const express = require('express');
var cors = require('cors');
const logger = require('morgan');
const bodyParser = require('body-parser');
const https = require('http');
// const https = require('https');
const path = require('path');
var fs = require('fs');
const agent = require('agentkeepalive');
// process.env.NODE_ENV || ---Needed to be added
// const env =process.env.NODE_ENV || "development";
//code to run in local env
// const env ="test"; 
//code to run in production env
// const env ="production"; 
const env ="development"; 
console.log("env: ", env);
const config = require(__dirname + '/config/config.json')[env];
console.log("config: ", config);
// Set up the express app
const app = express();
// Log requests to the console.
app.use(logger('dev'));

//Static folders
app.use('/docs', express.static(config.FILE_UPLOAD_PATH));

// Parse incoming requests data (https://github.com/expressjs/body-parser)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Models
var Models = require('./models');
// Sync Database
Models.sequelize
	.sync()
	.then(function() {
		console.log('Nice! Database looks fine');
	})
	.catch(function(err) {
		console.log(err, 'Something went wrong with the Database Update!');
	});

var privateKey = fs.readFileSync(`${config.cert.key}`, 'utf8');
var certificate = fs.readFileSync(`${config.cert.crt}`, 'utf8');

const keepaliveAgent = new agent({
	maxSockets: 100,
	maxFreeSockets: 10,
	timeout: 60000,
	freeSocketKeepAliveTimeout: 30000 // free socket keepalive for 30 seconds
});

var options = {
	// key: privateKey,
	// cert: certificate,
	agent: keepaliveAgent
};
// Setup a default catch-all route that sends back a welcome message in JSON format.
app.use(cors());
require('./routes')(app);
const port = parseInt(process.env.PORT, 10) || 8800;
app.set('port', port);
const server = https.createServer(options, app);
server.listen(port, '0.0.0.0', () => console.log(`Server listening on ${port}`));

module.exports = app;
