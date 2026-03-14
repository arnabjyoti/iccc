const AuthController = require('./AuthController');
const sendMail = require('./sendMail');
const driverController = require('./driverController');
const operatorController = require('./operatorController');
const vehicleController = require('./vehicleController');
const vehicleRoutesController = require('./vehicleRoutesController');
module.exports = {
	AuthController,
	sendMail,
	driverController,
	operatorController,
	vehicleController,
	vehicleRoutesController
};
