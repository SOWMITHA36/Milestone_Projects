const SyncService = require("../services/sync.service");
const BaseController = require("./base.controller.js");
class SyncController extends BaseController {
    constructor() {
        super();
    }
    storeConfigs = async (req, res) => {
        try {
            console.log("Response: ", req.body);
            const { message = null, data = {} } = await SyncService.createConfig(req.body);
            this.successResponse(res, message, data, 201);
            console.log("completed 1")
        } catch (error) {
            console.error(`Error creating inbound configs`, error);
            const { message = null, data = {} } = error;
            return this.errorResponse(res, message, data, 500);
        }
    }
}
module.exports = new SyncController();