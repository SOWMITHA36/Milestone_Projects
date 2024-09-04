const express = require("express");
const http = require("http");
const cors = require("cors");
const { port, env } = require("./src/config/env");
const router = require("./src/routes/index");
const cron = require("cron");
const configs = require("./src/services/sync.service");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cors());



app.set("port", port);


app.use("/", router);

app.use('*', function (req, res) {
	res.status(404).send("Hello, Page not found!");
});
function initialize() {
	try {

		new cron.CronJob('*/2 * * * *', configs.postConfig, null, true, 'America/New_York');

	} catch (error) {
		console.error('Error during initialization:', error);
	}
}
initialize();
const server = http.createServer(app);
server.listen(app.get("port"));
server.on("error", (err) => {
	console.log(err.message);
});

server.on("listening", () => {
	console.log(`Middleware is running || PORT: ${server.address().port}, ENV: ${env}`);
});
