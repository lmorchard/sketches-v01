const INITIAL_INFOBOX_CLOSE_DELAY = 5000;

async function main() {
  const infoButton = document.createElement("div");
  infoButton.setAttribute("id", "sketches-nav-bar");
  infoButton.innerHTML = `
    <button class="home">⇧</button>
    <button class="info">ⓘ</button>
  `;
  document.body.append(infoButton);

  const buttons = {
    info: toggleInfoBox,
    home: () =>
      (window.location = document
        .querySelector("head link[rel='top']")
        .getAttribute("href")),
  };
  for (const [cls, handler] of Object.entries(buttons)) {
    document
      .querySelector(`#sketches-nav-bar button.${cls}`)
      .addEventListener("click", handler);
  }

  // Quick & dirty event delegation to handle dismissing the infobox on any click outside
  document.body.addEventListener(
    "click",
    (ev) => {
      let target = ev.target;
      do {
        if (!target || target === document.body) break;
        if (target.classList.contains("close-info-box")) break;
        if (target.getAttribute("id") === "info-box-inner") return;
        target = target.parentNode;
      } while (target);

      removeInfoBox();
    },
    true
  );

  if (!hasSeenSketch()) {
    displayInfoBox();
    setTimeout(removeInfoBox, INITIAL_INFOBOX_CLOSE_DELAY);
    sketchSeen();
  }
}

const seenKey = () => `seen-${window.location.pathname}`;

function hasSeenSketch() {
  return !!localStorage.getItem(seenKey());
}

function sketchSeen() {
  localStorage.setItem(seenKey(), true);
}

function toggleInfoBox() {
  if (document.getElementById("info-box")) {
    removeInfoBox();
  } else {
    displayInfoBox();
  }
}

const meta = (property, defVal) => {
  const el = document
    .querySelector(`head meta[property='${property}']`);
  if (!el) return defVal;
  return el.getAttribute("content");
}

function displayInfoBox() {
  const infoBox = document.createElement("div");
  infoBox.setAttribute("id", "info-box");
  infoBox.innerHTML = `
    <div class="box" id="info-box-inner">
      <button class="close-info-box">X</button>
      <h1>${meta("og:title", document.title)}</h1>
      <p>${meta("og:description")}</p>
    </div>
  `;
  document.body.append(infoBox);
}

function removeInfoBox() {
  const infoBox = document.getElementById("info-box");
  if (infoBox) infoBox.remove();
}

main().catch(console.error);
