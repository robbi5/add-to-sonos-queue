Add to Sonos Queue
==================

Chrome Extension that adds the ability to add tracks and playlists from SoundCloud straight to your Sonos queue.

[![Flattr this git repo](https://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?user_id=robbi5&url=https%3A%2F%2Fgithub.com%2Frobbi5%2Fadd-to-sonos-queue)

![Screenshot](https://raw.githubusercontent.com/robbi5/add-to-sonos-queue/master/screenshots/track-1.0.0.jpg)

Download
--------
Get it from the Chrome Web Store:


[![Available in the Chrome Web Store](https://developer.chrome.com/webstore/images/ChromeWebStore_BadgeWBorder_v2_206x58.png)](https://chrome.google.com/webstore/detail/add-to-sonos-queue/mjlgdiclanhcloangjbhpmoagbhmjlgc)

Permissions
-----------
* `https://api.soundcloud.com/*` - connection to the soundcloud api to get track information
* `http://*/MediaRenderer/AVTransport/Control` - needed for sending the soundcloud track to your sonos
* `http://*/xml/device_description.xml` - needed to test if the entered player ip is a sonos device
* `declarativeContent` - triggers the visibility of the button only on soundcloud.com
* `activeTab` - reads the soundcloud track url if the button was clicked

Ideas
-----
* Add support for different rooms/zones
* Autodiscovery (chrome.sockets.udp must be first available to extensions)

Development
-----------
Install [node.js](http://nodejs.org/) and [browserify](http://browserify.org/).

Install [Grunt](http://gruntjs.com/) and plugins with `npm install`.

Change things in `src`, use `grunt` to compile and copy to `dist/`.

Use the [Chrome Apps & Extensions Developer Tool](https://chrome.google.com/webstore/detail/chrome-apps-extensions-de/ohmmkhmmmpcnpikjeljgnaoabkaalbgc) to load `dist/` as unpacked extension.

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