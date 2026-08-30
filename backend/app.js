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
const cron = require('node-cron');
const { Op } = require('sequelize');

const env = "development";
console.log("env: ", env);
const config = require(__dirname + '/config/config.json')[env];
console.log("config: ", config);

// Set up the express app
const app = express();

// Log requests to the console
app.use(logger('dev'));

// Static folders
if (config.FILE_UPLOAD_PATH) {
  app.use('/docs', express.static(config.FILE_UPLOAD_PATH));
}

// Parse incoming requests data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Models & Sync Database
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
  freeSocketKeepAliveTimeout: 30000 // free socket keepalive for 30 seconds
});

var options = {
  agent: keepaliveAgent
};

// Enable CORS and load routes
app.use(cors());
require('./routes')(app);

const port = parseInt(process.env.PORT, 10) || 8100;
const server = https.createServer(options, app);

// ⭐ SOCKET.IO INITIALIZATION
const io = new Server(server, {
  cors: { origin: "*" }
});

// Single global in-memory fleet cache
let latestVehicleData = [];

// ⭐ 24/7 INDEPENDENT TELEMETRY WORKER
// Runs permanently on the server regardless of whether browsers are open or closed
setInterval(async () => {
  try {
    const response = await axios.get(
      "http://htp2.hitecpoint.in/api/Pgm/live/?apiKey=995FC323-CCEA-46F9-843A-819AA089C479"
    );

    const vehicles = response.data;
    latestVehicleData = vehicles;

    // 1. Broadcast live telemetry to all currently connected clients simultaneously
    io.emit("vehicleLocation", vehicles);

    // 2. Persist to MySQL/Postgres exactly once per interval
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
    console.error("GPS Ingestion / DB Error:", error.message);
  }
}, 5000); // 5-second collection interval

// ⭐ AUTOMATED 30-DAY RETENTION CRON JOB
// Runs automatically every night at 00:00 (Midnight)
cron.schedule('0 0 * * *', async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days rolling threshold

    if (Models.travelHistory) {
      const deletedCount = await Models.travelHistory.destroy({
        where: {
          recorded_at: {
            [Op.lt]: cutoffDate
          }
        }
      });

      console.log(`[Auto-Clean] Successfully purged ${deletedCount} records older than 30 days (${cutoffDate.toISOString()})`);
    }
  } catch (err) {
    console.error('[Auto-Clean Error]:', err.message);
  }
});

// ⭐ LIGHTWEIGHT CLIENT CONNECTION HANDLER
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Immediately provide current vehicle coordinates so page loads without waiting for next tick
  if (latestVehicleData.length > 0) {
    socket.emit("vehicleLocation", latestVehicleData);
  }

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(port, '0.0.0.0', () =>
  console.log(`Server listening on ${port}`)
);

module.exports = app;