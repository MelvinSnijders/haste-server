
const express = require("express");
const ViteExpress = require("vite-express");
const winston = require("winston");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const DocumentHandler = require('./lib/document_handler');

// Load the configuration and set some defaults
const configPath = process.argv.length <= 2 ? "config.json" : process.argv[2];
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
config.port = process.env.PORT || config.port || 7777;
config.host = process.env.HOST || config.host || "localhost";

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
});

// Set up the logger
if (config.logging) {
  let detail, type;
  for (let i = 0; i < config.logging.length; i++) {
    detail = config.logging[i];
    type = detail.type;
    delete detail.type;
    logger.add(new winston.transports[type](detail));
  }
}

// build the store from the config on-demand - so that we don't load it
// for statics
if (!config.storage) {
  config.storage = { type: "file" };
}
if (!config.storage.type) {
  config.storage.type = "file";
}

let Store, preferredStore;

if (process.env.REDISTOGO_URL && config.storage.type === "redis") {
  var redisClient = require("redis-url").connect(process.env.REDISTOGO_URL);
  Store = require("./lib/document_stores/redis");
  preferredStore = new Store(config.storage, redisClient);
} else {
  Store = require("./lib/document_stores/" + config.storage.type);
  preferredStore = new Store(config.storage);
}

// Send the static documents into the preferred store, skipping expirations
var path, data;
for (var name in config.documents) {
  path = config.documents[name];
  data = fs.readFileSync(path, "utf8");
  logger.info("loading static document", { name: name, path: path });
  if (data) {
    preferredStore.set(
      name,
      data,
      function (cb) {
        logger.debug("loaded static document", { success: cb });
      },
      true
    );
  } else {
    logger.warn("failed to load static document", { name: name, path: path });
  }
}

// Pick up a key generator
var pwOptions = config.keyGenerator || {};
pwOptions.type = pwOptions.type || "random";
var gen = require("./lib/key_generators/" + pwOptions.type + '.js');
var keyGenerator = new gen(pwOptions);

// Configure the document handler
var documentHandler = new DocumentHandler({
  store: preferredStore,
  maxLength: config.maxLength,
  keyLength: config.keyLength,
  keyGenerator: keyGenerator,
  logger: logger,
});

// Setup Express
const app = express();

// Rate limit all requests
if (config.rateLimits) {
  const limiter = rateLimit(config.rateLimits);
  app.use(limiter);
}

// get raw documents - support getting with extension
app.get("/raw/:id", function (request, response) {
  return documentHandler.handleRawGet(request, response, config);
});

app.head("/raw/:id", function (request, response) {
  return documentHandler.handleRawGet(request, response, config);
});

// add documents

app.post("/documents", function (request, response) {
  return documentHandler.handlePost(request, response);
});

// get documents
app.get("/documents/:id", function (request, response) {
  return documentHandler.handleGet(request, response, config);
});

app.head("/documents/:id", function (request, response) {
  return documentHandler.handleGet(request, response, config);
});

const server = app.listen(config.port, config.host, () => {
  logger.info("listening on " + config.host + ":" + config.port);
});

ViteExpress.bind(app, server);
