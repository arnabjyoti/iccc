const travelApi = require("../utils/travelHistoryApi");

exports.fetchTravelHistory = async (req, res) => {

    try {

        const { imei_nos } = req.body;

        if (!imei_nos || !Array.isArray(imei_nos)) {

            return res.status(400).json({
                status: false,
                message: "imei_nos array is required"
            });
        }

        const data = await travelApi.getTravelHistory(imei_nos);

        return res.status(200).json({
            status: true,
            data: data
        });

    } catch (error) {

        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};