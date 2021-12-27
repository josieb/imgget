'use strict';

/**
 * @type {hashmap}
 * @public
 */
const thumbChecks = {};

/**
 * @type {array}
 * @public
 */
const imageSelectors = [
  'pic img img-responsive'
];

/**
 * @type {array}
 * @public
 */
const srcSelectors = [
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

/**
 * @param {String} responseText
 * @return {String}
 * @public
 */
const processText = (responseText) => {
  let src;
  let documentBuffer = document.createElement('body');
  documentBuffer.innerHTML = responseText;

  /* Try to find a well-formed image source. */
  let image = document.evaluate('//img[@id][@style]', documentBuffer, null, 9, null).singleNodeValue;

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
      for (let i = 0; i < srcSelectors.length; i++) {
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
    } catch (error) {
      console.warn(error);
      return;
    }
  }

  return src;
};

/**
 * Handle the 'onload' event of our XHR request. The responseText of the event
 * should be an HTML document. Once this is parsed into a DOMElement, we
 * search it for the source of the demanded image, and then download the image.
 *
 * @param {ProgressEvent} e The XHR ProgressEvent.
 * @public
 */
const handleLoad = (e) => {
  let src;
  const responseText = e.target.responseText;
  const responseURL = e.target.responseURL;

  if (responseText.includes('html')) {
    src = processText(responseText);
  } else {
    src = responseURL;
  }

  if (src) {
    if ( src.indexOf('chrome-extension') >= 0 ) {
      // The following line of code matches the base URL, however it does not
      // match trailing directories which may be required:
      // const baseURL = e.target.responseURL.match(/^.+?[^\/:](?=[?\/]|$)/);
      const splitResponseURL = responseURL.split('/');
      const baseURL = responseURL.replace(splitResponseURL[splitResponseURL.length - 1], '');
      src = src.replace(/chrome-extension:\/\/\w+\/(views\/)?/, '')
      src = baseURL + src;
    }
    console.info(`Found image source: ${src}`);
    chrome.downloads.download({url: src});
  } else {
    console.warn(`Unable to find image source: ${responseURL}`);
  }
};

/**
 * Update the relevant fields with the new data.
 *
 * @param {hashmap} domInfo
 * @public
 */
const handleDOMInfo = (domInfo) => {
  let thumbsList = document.getElementById('thumbs');
  while (thumbsList.children.length > 1) {
    thumbsList.removeChild(thumbsList.children[thumbsList.children.length - 1])
  }

  for (let i = 0; i < domInfo.length; i++) {
    let checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false;

    let thumb = document.createElement('img');
    thumb.src = domInfo[i].src;
    thumb.url = domInfo[i].url;

    thumb.onclick = () => {
      let sibling = this.previousSibling;
      sibling.checked = !sibling.checked;
      thumbChecks[this.src].download = sibling.checked;
    }

    let listItem = document.createElement('li');
    listItem.appendChild(checkbox);
    listItem.appendChild(thumb);
    thumbsList.appendChild(listItem);

    thumbChecks[ thumb.src ] = {
      'download': false,
      'src': thumb.src,
      'url': thumb.url
    };
  }
};

/* Once the document's DOM is ready, send a message to the content. */
document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      {from: 'popup', subject: 'DOMInfo'},
      handleDOMInfo);
  });
});

document.addEventListener('click', () => {
  let numSelected = 0;
  for (let id in thumbChecks) {
    if (thumbChecks[id].download) numSelected++;
  }
  document.getElementById('num-selected').innerHTML = 'selected: ' + numSelected;
});

window.onload = () => {
  document.getElementById('download').onclick = () => {
    for (let id in thumbChecks) {
      if (thumbChecks[id].download) {
        let request = new XMLHttpRequest();
        request.open('GET', thumbChecks[id].url, true);
        request.onload = handleLoad;
        request.send(null);
      }
    }
  };

  document.getElementById('download-raw').onclick = () => {
    let src;

    for (let id in thumbChecks) {
      if (thumbChecks[id].download) {
        if (thumbChecks[id].src) {
          src = thumbChecks[id].src;
          //src = src.replace(/\?.*/, '')
          console.info(`Found image source: ${src}`);
          chrome.downloads.download({url: src});
        } else {
          console.warn(`Unable to find image source: ${thumbChecks[id].url}}`);
        }
      }
    }
  };

  document.getElementById('select-all').onclick = () => {
    let inputs = document.getElementsByTagName('input');
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].checked = true;
      let sibling = inputs[i].nextSibling;
      thumbChecks[sibling.src].download = true;
    }
  };

  document.getElementById('select-none').onclick = () => {
    let inputs = document.getElementsByTagName('input');
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
      let sibling = inputs[i].nextSibling;
      thumbChecks[sibling.src].download = false;
    }
  };
};
