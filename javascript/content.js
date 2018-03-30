'use strict';

/* Immediately send a message to the background. */
chrome.runtime.sendMessage({
  from: 'content',
  subject: 'showPageAction'
});

/**
 * Listen for messages from the popup. Upon getting a message, search the DOM
 * for hyperlinks, and respond with urls.
 */
chrome.runtime.onMessage.addListener(function(message, sender, response) {
  if ( (message.from === 'popup') && (message.subject === 'DOMInfo') ) {
    var domInfo = [];
    var images = document.getElementsByTagName('img');
    for (var i = 0; i < images.length; i++) {
      var url = images[i].parentNode.getAttribute('href');
      var src;

      if (images[i].getAttribute('data-url')) {
        src = images[i].getAttribute('data-url');
      } else if (images[i].getAttribute('src')) {
        src = images[i].getAttribute('src');
      } else {
        console.warn('Unable to find thumbnail')
      }

      if ( url && (url.indexOf('http') >= 0) ) {
        domInfo.push({
          url: url,
          src: src
        });
      }
    }
    response(domInfo);
  }
});
