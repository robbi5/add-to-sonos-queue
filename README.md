Add to Sonos Queue
==================

Chrome Extension that adds the ability to add tracks and playlists from SoundCloud straight to your Sonos queue.

![Screenshot](https://raw.githubusercontent.com/robbi5/add-to-sonos-queue/master/screenshots/track-1.0.0.jpg)

Download
--------
Get it from the Chrome Web Store:


[![Available in the Chrome Web Store](https://developer.chrome.com/webstore/images/ChromeWebStore_BadgeWBorder_v2_206x58.png)](https://chrome.google.com/webstore/detail/add-to-sonos-queue/mjlgdiclanhcloangjbhpmoagbhmjlgc)

Permissions
-----------
* `https://api.soundcloud.com/*` - connection to the soundcloud api to get track information
* `http://*/MediaRenderer/AVTransport/Control` - needed for sending the track to your sonos
* `http://*/xml/device_description.xml` - needed to test if the entered player ip is a sonos device
* `declarativeContent` - triggers the visibility of the button only on soundcloud.com
* `activeTab` - reads the track url if the button was clicked

Ideas
-----
* Add support for different rooms/zones
* Autodiscovery (chrome.sockets.udp must be first available to extensions)

Development
-----------
Install [node.js](http://nodejs.org/).

Install [Grunt](http://gruntjs.com/) and plugins with `npm install`.

Change things in `src`, use `grunt` to compile and copy to `dist/`.

Use the Chrome Extension Settings at `chrome://extensions` to load `dist/` as unpacked extension.

Thanks to
---------
[node-sonos](https://github.com/bencevans/node-sonos),
[Browserify](http://browserify.org),
[browser-request](https://github.com/iriscouch/browser-request),
[chrome-bootstrap](https://github.com/roykolak/chrome-bootstrap),
[zepto.js](http://zeptojs.com),
[mutation-summary](https://code.google.com/p/mutation-summary/)

License
-------
MIT