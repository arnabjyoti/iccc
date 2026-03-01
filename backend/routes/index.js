const { sendMail, tripLogController} = require('../controllers');

const AuthController = require('../controllers').AuthController;
const BusController = require('../controllers').busController;

//Api's
module.exports = (app) => {
	app.get('/api', (req, res) =>
		res.status(200).send({
			message: 'Welcome'
		})
	);

	app.post('/api/authenticate', AuthController.authenticate);

	app.post('/api/verifyEmail', AuthController.verifyEmail);
	app.post('/api/createBus', BusController.createBus);
	app.post('/api/updateBus', BusController.updateBus);
	app.post('/api/deleteBus', BusController.deleteBus);
	app.post('/api/createBusRoutes', BusController.createBusRoutes);
	app.post('/api/updateBusRoutes', BusController.updateBusRoutes);
	app.post('/api/deleteBusRoutes', BusController.deleteBusRoutes);
	app.get('/api/getRouteSuggestions', BusController.getRouteSuggestions);
	app.get('/api/getBusRoutes', BusController.getBusRoutes);
	app.post('/api/saveDailyUpdates', BusController.saveDailyUpdates);
	app.get('/api/getBusList', BusController.getBusList);
	app.post('/api/getBusData', BusController.getBusData);
	app.post('/api/getDailyUpdates', BusController.getDailyUpdates);
	app.post('/api/updateDailyUpdates', BusController.updateDailyUpdates);
	app.post('/api/getOneTripDetails', BusController.getOneTripDetails);
	app.post('/api/deleteEarningDetails', BusController.deleteEarningDetails);


	app.post('/api/saveDriver', BusController.upload_driver_image.single("photo"), BusController.saveDriver);
	app.post('/api/updateDriver', BusController.upload_driver_image.single("photo"), BusController.updateDriver);
	app.post('/api/deleteDriver', BusController.deleteDriver);
	app.post('/api/saveConductor', BusController.upload_conductor_image.single("photo"), BusController.saveConductor);
	app.post('/api/updateConductor', BusController.upload_conductor_image.single('photo'), BusController.updateConductor);
	app.post('/api/deleteConductor', BusController.deleteConductor);
	app.post('/api/blockConductor', BusController.blockConductor);
	app.get('/api/getDriver', BusController.getDriver);
	app.get('/api/getConductorWithAllotment', BusController.getConductorWithAllotment);
	app.get('/api/getConductor', BusController.getConductor);
	app.get('/api/getConductorAttendance', BusController.getConductorAttendance);
	app.get('/api/getAmountToBePaidByConductor', BusController.getAmountToBePaidByConductor);

	app.post('/api/sendOtp', sendMail.sendOtp);


	app.post('/api/getFilteredTripLogs', tripLogController.getFilteredTripLogs);

	app.post('/api/createTripLog', tripLogController.createTripLog);


	//home dashboard
	app.get('/api/getDashboardCounts', BusController.getDashboardCounts);

	// Breakdown Table
	app.post('/api/fetchBreakdownTable', BusController.fetchBreakdownTable);

	//current time
	app.get('/api/getCurrentISTTime', BusController.getCurrentISTTime);


	};