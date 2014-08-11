"use strict";

/**
 * Global variable containing the query we'd like to pass to Flickr. In this
 * case, kittens!
 *
 * @type {string}
 */
var QUERY = 'kittens';

var kittenGenerator = {
  /**
   * Flickr URL that will give us lots and lots of whatever we're looking for.
   *
   * See http://www.flickr.com/services/api/flickr.photos.search.html for
   * details about the construction of this URL.
   *
   * @type {string}
   * @private
   */
  searchOnFlickr_: 'https://secure.flickr.com/services/rest/?' +
      'method=flickr.photos.search&' +
      'api_key=90485e931f687a9b9c2a66bf58a3861a&' +
      'text=' + encodeURIComponent(QUERY) + '&' +
      'safe_search=1&' +
      'content_type=1&' +
      'sort=interestingness-desc&' +
      'per_page=20',

  /**
   * Sends an XHR GET request to grab photos of lots and lots of kittens. The
   * XHR's 'onload' event is hooks up to the 'showPhotos_' method.
   *
   * @public
   */
  requestKittens: function() {
    var req = new XMLHttpRequest();
    req.open("GET", this.searchOnFlickr_, true);
    req.onload = this.showPhotos_.bind(this);
    req.send(null);
  },

  /**
   * Handle the 'onload' event of our kitten XHR request, generated in
   * 'requestKittens', by generating 'img' elements, and stuffing them into
   * the document for display.
   *
   * @param {ProgressEvent} e The XHR ProgressEvent.
   * @private
   */
  showPhotos_: function (e) {
    var kittens = e.target.responseXML.querySelectorAll('photo');
    for (var i = 0; i < kittens.length; i++) {
      var img = document.createElement('img');
      img.src = this.constructKittenURL_(kittens[i]);
      img.setAttribute('alt', kittens[i].getAttribute('title'));
      document.body.appendChild(img);
    }
  },

  /**
   * Given a photo, construct a URL using the method outlined at
   * http://www.flickr.com/services/api/misc.urlKittenl
   *
   * @param {DOMElement} A kitten.
   * @return {string} The kitten's URL.
   * @private
   */
  constructKittenURL_: function (photo) {
    return "http://farm" + photo.getAttribute("farm") +
        ".static.flickr.com/" + photo.getAttribute("server") +
        "/" + photo.getAttribute("id") +
        "_" + photo.getAttribute("secret") +
        "_s.jpg";
  }
};

var handleLoad = function(e) {
  var documentBuffer = document.createElement('body');
  documentBuffer.innerHTML = e.target.responseText;

  var image = document.evaluate('//img[@id][@style]', documentBuffer, null, 9, null).singleNodeValue;
  if (!image) return;

  console.log( 'found source ' + image.getAttribute('src') );
  //chrome.downloads.download({ url: image.getAttribute('src') });
};

/* Update the relevant fields with the new data */
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
    thumb.onclick = function() {
	  var sibling = this.parentNode.parentNode.firstChild.firstChild;
	  sibling.checked = !sibling.checked;
    }
    var col1 = document.createElement('td');
	col1.appendChild(thumb);

    var row = document.createElement('tr');
    row.appendChild(col0);
    row.appendChild(col1);
    thumbsTable.appendChild(row);
  }

  var request = new XMLHttpRequest();
  request.open('GET', domInfo[10].url, true);
  request.onload = handleLoad;
  request.send(null);
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