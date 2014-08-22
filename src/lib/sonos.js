// From: https://github.com/bencevans/node-sonos/blob/9448b7744a08d772bbb7ea4534979809a0a4ba64/lib/sonos.js
// Changed:
// * using browser-request
// * added 5 second timeout
// * removed unused functions
// * queue added (queueNext simply sets the url, queue uses the current queue)

/**
 * Constants
 */

var TRANSPORT_ENDPOINT = '/MediaRenderer/AVTransport/Control';

/**
 * Dependencies
 */

var request = require('browser-request'),
    xml2js = require('xml2js'),
    debug = require('debug')('sonos');

/**
 * Helpers
 */

/**
 * Wrap in UPnP Envelope
 * @param  {String} body
 * @return {String}
 */
var withinEnvelope = function(body) {
  return ['<?xml version="1.0" encoding="utf-8"?>',
  '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">',
  '  <s:Body>' + body + '</s:Body>',
  '</s:Envelope>'].join('');
};

/**
 * Encodes characters not allowed within html/xml tags
 * @param  {String} body
 * @return {String}
 */
var htmlEntities = function (str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

/**
 * Sonos "Class"
 * @param {String} host IP/DNS
 * @param {Number} port
 */
var Sonos = function Sonos(host, port) {
  this.host = host;
  this.port = port || 1400;
};

/**
 * UPnP HTTP Request
 * @param  {String}   endpoint    HTTP Path
 * @param  {String}   action      UPnP Call/Function/Action
 * @param  {String}   body
 * @param  {String}   responseTag Expected Response Container XML Tag
 * @param  {Function} callback    (err, data)
 */
Sonos.prototype.request = function(endpoint, action, body, responseTag, callback) {
  debug('Sonos.request(%j, %j, %j, %j, %j)', endpoint, action, body, responseTag, callback);
  request({
    uri: 'http://' + this.host + ':' + this.port + endpoint,
    method: 'POST',
    headers: {
      'SOAPAction': action,
      'Content-type': 'text/xml; charset=utf8'
    },
    body: withinEnvelope(body),
    timeout: 5 * 1000
  }, function(err, res, body) {
    if (err) return callback(err);
    if (res.statusCode !== 200) return callback (new Error('HTTP response code ' + res.statusCode + ' for ' + action));

    (new xml2js.Parser()).parseString(body, function(err, json) {
      if (err) return callback(err);

      if(typeof json['s:Envelope']['s:Body'][0]['s:Fault'] !== 'undefined')
        return callback(json['s:Envelope']['s:Body'][0]['s:Fault']);

      return callback(null, json['s:Envelope']['s:Body'][0][responseTag]);
    });
  });
};


/**
 * Resumes Queue or Plays Provided URI
 * @param  {String|Object}   uri      Optional - URI to a Audio Stream or Object with play options
 * @param  {Function} callback (err, playing)
 */
Sonos.prototype.play = function(uri, callback) {
  debug('Sonos.play(%j, %j)', uri, callback);
  var action, body, self = this;

  var cb = (typeof uri === 'function' ? uri : callback) || function() {};
  var options = (typeof uri === 'object' ? uri : {});
  if (typeof uri === 'object') {
    options.uri = uri.uri;
    options.metadata = uri.metadata;
  } else {
    options.uri = (typeof uri === 'string' ? uri : undefined);
  }

  if (options.uri) {

    return this.queueNext({
      uri: options.uri,
      metadata: options.metadata
    }, function(err) {
      if (err) {
        return cb(err);
      }
      return self.play(cb);
    });
  } else {

    action = '"urn:schemas-upnp-org:service:AVTransport:1#Play"';
    body = '<u:Play xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID><Speed>1</Speed></u:Play>';
    return this.request(TRANSPORT_ENDPOINT, action, body, 'u:PlayResponse', function(err, data) {
      if (err) return cb(err);

      if (data[0].$['xmlns:u'] === 'urn:schemas-upnp-org:service:AVTransport:1') {
        return cb(null, true);
      } else {
        return cb(new Error({
          err: err,
          data: data
        }), false);
      }
    });
  }
};

/**
 * Queue a Song Next
 * @param  {String|Object}   uri      URI to Audio Stream or Object containing options (uri, metadata)
 * @param  {Function} callback (err, queued)
 */
Sonos.prototype.queueNext = function(uri, callback) {
  debug('Sonos.queueNext(%j, %j)', uri, callback);

  var options = (typeof uri === 'object' ? uri : { metadata: '' });
  if (typeof uri === 'object') {
    options.metadata = uri.metadata || '';
    options.metadata = htmlEntities(options.metadata);
    options.uri = uri.uri;
  } else {
    options.uri = uri;
  }

  var action = '"urn:schemas-upnp-org:service:AVTransport:1#SetAVTransportURI"';
  var body = '<u:SetAVTransportURI xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID><CurrentURI>' + options.uri + '</CurrentURI><CurrentURIMetaData>' + options.metadata + '</CurrentURIMetaData></u:SetAVTransportURI>';
  this.request(TRANSPORT_ENDPOINT, action, body, 'u:SetAVTransportURIResponse', function(err, data) {
    if (callback) {
      return callback(err, data);
    } else {
      return null;
    }
  });
};

/**
 * Queue a Song
 * @param  {String|Object}   uri      URI to Audio Stream or Object containing options (uri, metadata)
 * @param  {Function} callback (err, queued)
 */
Sonos.prototype.queue = function(uri, callback) {
  debug('Sonos.queue(%j, %j)', uri, callback);

  var options = (typeof uri === 'object' ? uri : { metadata: '' });
  if (typeof uri === 'object') {
    options.metadata = uri.metadata || '';
    options.metadata = htmlEntities(options.metadata);
    options.uri = uri.uri;
  } else {
    options.uri = uri;
  }

  var action = '"urn:schemas-upnp-org:service:AVTransport:1#AddURIToQueue"';
  var body = '<u:AddURIToQueue xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID><EnqueuedURI>' + options.uri + '</EnqueuedURI><EnqueuedURIMetaData>' + options.metadata + '</EnqueuedURIMetaData><DesiredFirstTrackNumberEnqueued>0</DesiredFirstTrackNumberEnqueued><EnqueueAsNext>1</EnqueueAsNext></u:AddURIToQueue>';
  this.request(TRANSPORT_ENDPOINT, action, body, 'u:AddURIToQueueResponse', function(err, data) {
    if (callback) {
      return callback(err, data);
    } else {
      return null;
    }
  });
};

/**
 * Export
 */

module.exports.Sonos = Sonos;