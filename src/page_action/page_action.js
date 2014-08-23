"use strict";

var request = require('browser-request'),
    Sonos = require('sonos').Sonos;

var SETTINGS_URL = chrome.runtime.getURL("/settings/settings.html"),
    SC_CLIENT_ID = "23e4216436888333b85bec82a5e7c075",
    SONOS_DEVICE = null,
    CURRENT_TRACK = null;

chrome.storage.sync.get({
  player_ip: ''
}, function(items) {
  if (items.player_ip == '') {
    requireSetUp();
    return;
  }
  SONOS_DEVICE  = new Sonos(items.player_ip);
});

var requireSetUp = function() {
  document.getElementById('need_setup_view').classList.add('selected');
};

var gotSoundCloudUrl = function(url) {
  if (SONOS_DEVICE == null) return;
  url = encodeURIComponent(url);
  request({
    uri: "https://api.soundcloud.com/resolve.json?url=" + url + "&client_id=" + SC_CLIENT_ID,
    json: true,
    timeout: 10 * 1000
  }, function(err, res, data) {
    if (err) return failedToLoad();
    if (res.statusCode !== 200) return notATrackPage();
    gotSoundCloudTrack(data);
  });
};

var failure = function(message, displaySettings) {
  var displaySettings = displaySettings || false;
  [].forEach.call(
    document.querySelectorAll('section.selected'),
    function(el) {
      el.classList.remove('selected');
    }
  );
  var failure_view = document.getElementById('sc_failure_view');
  failure_view.classList.add('selected');
  document.getElementById("failure__message").innerText = message;
  if (displaySettings) {
    failure_view.classList.add('has-settings');
  } else {
    failure_view.classList.remove('has-settings');
  }
};

var failedToLoad = function() {
  failure("Failed to load track details");
};

var notATrackPage = function() {
  failure("This doesn't look like a track page");
};

var gotSoundCloudTrack = function(data) {
  if (data.kind != "track") return notATrackPage();
  CURRENT_TRACK = data;

  document.getElementById('single_track_view').classList.add('selected');

  var wrap = document.getElementById("track0");
  wrap.querySelector('.track__art img').src = data.artwork_url;
  wrap.querySelector('.track__username').innerText = data.user.username;
  wrap.querySelector('.track__title').innerText = data.title;
  wrap.querySelector('.soundcloud-logo').href = data.permalink_url;

  if (data.streamable == false) {
    document.getElementById('actions').innerText = 'Sorry, this track has Sonos streaming disabled.';
  }
};

document.getElementById('add_to_queue').addEventListener('click', function(ev) {
  ev.preventDefault();
  if (CURRENT_TRACK == null) return;
  var self = this;
  self.classList.remove('success');
  addSoundCloudTrackToQueue(
    CURRENT_TRACK,
    createErrorFn("add track to queue"),
    function(data) {
      self.classList.add('success');
    }
  );
}, false);

document.getElementById('instaplay').addEventListener('click', function(ev) {
  ev.preventDefault();
  if (CURRENT_TRACK == null) return;
  var self = this;
  self.classList.remove('success');
  play(
    CURRENT_TRACK,
    createErrorFn("play track"),
    function(data) {
      self.classList.add('success');
    }
  );
}, false);

[].forEach.call(
  document.querySelectorAll('[rel="settings"]'),
  function(el) {
    el.addEventListener('click', function(ev) {
      ev.preventDefault();
      window.open(SETTINGS_URL);
    }, false);
  }
);

var createErrorFn = function(action) {
  return function (err) {
    var reason = "Player is not reachable.";
    /* if (typeof err.cors !== "undefined") {
      reason = "Player is not reachable.";
    } else */
    if (typeof err.code !== "undefined") {
      reason = "Player is not reachable. (" + err.code + ")";
    }
    failure("Couldn't " + action + ": " + reason, true);
  };
}

var wrapSoundCloudTrack = function(data) {
  var trackid = data.id;
  var trackurl = "x-sonos-http:track%3a" + trackid + ".mp3?sid=160&amp;flags=32";

  var enc = function(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  var title = enc(data.title);
  var didl = '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">'
           + '<item id="00030020track%3a' + trackid + '" restricted="true">'
             + '<dc:title>' + title + '</dc:title>'
             + '<upnp:class>object.item.audioItem.musicTrack</upnp:class>'
             + '<desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON40967_X_#Svc40967-0-Token</desc>'
           + '</item>'
           + '</DIDL-Lite>';
   return {uri: trackurl, metadata: didl};
};

var addSoundCloudTrackToQueue = function(data, errorCb, successCb) {
  var track = wrapSoundCloudTrack(data);
  SONOS_DEVICE.queue(track, function(err, data) {
    if (err) {
      return errorCb(err);
    }
    return successCb(data);
  });
};

var play = function(data, errorCb, successCb) {
  var track = wrapSoundCloudTrack(data);
  SONOS_DEVICE.play(track, function(err, data) {
    if (err) {
      return errorCb(err);
    }
    return successCb(data);
  });
};

// get current url of page
chrome.tabs.query({active:true, currentWindow:true}, function(tabs) {
  if (tabs[0].url.indexOf('soundcloud.com') > -1) {
    gotSoundCloudUrl(tabs[0].url);
  }
});