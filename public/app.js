const displayTitle = document.getElementById("displayTitle");
const displaySubtitle = document.getElementById("displaySubtitle");
const sceneTitle = document.getElementById("sceneTitle");
const sceneSubtitle = document.getElementById("sceneSubtitle");
const sceneElements = document.getElementById("sceneElements");
const tickerTrack = document.getElementById("tickerTrack");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const overlayEmoji = document.getElementById("overlayEmoji");
const clockTime = document.getElementById("clockTime");
const clockDate = document.getElementById("clockDate");

let reconnectDelay = 1200;
let ws;

function updateClock() {
  const now = new Date();
  clockTime.textContent = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(now);

  clockDate.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(now);
}

function createTextCard(element, i) {
  const card = document.createElement("article");
  card.className = "element-card";
  card.style.animationDelay = `${i * 70}ms`;
  card.innerHTML = `
    <h3>${element.heading ?? "Update"}</h3>
    <p>${element.body ?? "No details provided."}</p>
  `;
  return card;
}

function createImageCard(element, i) {
  const card = document.createElement("article");
  card.className = "element-card element-media";
  card.style.animationDelay = `${i * 70}ms`;

  const img = document.createElement("img");
  img.src = element.url;
  img.alt = element.caption || "Kiosk image";
  card.appendChild(img);

  if (element.caption) {
    const caption = document.createElement("div");
    caption.className = "media-caption";
    caption.textContent = element.caption;
    card.appendChild(caption);
  }

  return card;
}

function createVideoCard(element, i) {
  const card = document.createElement("article");
  card.className = "element-card element-media";
  card.style.animationDelay = `${i * 70}ms`;

  const video = document.createElement("video");
  video.src = element.url;
  video.autoplay = element.autoplay !== false;
  video.loop = element.loop !== false;
  video.muted = element.muted !== false;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  card.appendChild(video);

  if (element.caption) {
    const caption = document.createElement("div");
    caption.className = "media-caption";
    caption.textContent = element.caption;
    card.appendChild(caption);
  }

  return card;
}

function renderElements(elements = []) {
  sceneElements.innerHTML = "";
  if (!Array.isArray(elements) || elements.length === 0) {
    const empty = createTextCard(
      {
        heading: "No Scene Content Yet",
        body: "Ask the assistant to send cards, photos, or video snippets here."
      },
      0
    );
    sceneElements.appendChild(empty);
    return;
  }

  elements.forEach((element, i) => {
    if (element.type === "image" && element.url) {
      sceneElements.appendChild(createImageCard(element, i));
      return;
    }

    if (element.type === "video" && element.url) {
      sceneElements.appendChild(createVideoCard(element, i));
      return;
    }

    sceneElements.appendChild(createTextCard(element, i));
  });
}

function renderTicker(lines = []) {
  const safe = Array.isArray(lines) && lines.length > 0 ? lines : ["Family kiosk online and ready 🚀"];
  const doubled = [...safe, ...safe].map((line) => `<span>• ${line}</span>`).join("");
  tickerTrack.innerHTML = doubled;
}

function applyTransition(name) {
  const transition = ["slide", "fade", "zoom"].includes(name) ? name : "slide";
  document.body.dataset.transition = transition;

  const card = document.getElementById("sceneCard");
  card.classList.remove("transition-slide", "transition-fade", "transition-zoom");

  void card.offsetWidth;
  card.classList.add(`transition-${transition}`);
}

function renderState(state) {
  if (!state) {
    return;
  }

  document.body.dataset.theme = state.theme || "aurora";
  applyTransition(state.transition || "slide");

  displayTitle.textContent = state.title || "Family Home Assistant Display";
  displaySubtitle.textContent = state.subtitle || "Organized, informed, and a little bit silly";

  const scene = state.playlist?.[state.currentSceneIndex] ?? null;
  if (!scene) {
    sceneTitle.textContent = "Waiting for scenes";
    sceneSubtitle.textContent = "The assistant can push scene data through MCP tools.";
    renderElements([]);
  } else {
    sceneTitle.textContent = scene.title || "Untitled scene";
    sceneSubtitle.textContent = scene.subtitle || "";
    renderElements(scene.elements || []);
  }

  renderTicker(state.ticker);

  if (state.overlay?.visible) {
    overlayText.textContent = state.overlay.text || "Important update";
    overlayEmoji.textContent = state.overlay.emoji || "✨";
    overlay.classList.add("visible");
  } else {
    overlay.classList.remove("visible");
  }
}

async function loadInitialState() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const state = await response.json();
    renderState(state);
  } catch (error) {
    console.error("Failed loading initial state", error);
  }
}

function connectSocket() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${protocol}://${window.location.host}/ws`);

  ws.addEventListener("open", () => {
    reconnectDelay = 1200;
  });

  ws.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "state") {
        renderState(message.state);
      }
    } catch (error) {
      console.error("Invalid socket payload", error);
    }
  });

  ws.addEventListener("close", () => {
    setTimeout(connectSocket, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 1.4, 9000);
  });

  ws.addEventListener("error", () => {
    ws.close();
  });
}

updateClock();
setInterval(updateClock, 1000);
loadInitialState();
connectSocket();
