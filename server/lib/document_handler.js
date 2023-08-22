var winston = require('winston');
var Busboy = require('busboy');

// For handling serving stored documents

var DocumentHandler = function(options) {
  if (!options) {
    options = {};
  }
  this.keyLength = options.keyLength || DocumentHandler.defaultKeyLength;
  this.maxLength = options.maxLength; // none by default
  this.store = options.store;
  this.keyGenerator = options.keyGenerator;
  this.logger = options.logger || winston;
};

DocumentHandler.defaultKeyLength = 10;

// Handle retrieving a document
DocumentHandler.prototype.handleGet = function(request, response, config) {
  var _this = this;
  const key = request.params.id.split('.')[0];
  const skipExpire = !!config.documents[key];

  this.store.get(key, function(ret) {
    if (ret) {
      _this.logger.verbose('retrieved document', { key: key });
      response.writeHead(200, { 'content-type': 'application/json' });
      if (request.method === 'HEAD') {
        response.end();
      } else {
        response.end(JSON.stringify({ data: ret, key: key }));
      }
    }
    else {
      _this.logger.warn('document not found', { key: key });
      response.writeHead(404, { 'content-type': 'application/json' });
      if (request.method === 'HEAD') {
        response.end();
      } else {
        response.end(JSON.stringify({ message: 'Document not found.' }));
      }
    }
  }, skipExpire);
};

// Handle retrieving the raw version of a document
DocumentHandler.prototype.handleRawGet = function(request, response, config) {
  var _this = this;
  const key = request.params.id.split('.')[0];
  const skipExpire = !!config.documents[key];

  this.store.get(key, function(ret) {
    if (ret) {
      _this.logger.verbose('retrieved raw document', { key: key });
      response.writeHead(200, { 'content-type': 'text/plain; charset=UTF-8' });
      if (request.method === 'HEAD') {
        response.end();
      } else {
        response.end(ret);
      }
    }
    else {
      _this.logger.warn('raw document not found', { key: key });
      response.writeHead(404, { 'content-type': 'application/json' });
      if (request.method === 'HEAD') {
        response.end();
      } else {
        response.end(JSON.stringify({ message: 'Document not found.' }));
      }
    }
  }, skipExpire);
};

// Handle adding a new Document
DocumentHandler.prototype.handlePost = function (request, response) {
  var _this = this;
  var buffer = '';
  var cancelled = false;

  // What to do when done
  var onSuccess = function () {
    // Check length
    if (_this.maxLength && buffer.length > _this.maxLength) {
      cancelled = true;
      _this.logger.warn('document >maxLength', { maxLength: _this.maxLength });
      response.writeHead(400, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({ message: 'Document exceeds maximum length.' })
      );
      return;
    }
    // And then save if we should
    _this.chooseKey(function (key) {
      _this.store.set(key, buffer, function (res) {
        if (res) {
          _this.logger.verbose('added document', { key: key });
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ key: key }));
        }
        else {
          _this.logger.verbose('error adding document');
          response.writeHead(500, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ message: 'Error adding document.' }));
        }
      });
    });
  };

  // If we should, parse a form to grab the data
  var ct = request.headers['content-type'];
  if (ct && ct.split(';')[0] === 'multipart/form-data') {
    var busboy = new Busboy({ headers: request.headers });
    busboy.on('field', function (fieldname, val) {
      if (fieldname === 'data') {
        buffer = val;
      }
    });
    busboy.on('finish', function () {
      onSuccess();
    });
    request.pipe(busboy);
  // Otherwise, use our own and just grab flat data from POST body
  } else {
    request.on('data', function (data) {
      buffer += data.toString();
    });
    request.on('end', function () {
      if (cancelled) { return; }
      onSuccess();
    });
    request.on('error', function (error) {
      _this.logger.error('connection error: ' + error.message);
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ message: 'Connection error.' }));
      cancelled = true;
    });
  }
};

// Keep choosing keys until one isn't taken
DocumentHandler.prototype.chooseKey = function(callback) {
  var key = this.acceptableKey();
  var _this = this;
  this.store.get(key, function(ret) {
    if (ret) {
      _this.chooseKey(callback);
    } else {
      callback(key);
    }
  }, true); // Don't bump expirations when key searching
};

DocumentHandler.prototype.acceptableKey = function() {
  return this.keyGenerator.createKey(this.keyLength);
};

module.exports = DocumentHandler;
