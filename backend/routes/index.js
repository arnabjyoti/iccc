const { sendMail, tripLogController} = require('../controllers');

const AuthController = require('../controllers').AuthController;

//Api's
module.exports = (app) => {
	app.get('/api', (req, res) =>
		res.status(200).send({
			message: 'Welcome'
		})
	);

	app.post('/api/authenticate', AuthController.authenticate);

	app.post('/api/verifyEmail', AuthController.verifyEmail);

	};