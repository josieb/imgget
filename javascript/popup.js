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
  '.FFVAD',
  '.image-viewer-main,image-viewer-container',
  '.disableSave-mobile'
];

/**
 * @param {Element}
 * @return {Element}
 * @public
 */
const finalChild = (node) => {
  if (node.firstElementChild !== null) {
    return ( finalChild(node.firstElementChild) );
  } else {
    return (node);
  }
};

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
  let result = document.evaluate('//img[@id][@style]', documentBuffer, null, 9, null).singleNodeValue;

  if (result) {
    if (result.src) {
      src = result.src;
    } else if (result.getAttribute('data-url')) {
      src = result.getAttribute('data-url');
    } else if (result.getAttribute('src')) {
      src = result.getAttribute('src');
    }
  } else {
    try {
      for (let i = 0; i < srcSelectors.length; i++) {
        if (src) break;
        let result = documentBuffer.querySelector(srcSelectors[i]);

        if (result) {
          if (result.src !== undefined) {
            src = result.src;
          } else {
            let child = finalChild(result);

            if (child.src !== undefined) {
              src = child.src;
            }
          }
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
 * Try to get the full-sized image.
 * 
 * @param {String} responseText
 * @return {String}
 * @public
 */
const postProcessText = (responseText) => {
  let src = responseText;
  src = src.replace(/(\.md\.)|(\.sm\.)/, '.');
  src = src.replace(/\?w=.*/, '?');
  src = src.replace('\/tn-', '\/');
  //src = src.replace(/\?.*/, '');

  if ( src.indexOf('chrome-extension') >= 0 ) {
    // The following line of code matches the base URL, however it does not
    // match trailing directories which may be required:
    // const baseURL = e.target.responseURL.match(/^.+?[^\/:](?=[?\/]|$)/);

    /**
    const splitResponseURL = responseURL.split('/');
    const baseURL = responseURL.replace(splitResponseURL[splitResponseURL.length - 1], '');
    src = src.replace(/chrome-extension:\/\/(\w+\/views\/)?/, '')
    src = baseURL + src;
    */
    src = src.replace(/chrome-extension:\/\/(\w+\/views\/)?/, 'https://')
  }

  return src;
};

/**
 * Search the response for the source of the requested image and download it.
 *
 * @param {Response} res
 * @public
 */
const handleLoad = async (res) => {
  let src;
  const responseText = await res.text();
  const responseURL = res.url;

  if (responseText.includes('html')) {
    src = processText(responseText);
  } else {
    src = responseURL;
  }

  if (src) {
    src = postProcessText(src);
    console.info(`Found image source: ${src}`);
    chrome.downloads.download({url: src});
  } else {
    console.info(`Unable to find image source: ${responseURL}`);
  }
};

/**
 * Update the relevant fields with the new data.
 *
 * @param {hashmap} domInfo
 * @public
 */
const handleDOMInfo = (domInfo) => {
  if (!domInfo) { return; }

  let thumbsList = document.getElementById('thumbs');
  while (thumbsList.children.length > 1) {
    thumbsList.removeChild(thumbsList.children[thumbsList.children.length - 1])
  }

  for (let i = 0; i < domInfo.length; i++) {
    let checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false;

    let thumb = document.createElement('img');
    thumb.setAttribute("crossorigin", "anonymous");
    thumb.src = domInfo[i].src;
    thumb.url = domInfo[i].url;

    thumb.onclick = () => {
      let sibling = thumb.previousSibling;
      sibling.checked = !sibling.checked;
      thumbChecks[thumb.src].download = sibling.checked;
    };

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
  document.getElementById('num-selected').innerHTML = `(${numSelected})`;
});

window.onload = () => {
  document.getElementById('download').onclick = async () => {
    for (let id in thumbChecks) {
      if (thumbChecks[id].download) {
        await fetch(thumbChecks[id].url)
          .then((res) => handleLoad(res))
          .catch((error) => console.info(error));
      }
    };
  };

  document.getElementById('download-raw').onclick = () => {
    let src;

    for (let id in thumbChecks) {
      if (thumbChecks[id].download) {
        if (thumbChecks[id].src) {
          src = thumbChecks[id].src;
          src = postProcessText(src);
          console.info(`Found image source: ${src}`);
          chrome.downloads.download({url: src});
        } else {
          console.info(`Unable to find image source: ${thumbChecks[id].url}}`);
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
