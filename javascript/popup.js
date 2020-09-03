'use strict';

/**
 * @type {hashmap}
 * @public
 */
var thumbChecks = {};

/**
 * @type {array}
 * @public
 */
var imageSelectors = [
  'pic img img-responsive'
];

/**
 * @type {array}
 * @public
 */
var srcSelectors = [
  '#img',
  '#image',
  '#imageid',
  '#image-viewer-container',
  '#thepic',
  'img.image',
  'img.view_photo',
  'img.pic,img.img,img.img-responsive'
];

/**
 * Handle the 'onload' event of our XHR request. The responseText of the event
 * should be an HTML document. Once this is parsed into a DOMElement, we
 * search it for the source of the demanded image, and then download the image.
 *
 * @param {ProgressEvent} e The XHR ProgressEvent.
 * @public
 */
var handleLoad = function(e) {
  var documentBuffer = document.createElement('body');
  documentBuffer.innerHTML = e.target.responseText;

  var src;

  /* Try to find a well-formed image source. */
  var image = document.evaluate('//img[@id][@style]', documentBuffer, null, 9, null).singleNodeValue;

  if (image) {
    if (image.src) {
      src = image.src;
    } else if (image.getAttribute('data-url')) {
      src = image.getAttribute('data-url');
    } else if (image.getAttribute('src')) {
      src = image.getAttribute('src');
    }
  } else {
    try {
      for (var i = 0; i < srcSelectors.length; i++) {
        if (src) break;
        image = documentBuffer.querySelector(srcSelectors[i]);

        if (image) {
          if (image.src !== undefined) {
            src = image.src;
          } else if ( (image.firstChild !== null) && (image.firstChild.src !== undefined) ) {
            src = image.firstChild.src;
          }
        }

        /* Try to get the full-sized image. */
        if (src) {
          src = src.replace(/(\.md\.)|(\.sm\.)/, '.');
        }

        if (src && srcSelectors[i] === '.view_photo') {
          src = src.replace('\/tn-', '\/');
        }
      }

      if (!src) {
        console.warn('Unable to find link');
        return;
      }
    } catch (e) {
      console.warn(e);
      return;
    }
  }

  if ( src.indexOf('chrome-extension') >= 0 ) {
    // The following line of code matches the base URL, however it does not
    // match trailing directories which may be required:
    // var baseURL = e.target.responseURL.match(/^.+?[^\/:](?=[?\/]|$)/);
    var responseURL = e.target.responseURL;
    var splitResponseURL = responseURL.split('/');
    var baseURL = responseURL.replace(splitResponseURL[splitResponseURL.length - 1], '');
    src = src.replace(/chrome-extension:\/\/\w+\/(views\/)?/, '')
    src = baseURL + src;
  }

  console.info('Found source:', src);

  chrome.downloads.download({url: src});
};

/**
 * Update the relevant fields with the new data.
 *
 * @param {hashmap} domInfo
 * @public
 */
var handleDOMInfo = function(domInfo) {
  var thumbsList = document.getElementById('thumbs');
  while (thumbsList.children.length > 1) {
    thumbsList.removeChild(thumbsList.children[thumbsList.children.length - 1])
  }

  for (var i = 0; i < domInfo.length; i++) {
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false;

    var thumb = document.createElement('img');
    thumb.src = domInfo[i].src;
    thumb.url = domInfo[i].url;

    thumb.onclick = function() {
      var sibling = this.previousSibling;
      sibling.checked = !sibling.checked;
      thumbChecks[this.src].download = sibling.checked;
    }

    var listItem = document.createElement('li');
    listItem.appendChild(checkbox);
    listItem.appendChild(thumb);
    thumbsList.appendChild(listItem);

    thumbChecks[ thumb.src ] = {
      'download': false,
      'url': thumb.url
    };
  }
};

/* Once the document's DOM is ready, send a message to the content. */
document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(
      tabs[0].id,
      {from: 'popup', subject: 'DOMInfo'},
      handleDOMInfo);
  });
});

document.addEventListener('click', function() {
  var numSelected = 0;
  for (var id in thumbChecks) {
    if (thumbChecks[id].download) numSelected++;
  }
  document.getElementById('num-selected').innerHTML = 'selected: ' + numSelected;
});

window.onload = function() {
  document.getElementById('download').onclick = function() {
    for (var id in thumbChecks) {
      if (thumbChecks[id].download) {
        var request = new XMLHttpRequest();
        request.open('GET', thumbChecks[id].url, true);
        request.onload = handleLoad;
        request.send(null);
      }
    }
  };

  document.getElementById('select-all').onclick = function() {
    var inputs = document.getElementsByTagName('input');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = true;
      var sibling = inputs[i].nextSibling;
      thumbChecks[sibling.src].download = true;
    }
  };

  document.getElementById('select-none').onclick = function() {
    var inputs = document.getElementsByTagName('input');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
      var sibling = inputs[i].nextSibling;
      thumbChecks[sibling.src].download = false;
    }
  };
};
