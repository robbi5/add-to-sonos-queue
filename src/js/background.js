'use strict';

chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: 'soundcloud.com' },
          })
        ],
        actions: [ new chrome.declarativeContent.ShowPageAction() ]
      }
    ]);
  });
});

var Q = require('Q');
var request = require('browser-request');
var Sonos = require('sonos').Sonos;

var SC_CLIENT_ID = '23e4216436888333b85bec82a5e7c075';
var SONOS_DEVICE = null;


var SETTINGS_URL = (function() {
  // only Chrome >= 40 supports new optionsV2
  try {
    var ver = parseInt(navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
    if (ver >= 40) {
      return 'chrome://extensions?options=' + chrome.runtime.id;
    } else {
      return chrome.runtime.getURL('/settings/settings.html');
    }
  } catch(e) {
    return chrome.runtime.getURL('/settings/settings.html');
  }
})();

function loadSonosDevice() {
  return Q.Promise(function(resolve, reject, notify) {
    chrome.storage.sync.get({
      player_ip: ''
    }, function(items) {
      if (items.player_ip === '') {
        return reject(new Error("Please set your sonos ip in the settings"));
      }
      SONOS_DEVICE = new Sonos(items.player_ip);
      resolve(SONOS_DEVICE);
    });
  });
}

function getUrlDetails(url, callback) {
  var apiurl;
  if (url.indexOf('//api.soundcloud.com/') !== -1) {
    apiurl = url + (url.indexOf('?') !== -1 ? '&' : '?') + 'client_id=' + SC_CLIENT_ID;
  } else {
    apiurl = 'https://api.soundcloud.com/resolve.json?url=' + encodeURIComponent(url) + '&client_id=' + SC_CLIENT_ID;
  }
  request({
    uri: apiurl,
    json: true,
    timeout: 10 * 1000
  }, function(err, res, data) {
    if (err) { return callback({error: true}); }
    if (res.statusCode !== 200) { return callback({error: true, status: res.statusCode}); }
    return callback({success: true, data: data});
  });
}


var htmlEntities = function(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// requires data.id and data.title
var wrapSoundCloudTrack = function(data) {
  var trackid = data.id;
  var trackuri = 'x-sonos-http:track%3a' + trackid + '.mp3?sid=160&amp;flags=32';

  var title = htmlEntities(data.title);
  var didl = '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">'
           + '<item id="00030020track%3a' + trackid + '" restricted="true">'
             + '<dc:title>' + title + '</dc:title>'
             + '<upnp:class>object.item.audioItem.musicTrack</upnp:class>'
             + '<desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON40967_X_#Svc40967-0-Token</desc>'
           + '</item>'
           + '</DIDL-Lite>';
   return {uri: trackuri, metadata: didl};
};

// requires data.id and data.title
var wrapSoundCloudPlaylist = function(data) {
  var playlistid = data.id;
  var playlisturi = 'x-rincon-cpcontainer:0006006cplaylist%3a' + playlistid;

  var title = htmlEntities(data.title);
  var didl = '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">'
           + '<item id="0006006cplaylist%3a' + playlistid + '" restricted="true">'
             + '<dc:title>' + title + '</dc:title>'
             + '<upnp:class>object.container.playlistContainer</upnp:class>'
             + '<desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON40967_X_#Svc40967-0-Token</desc>'
           + '</item>'
           + '</DIDL-Lite>';

   return {uri: playlisturi, metadata: didl};
};

// wrap Sonos calls in promises:
var addSoundCloudTrackToQueue = function(data) {
  var track = wrapSoundCloudTrack(data);
  return Q.ninvoke(SONOS_DEVICE, 'queue', track);
};

var addMultipleSoundCloudTracksToQueue = function(data) {
  var tracks = data.map(function(track){ return wrapSoundCloudTrack(track); });
  return Q.ninvoke(SONOS_DEVICE, 'queueMultiple', tracks);
};

var addSoundCloudPlaylistToQueue = function(data) {
  var playlist = wrapSoundCloudPlaylist(data);
  return Q.ninvoke(SONOS_DEVICE, 'queue', playlist);
};

var play = function(data, sendResponse) {
  var track = wrapSoundCloudTrack(data);
  Q.ninvoke(SONOS_DEVICE, 'play', track)
   .then(function() { sendResponse({success: true}); })
   .fail(function() { sendResponse({error: true}); });
};

var addUrlToPlaylist = function(url, sendResponse) {
  getUrlDetails(url, function(response) {
    if (response.error) { return sendResponse(response); }
    addToPlaylist(response.data, sendResponse);
  });
};

var addToPlaylist = function(track, sendResponse) {
  if (SONOS_DEVICE === null) {
    return sendResponse({error: true, message: 'Player is not configured.', setup: true});
  }
  var fn = addSoundCloudTrackToQueue;
  if (track.kind == 'playlist') {
    fn = addSoundCloudPlaylistToQueue;
  } else if (track.kind == 'list') {
    fn = addMultipleSoundCloudTracksToQueue;
    track = track.tracks;
  }
  fn(track)
    .then(function() { sendResponse({success: true}); })
    .fail(function() { sendResponse({error: true}); });
};

var openSettings = function(sendResponse) {
  chrome.tabs.create({url: SETTINGS_URL});
  sendResponse && sendResponse({success: true});
};

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (typeof request.action !== "undefined") {
      if (request.action === 'openSettings') {
        openSettings(sendResponse);
      }
      if (request.action === 'getUrlDetails') {
        getUrlDetails(request.url, sendResponse);
      }
      if (request.action === 'play') {
        play(request.track, sendResponse);
      }
      if (request.action === 'addToPlaylist' && typeof request.url !== "undefined") {
        addUrlToPlaylist(request.url, sendResponse);
      }
      if (request.action === 'addToPlaylist' && typeof request.track !== "undefined") {
        addToPlaylist(request.track, sendResponse);
      }
      return true;
    }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (var key in changes) {
    if (key == 'player_ip') {
      loadSonosDevice();
      return;
    }
  }
});

loadSonosDevice();