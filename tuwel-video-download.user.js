// ==UserScript==
// @name        Tuwel Video Download
// @namespace   https://fsinf.at
// @match       https://tuwel.tuwien.ac.at/mod/opencast/view.php*
// @grant       none
// @version     1.1
// @author      FSINF
// @description 3/14/2026, 5:18:42 PM
// @downloadURL https://fsinf.at/userscripts/tuwel-video-download.user.js
// @updateURL   https://fsinf.at/userscripts/tuwel-video-download.user.js
// ==/UserScript==

function parseEpisodeStreams() {
  const episode = window.episode;
  const streams =
    episode && Array.isArray(episode.streams) ? episode.streams : [];
  const parsed = [];

  // extract mp4 sources from streams
  streams.forEach((stream, streamIndex) => {
    const sources = stream && stream.sources ? stream.sources : {};
    const streamName =
      stream && stream.content ? stream.content : `stream ${streamIndex + 1}`;

    const mp4 = Array.isArray(sources.mp4) ? sources.mp4 : [];
    mp4.forEach((entry, entryIndex) => {
      if (entry && entry.src) {
        const w = entry.res && entry.res.w ? entry.res.w : "?";
        const h = entry.res && entry.res.h ? entry.res.h : "?";
        parsed.push({
          label: `${streamName} (${w}x${h})`,
          src: entry.src,
        });
      }
    });
  });

  // remove duplicates
  return parsed.filter(function (item, index) {
    return (
      parsed.findIndex(function (other) {
        return other.src === item.src;
      }) === index
    );
  });
}

function parseCaptions() {
  const episode = window.episode;
  const captions =
    episode && Array.isArray(episode.captions) ? episode.captions : [];
  const parsed = [];

  // extract sources from captions
  captions.forEach((caption, captionIndex) => {
    const captionName =
      caption && caption.text ? caption.text : `caption ${captionIndex + 1}`;

    if (caption && caption.url) {
      const lang = caption.lang ? caption.lang : "?";
      parsed.push({
        label: `${captionName} (${lang})`,
        src: caption.url,
      });
    }
  });

  return parsed;
}



function startDownload(url) {
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function createDownloadButton(sources, buttonName) {
  const container = document.createElement("div");
  container.style.marginBottom = "12px";

  const select = document.createElement("select");
  select.style.marginRight = "8px";

  sources.forEach((source) => {
    const option = document.createElement("option");
    option.value = source.src;
    option.textContent = source.label;
    select.appendChild(option);
  });

  const button = document.createElement("button");
  button.textContent = buttonName;
  button.type = "button";
  button.addEventListener("click", function () {
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption) {
      return;
    }
    startDownload(selectedOption.value);
  });

  container.appendChild(select);
  container.appendChild(button);

  return container;
}


function injectButtons() {
  let playerWrapper = document.querySelector(".player-wrapper");
  if (!playerWrapper) {
    // fallback for insertion of button
    playerWrapper = document.querySelector(".page-context-header");
    if (!playerWrapper) {
      return;
    }
  }


  const streams = parseEpisodeStreams();
  if (!streams.length) {
    return;
  }

  const captions = parseCaptions();

  streamDownloadContainer = createDownloadButton(streams, "Download selected stream");
  captionsDownloadContainer = createDownloadButton(captions, "Download selected captions");

  playerWrapper.parentNode.insertBefore(streamDownloadContainer, playerWrapper);
  playerWrapper.parentNode.insertBefore(captionsDownloadContainer, playerWrapper);

}



if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectButtons);
} else {
  injectButtons();
}
