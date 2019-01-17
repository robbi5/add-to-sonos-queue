var MutationSummary = require('mutation-summary').MutationSummary;

function addButton(functions) {
  var el = functions, id = -1;
  try {
    do {
      if (el === el.parentElement || el === document.documentElement) {
        break;
      }
      el = el.parentElement;
      // check dataset
      if (typeof el.dataset !== "undefined" && typeof el.dataset.id !== "undefined") {
        id = el.dataset.id;
        break;
      }
      // check classes
      el.classList.forEach((className) => {
        if (className.startsWith('track_')) {
          id = className.replace(/^track_/, '').trim();
        }
      });
      if (id !== -1) {
        break;
      }
    } while(true);

    if (id === -1) {
      console.warn('add-to-sonos: cannot find id for functions:', functions);
      return;
    }
  } catch(e) {
    console.warn('add-to-sonos: cannot get id for functions:', functions, e);
    return;
  }

  el.classList.add('ats-found');

  addButtonToSound(functions, id);
}

function addButtonToSound(functions, id) {
  var addToButton = functions.querySelector('div.dropdown');

  var addToSonosButton = createButton(addToButton, id);

  var fragment = document.createDocumentFragment();
  fragment.appendChild(document.createTextNode(" "));
  fragment.appendChild(addToSonosButton);
  fragment.appendChild(document.createTextNode(" "));

  addToButton.parentElement.insertBefore(fragment, addToButton.nextSibling);
}

function lightOrDark(color) {
  var r, g, b, hsp;

  if (color.match(/^rgb/)) {
    // If HEX --> store the red, green, blue values in separate variables
    color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);

    r = color[1];
    g = color[2];
    b = color[3];
  } else {
    // If RGB --> Convert it to HEX: http://gist.github.com/983661
    color = +("0x" + color.slice(1).replace(color.length < 5 && /./g, '$&$&'));

    r = color >> 16;
    g = color >> 8 & 255;
    b = color & 255;
  }

  // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
  hsp = Math.sqrt(
    0.299 * (r * r) +
    0.587 * (g * g) +
    0.114 * (b * b)
  );

  if (hsp > 127.5) {
    return 'light';
  } else {
    return 'dark';
  }
}

function createButton(prevButton, id) {
  var otherButton = prevButton.previousElementSibling;
  var lod = '';

  try {
    var col = window.getComputedStyle(otherButton).getPropertyValue("color");
    lod = lightOrDark(col);
  } catch(e) {}
  if (lod === '') {
    lod = 'dark';
  }

  var addToSonosButton = document.createElement(otherButton.nodeName);
  addToSonosButton.className = otherButton.className.replace(/(\S+)_fct/, '') + ' ats-button ats-button-' + lod;
  addToSonosButton.tabIndex = 0;
  addToSonosButton.title = 'Add to Sonos';
  addToSonosButton.innerHTML = 'Add to Sonos';

  addToSonosButton.addEventListener('click', function(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    addToSonosButton.classList.remove('ats-success');
    addToSonosButton.classList.remove('ats-failure');
    addToSonosButton.classList.add('ats-loading');

    chrome.runtime.sendMessage({action: 'addToPlaylist', provider: 'ht', id: id}, function(response) {
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

function handleFunctionButtonChanges(summaries) {
  var summary = summaries[0];
  summary.added.forEach(addButton);
}

// triggers on new functions
var observer = new MutationSummary({
  callback: handleFunctionButtonChanges,
  queries: [{ element: 'div.functions' }]
});

// handle already existing functions
[].forEach.call(document.querySelectorAll('div.functions'), addButton);