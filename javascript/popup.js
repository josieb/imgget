"use strict";

/**
 * @type {hashmap}
 * @public
 */
var thumbChecks = {};

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

  var image = document.evaluate('//img[@id][@style]', documentBuffer, null, 9, null).singleNodeValue;
  var src = (image ? image.getAttribute('src') : null);

  if ( !image || !src ) {
    image = documentBuffer.querySelectorAll('#img')[0];
    src = (image ? image.src : null);
  }

  if ( !image || !src ) {
    image = documentBuffer.querySelectorAll('#thepic')[0];
    src = (image ? image.src : null);
  }

  if (!src) return;
  if ( src.indexOf('chrome-extension') >= 0 ) {
    var baseURL = e.target.responseURL.match(/^.+?[^\/:](?=[?\/]|$)/);
    src = src.replace(/chrome-extension:\/\/.*\/views\//, '')
    src = baseURL + '/' + src;
  }

  chrome.downloads.download({url: src});
};

/**
 * Update the relevant fields with the new data.
 *
 * @param {hashmap} domInfo
 * @public
 */
var handleDOMInfo = function(domInfo) {
  var thumbsTable = document.getElementById('thumbs');
  while (thumbsTable.children.length > 1) {
    thumbsTable.removeChild(thumbsTable.children[thumbsTable.children.length - 1])
  }

  for (var i = 0; i < domInfo.length; i++) {
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    var col0 = document.createElement('td');
    col0.appendChild(checkbox);

	var thumb = document.createElement('img');
	thumb.src = domInfo[i].src;
    thumb.alt = domInfo[i].url;
    thumb.onclick = function() {
	  var sibling = this.parentNode.parentNode.firstChild.firstChild;
	  sibling.checked = !sibling.checked;
	  thumbChecks[this.src]['download'] = sibling.checked;
    }
    var col1 = document.createElement('td');
	col1.appendChild(thumb);

    var row = document.createElement('tr');
    row.appendChild(col0);
    row.appendChild(col1);
    thumbsTable.appendChild(row);

	thumbChecks[domInfo[i].src] = {};
    thumbChecks[domInfo[i].src]['download'] = true;
    thumbChecks[domInfo[i].src]['url'] = domInfo[i].url;
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

window.onload = function() {
  document.getElementById('download').onclick = function() {
    for (var i in thumbChecks) {
	  if (thumbChecks[i]['download']) {
        var request = new XMLHttpRequest();
        request.open('GET', thumbChecks[i]['url'], true);
        request.onload = handleLoad;
        request.send(null);
	  }
	}
  };

  document.getElementById('select-all').onclick = function() {
    var inputs = document.getElementsByTagName('input');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = true;
	  var sibling = inputs[i].parentNode.parentNode.lastChild.lastChild;
      console.log(sibling.src);
	  thumbChecks[sibling.src]['download'] = true;
    }
  };

  document.getElementById('select-none').onclick = function() {
    var inputs = document.getElementsByTagName('input');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
	  var sibling = inputs[i].parentNode.parentNode.lastChild.lastChild;
      console.log(sibling.src);
	  thumbChecks[sibling.src]['download'] = false;
    }
  };
};