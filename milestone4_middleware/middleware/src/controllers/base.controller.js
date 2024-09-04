class BaseController {
    response(res, body = "", statusCode = 200) {
        console.info("Response with status", statusCode);
        res.status(statusCode).send(body);
    }
    redirect(res, url) {
        console.info("redirect with url", url);
        res.redirect(url);
    }
    successResponse(res, message, data={}, statusCode = 200) {
        res.status(statusCode).json({
            response: {
                data,
                message,
                error: false
            }
        });
    }
    errorResponse(res, message, data={}, statusCode = 500) {
        res.status(statusCode).send({
            response: {
                data,
                message,
                error: true
            }
        });
    }
}

module.exports = BaseController;