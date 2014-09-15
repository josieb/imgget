'use strict';

/* Listen for messages from the content. */
chrome.runtime.onMessage.addListener(function(message, sender) {
  if ( (message.from === 'content') && (message.subject === 'showPageAction') ) {
    chrome.pageAction.show(sender.tab.id);
  }
});
