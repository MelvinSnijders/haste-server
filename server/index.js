import express from "express";
import ViteExpress from "vite-express";
import winston from "winston";
import fs from "fs";

// Load the configuration and set some defaults
const configPath = process.argv.length <= 2 ? 'config.json' : process.argv[2];
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.port = process.env.PORT || config.port || 7777;
config.host = process.env.HOST || config.host || "localhost";

// Set up the logger
if(config.logging) {
    try {
        winston.remove(winston.transports.Console);
    } catch(e) {
        /* was not present */
    }

    let detail, type;
    for(let i = 0; i < config.logging.length; i++) {
        detail = config.logging[i];
        type = detail.type;
        delete detail.type;
        winston.add(new winston.transports[type], detail);
    }
}

winston.info(`Starting server on ${config.host}:${config.port}`);

const app = express();

const server = app.listen(config.port, config.host, () => {
    console.log(`Server is listening on ${config.host}:${config.port}`);
});

ViteExpress.bind(app, server);