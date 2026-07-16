// ==UserScript==
// @name        Tuwel Video Download
// @namespace   https://fsinf.at
// @match       https://tuwel.tuwien.ac.at/mod/opencast/view.php*
// @grant       GM_xmlhttpRequest
// @connect     tuwien.ac.at
// @version     1.1
// @author      FSINF
// @description 3/14/2026, 5:18:42 PM
// @downloadURL https://fsinf.at/userscripts/tuwel-video-download.user.js
// @updateURL   https://fsinf.at/userscripts/tuwel-video-download.user.js
// ==/UserScript==

function parseEpisodeStreams() {
  const episode = unsafeWindow.episode;
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

function parseSubtitles() {
  const episode = unsafeWindow.episode;
  const captions = episode.captions;

  const parsed = [];

  captions.forEach((caption, captionIndex) => {
    parsed.push({
      label: `${caption.text} (${caption.lang})`,
      src: caption.url
    });
  });

  return parsed;
}

function filenameFromUrl(url, fallback) {
  const name = url.split("/").pop().split("?")[0];
  return name ? decodeURIComponent(name) : fallback;
}

function startBlobDownload(url, fallbackName, button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "downloading...";
  const restoreButton = function () {
    button.disabled = false;
    button.textContent = originalText;
  };

  GM_xmlhttpRequest({
    method: "GET",
    url: url,
    responseType: "blob",
    onprogress: function (event) {
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.round((event.loaded / event.total) * 100);
        button.textContent = `downloading... ${percent}%`;
      } else {
        const mb = (event.loaded / (1024 * 1024)).toFixed(1);
        button.textContent = `downloading... ${mb} MB`;
      }
    },
    onload: function (response) {
      const objectUrl = URL.createObjectURL(response.response);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filenameFromUrl(url, fallbackName);
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
      restoreButton();
    },
    onerror: function () {
      restoreButton();
      alert("Download failed");
    },
  });
}

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .tuwel-dl-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tuwel-dl-select,
    .tuwel-dl-button {
      padding: 5px 10px;
      font-size: 14px;
      border: 1px solid #c7c7c7;
      border-radius: 6px;
      background: #fff;
    }
    .tuwel-dl-button {
      background: #f5f5f5;
      cursor: pointer;
    }
    .tuwel-dl-button:hover:not(:disabled) {
      background: #e9e9e9;
    }
    .tuwel-dl-button:disabled {
      opacity: 0.65;
      cursor: default;
    }
  `;
  document.head.appendChild(style);
}

function injectDownloadButton() {
  let playerWrapper = document.querySelector(".player-wrapper");
  if (!playerWrapper) {
    // fallback for insertion of button
    playerWrapper = document.querySelector(".page-context-header");
    if (!playerWrapper) {
      return;
    }
  }

  const streams = parseEpisodeStreams();

  const subtitles = parseSubtitles();

  if (!streams.length && !subtitles.length) {
    return;
  }

  injectStyles();

  const container = document.createElement("div");
  container.style.marginBottom = "12px";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "8px";

  const videoRow = document.createElement("div");
  videoRow.className = "tuwel-dl-row";
  const subtitleRow = document.createElement("div");
  subtitleRow.className = "tuwel-dl-row";

  const videoSelect = document.createElement("select");
  videoSelect.className = "tuwel-dl-select";

  streams.forEach((stream) => {
    const option = document.createElement("option");
    option.value = stream.src;
    option.textContent = stream.label;
    videoSelect.appendChild(option);
  });


  const videoDLbutton = document.createElement("button");
  videoDLbutton.className = "tuwel-dl-button";
  videoDLbutton.textContent = "Download selected stream";
  videoDLbutton.type = "button";
  videoDLbutton.addEventListener("click", function () {
    const selectedOption = videoSelect.options[videoSelect.selectedIndex];
    if (!selectedOption) {
      return;
    }
    startBlobDownload(selectedOption.value, "video.mp4", videoDLbutton);
  });


  const subSelect = document.createElement("select");
  subSelect.className = "tuwel-dl-select";

  subtitles.forEach((caption) => {
    const option = document.createElement("option");
    option.value = caption.src;
    option.textContent = caption.label;
    subSelect.appendChild(option);
  });

  const subtitleDLbutton = document.createElement("button");
  subtitleDLbutton.className = "tuwel-dl-button";
  subtitleDLbutton.textContent = "Download selected subtitles";
  subtitleDLbutton.type = "button";
  subtitleDLbutton.addEventListener("click", function () {
    const selectedOption = subSelect.options[subSelect.selectedIndex];
    if (!selectedOption) {
      return;
    }
    startBlobDownload(selectedOption.value, "subtitles.vtt", subtitleDLbutton);
  });

  videoRow.appendChild(videoSelect);
  videoRow.appendChild(videoDLbutton);
  subtitleRow.appendChild(subSelect);
  subtitleRow.appendChild(subtitleDLbutton);
  container.appendChild(videoRow);
  container.appendChild(subtitleRow);

  playerWrapper.parentNode.insertBefore(container, playerWrapper);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectDownloadButton);
} else {
  injectDownloadButton();
}
