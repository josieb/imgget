'use strict';

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
  'img.pic,img.img,img.img-responsive',
  '.centred_resized',
  '.main-image',
  '.FFVAD'
];

var handleLoad = function(e) {
  //var documentBuffer = document.createElement('body');

  var documentBuffer = document.getElementById('sandbox');
  documentBuffer.innerHTML = e;

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
        console.log(`Unable to find image link: ${e.target.responseURL}`);
        return;
      }
    } catch (e) {
      console.warn(e);
      return;
    }
  }

  return src;
};

// Set up message event handler:
window.addEventListener('message', function(event) {
  console.log("Message received");

  var command = event.data.command;
  var name = event.data.name || 'hello';
  switch(command) {
    case 'render':
      var src = handleLoad(event.data.context.target);
      event.source.postMessage({
        name: name,
        src: src
      }, event.origin);
      break;
  }
});