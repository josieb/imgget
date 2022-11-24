'use strict';

/* Listen for messages from the content. */
chrome.runtime.onMessage.addListener((message, sender) => {
  if ( (message.from === 'content') && (message.subject === 'showAction') ) {
    chrome.action.show(sender.tab.id);
  }
});
