const axios = require("axios");
const { Server } = require("socket.io");
const createError = require('http-errors');
const express = require('express');
var cors = require('cors');
const logger = require('morgan');
const bodyParser = require('body-parser');
const https = require('http');
const path = require('path');
var fs = require('fs');
const agent = require('agentkeepalive');

const env = "development";
console.log("env: ", env);
const config = require(__dirname + '/config/config.json')[env];
console.log("config: ", config);

const app = express();
app.use(logger('dev'));

if (config.FILE_UPLOAD_PATH) {
  app.use('/docs', express.static(config.FILE_UPLOAD_PATH));
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Models & DB Sync
var Models = require('./models');
Models.sequelize
  .sync()
  .then(function() {
    console.log('Nice! Database looks fine');
  })
  .catch(function(err) {
    console.log(err, 'Something went wrong with the Database Update!');
  });

const keepaliveAgent = new agent({
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketKeepAliveTimeout: 30000
});

var options = {
  agent: keepaliveAgent
};

app.use(cors());
require('./routes')(app);

const port = parseInt(process.env.PORT, 10) || 8100;
const server = https.createServer(options, app);

// ⭐ SOCKET.IO
const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  const interval = setInterval(async () => {
    try {
      // ⭐ CALL GPS API
      const response = await axios.get(
  "http://htp2.hitecpoint.in/api/Pgm/live/?apiKey=995FC323-CCEA-46F9-843A-819AA089C479"
);

      const vehicles = response.data;

      // 1. Emit live to UI
      socket.emit("vehicleLocation", vehicles);

      // 2. Persist to Sequelize TravelHistory Table
      if (Array.isArray(vehicles) && vehicles.length > 0 && Models.travelHistory) {
        const recordsToSave = vehicles
          .filter(v => v.Latitude && v.Longitude && v.BoxId)
          .map(v => ({
            box_id: String(v.BoxId),
            vehicle_name: v.VehName || '',
            latitude: parseFloat(v.Latitude),
            longitude: parseFloat(v.Longitude),
            speed: parseInt(v.Speed) || 0,
            vehicle_status: v.VehicleStatus || 'Stopped',
            location: v.Location || '',
            recorded_at: v.Lastdate ? new Date(v.Lastdate) : new Date()
          }));

        if (recordsToSave.length > 0) {
          await Models.travelHistory.bulkCreate(recordsToSave, { ignoreDuplicates: true });
        }
      }
    } catch (error) {
      console.error("API / DB Save Error:", error.message);
    }
  }, 5000); // 5-second sampling rate

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    clearInterval(interval);
  });
});

server.listen(port, '0.0.0.0', () =>
  console.log(`Server listening on ${port}`)
);

module.exports = app;