var MutationSummary = require('mutation-summary').MutationSummary;

function addButton(soundActions) {
  var url;
  try {
    url = decodeURIComponent(location.search.match(/url=([^&]+)&/)[1]);
    // different widgets:
    if (document.querySelector('.singleSound')) { // SINGLE
      // all okay
    } else if (document.querySelector('.multiSounds')) { /* PLAYLIST */
      // FIXME
      console.warn('add-to-sonos: playlist widget is not yet supported');
      return;
    } else {
      console.warn('add-to-sonos: cannot find container for soundActions:', soundActions);
      return;
    }
  } catch(e) {
    console.warn('add-to-sonos: cannot get url for soundActions:', soundActions, e);
    return;
  }

  var wrap = soundActions.querySelector('.sc-button-group');
  var otherButton = wrap.children[0];
  var addToSonosButton = createButton(otherButton, url);
  wrap.insertBefore(addToSonosButton, otherButton);
}

function createButton(prevButton, url) {
  var prevClasses = prevButton.className.replace(/sc-button-(buy|share|like|download)/g, '');
  var addToSonosButton = document.createElement('button');
  addToSonosButton.className = prevClasses + ' ats-button ats-collapse';
  addToSonosButton.tabIndex = 0;
  addToSonosButton.title = 'Add to Sonos';
  addToSonosButton.innerHTML = 'Add to Sonos';

  addToSonosButton.addEventListener('click', function(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    addToSonosButton.classList.remove('ats-success');
    addToSonosButton.classList.remove('ats-failure');
    addToSonosButton.classList.add('ats-loading');

    chrome.runtime.sendMessage({action: 'addToPlaylist', provider: 'sc', url: url}, function(response) {
      addToSonosButton.classList.remove('ats-loading');
      if (response.success) {
        addToSonosButton.classList.add('ats-success');
      } else {
        addToSonosButton.classList.add('ats-failure');
        if (response.setup) {
          chrome.runtime.sendMessage({action: 'openSettings'});
        }
      }
    });
  }, false);

  return addToSonosButton;
}

function handleSoundActionsChanges(summaries) {
  var soundActionsSummary = summaries[0];
  soundActionsSummary.added.forEach(addButton);
}

// triggers on new soundActions
var observer = new MutationSummary({
  callback: handleSoundActionsChanges,
  queries: [{ element: 'div.soundHeader__actions' }]
});

// handle already existing soundActions
[].forEach.call(document.querySelectorAll('div.soundHeader__actions'), addButton);