var MutationSummary = require('mutation-summary').MutationSummary;

function addButton(soundActions) {
  var url;
  try {
    var wrap = soundActions.parentElement;
    // different containers:
    if (wrap.classList.contains('sound__soundActions')) { /* STREAM */
      var soundEl = soundActions.parentElement.parentElement.parentElement;
      if (soundEl.parentElement.classList.contains('single')) { /* VISUAL PAGE */
        url = location.href;
      } else {
        url = soundEl.querySelector('a.soundTitle__title').href;
      }
    } else if (wrap.classList.contains('listenEngagement__actions') || soundActions.classList.contains('listenEngagement__actions')) { /* PAGE */
      url = location.href;
    } else if (wrap.classList.contains('soundBadge__actions')) { /* SIDEBAR */
      var soundBadgeEl = soundActions.parentElement.parentElement.parentElement.parentElement;
      url = soundBadgeEl.querySelector('a.soundTitle__title').href;
    } else if (wrap.classList.contains('trackItem__actions')) { /* SET */
      var trackItem = soundActions.parentElement.parentElement.parentElement;
      url = trackItem.querySelector('a.trackItem__trackTitle').href;
    } else {
      console.warn('add-to-sonos: cannot find container for soundActions:', soundActions);
      return;
    }
  } catch(e) {
    console.warn('add-to-sonos: cannot get url for soundActions:', soundActions, e);
    return;
  }

  if (soundActions.querySelector('.sc-button-addtoset') !== null) {
    addButtonToSound(soundActions, url);
  } else {
    addButtonToPlaylist(soundActions, url);
  }
}

function addButtonToPlaylist(soundActions, url) {
  var repostButton = soundActions.querySelector('.sc-button-repost');
  if (typeof repostButton === 'undefined' || repostButton === null) {
    console.warn('repost playlist button not found', soundActions);
    return;
  }

  var addToSonosButton = createButton(repostButton, url);
  repostButton.parentElement.insertBefore(addToSonosButton, repostButton.nextSibling);
}

function addButtonToSound(soundActions, url) {
  var addToSetButton = soundActions.querySelector('.sc-button-addtoset');
  addToSetButton.classList.add('ats-collapse');

  var addToSonosButton = createButton(addToSetButton, url);
  addToSetButton.parentElement.insertBefore(addToSonosButton, addToSetButton.nextSibling);
}

function createButton(prevButton, url) {
  var prevClasses = prevButton.className.replace(/sc-button-(addtoset|repost)/g, '');
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
  queries: [{ element: 'div.soundActions' }]
});

// handle already existing soundActions
[].forEach.call(document.querySelectorAll('div.soundActions'), addButton);