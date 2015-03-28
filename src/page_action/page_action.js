'use strict';

var Q = require('Q');
var request = require('browser-request');
var Sonos = require('sonos').Sonos;

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
var SC_CLIENT_ID = '23e4216436888333b85bec82a5e7c075';
var SONOS_DEVICE = null;
var CURRENT_ITEM = null;

chrome.storage.sync.get({
  player_ip: ''
}, function(items) {
  if (items.player_ip === '') {
    requireSetUp();
    return;
  }
  SONOS_DEVICE  = new Sonos(items.player_ip);
});

var requireSetUp = function() {
  document.getElementById('need_setup_view').classList.add('selected');
};

var gotSoundCloudUrl = function(url) {
  if (SONOS_DEVICE === null) { return; }
  var kind;
  // resolve doesn't know /likes, but it lists tracks if you request /favorites.
  if (url.match(/soundcloud.com\/([^\/]+)\/likes$/)) {
    url = url.replace(/\/likes$/, '/favorites');
    kind = 'list';
  }
  url = encodeURIComponent(url);
  request({
    uri: 'https://api.soundcloud.com/resolve.json?url=' + url + '&client_id=' + SC_CLIENT_ID,
    json: true,
    timeout: 10 * 1000
  }, function(err, res, data) {
    if (err) { return failedToLoad(); }
    if (res.statusCode !== 200) { return notATrackPage(); }
    gotSoundCloudTrack(data, kind);
  });
};

var failure = function(message, displaySettings) {
  displaySettings = displaySettings || false;
  [].forEach.call(
    document.querySelectorAll('section.selected'),
    function(el) {
      el.classList.remove('selected');
    }
  );
  var failure_view = document.getElementById('sc_failure_view');
  failure_view.classList.add('selected');
  document.getElementById('failure__message').innerText = message;
  if (displaySettings) {
    failure_view.classList.add('has-settings');
  } else {
    failure_view.classList.remove('has-settings');
  }
};

var failedToLoad = function() {
  failure('Failed to load track details');
};

var notATrackPage = function() {
  failure('This doesn\'t look like a track page');
};

var gotSoundCloudTrack = function(data, kind) {
  kind = kind || data.kind;
  if (kind != 'track' && kind != 'playlist' && kind != 'list') { return notATrackPage(); }
  if (kind == 'list') {
    data = wrapPureTrackList(data);
  }

  CURRENT_ITEM = data;

  document.getElementById('track_view').classList.add('selected');

  var wrap = document.getElementById('track0');
  if (typeof data.title !== 'undefined') {
    var image_url = data.artwork_url || data.user.avatar_url;
    wrap.querySelector('.track__art img').src = image_url;
    wrap.querySelector('.track__username').innerText = data.user.username;
    wrap.querySelector('.track__title').innerText = data.title;
    wrap.querySelector('.soundcloud-logo').href = data.permalink_url;
  } else {
    wrap.classList.add('hidden');
  }

  if (data.streamable === false) {
    document.getElementById('actions').innerText = 'Sorry, this track has Sonos streaming disabled.';
  }

  if (kind == 'list' || kind == 'playlist') {
    gotSoundCloudPlaylist(data);
  }
};

var wrapPureTrackList = function (data) {
  return {kind: 'list', tracks: data};
};

var gotSoundCloudPlaylist = function(data) {
  // add track list
  document.getElementById('track_view').classList.add('is-playlist');
  var list = document.getElementById('playlist');
  var tpl = list.removeChild(list.querySelector('.compactTrack'));
  data.tracks.forEach(function(track) {
    var el = tpl.cloneNode(true);
    var image_url = track.artwork_url || track.user.avatar_url || data.user.avatar_url;
    el.querySelector('.track__art img').src = image_url;
    el.querySelector('.track__title').innerText = track.title;
    list.appendChild(el);
  });

  // rename button
  document.getElementById('add_to_queue').innerText = 'Add Playlist to Sonos Queue';
  document.getElementById('instaplay').disabled = true;
};

document.getElementById('add_to_queue').addEventListener('click', function(ev) {
  ev.preventDefault();
  if (CURRENT_ITEM === null) { return; }
  var self = this;
  self.classList.remove('success');
  self.classList.add('working');

  var done = function () {
    self.classList.remove('working');
    self.classList.add('success');
  };

  if (CURRENT_ITEM.kind == 'track') {
    addSoundCloudTrackToQueue(CURRENT_ITEM).then(done).fail(createErrorFn('add track to queue'));
  } else if (CURRENT_ITEM.kind == 'list') {
    addMultipleSoundCloudTracksToQueue(CURRENT_ITEM.tracks).then(done).fail(createErrorFn('add tracks to queue'));
  } else {
    addSoundCloudPlaylistToQueue(CURRENT_ITEM).then(done).fail(createErrorFn('add tracks to queue'));
  }
}, false);

document.getElementById('instaplay').addEventListener('click', function(ev) {
  ev.preventDefault();
  if (CURRENT_ITEM === null) { return; }
  var self = this;
  self.classList.remove('success');
  play(CURRENT_ITEM)
    .then(function() {
      self.classList.add('success');
    })
    .fail(createErrorFn('play track'));
}, false);

[].forEach.call(
  document.querySelectorAll('[rel="settings"]'),
  function(el) {
    el.addEventListener('click', function(ev) {
      ev.preventDefault();
      chrome.tabs.create({url: SETTINGS_URL});
    }, false);
  }
);

var createErrorFn = function(action) {
  return function (err) {
    var reason = 'Player is not reachable.';
    if (typeof err.cors !== 'undefined') {
      reason = 'Player is not reachable.';
    } else if (typeof err.code !== 'undefined') {
      reason = 'Player is not reachable. (' + err.code + ')';
    } else if (typeof err.message !== 'undefined') {
      reason = err.message;
    }
    failure('Couldn\'t ' + action + ': ' + reason, true);
  };
};

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

var play = function(data) {
  var track = wrapSoundCloudTrack(data);
  return Q.ninvoke(SONOS_DEVICE, 'play', track);
};

// get current url of page
chrome.tabs.query({active:true, currentWindow:true}, function(tabs) {
  if (tabs[0].url.indexOf('soundcloud.com') > -1) {
    gotSoundCloudUrl(tabs[0].url);
  }
});