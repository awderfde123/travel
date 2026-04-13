const DATA_KEY = "trip-map-collab-v1";
const MAP_KEY = "google-maps-api-key";

const state = {
  places: [],
  selectedPlaceId: null
};

let map;
let markers = [];

const mainView = document.getElementById("mainView");
const detailView = document.getElementById("detailView");
const placesListEl = document.getElementById("placesList");
const itineraryOverviewEl = document.getElementById("itineraryOverview");
const mapHintEl = document.getElementById("mapHint");
const cardTemplate = document.getElementById("simpleCardTemplate");

function saveState() { localStorage.setItem(DATA_KEY, JSON.stringify(state.places)); }
function loadState() { state.places = JSON.parse(localStorage.getItem(DATA_KEY) || "[]"); }

function getPlace(id = state.selectedPlaceId) { return state.places.find((p) => p.id === id); }

function updateHash(id) { location.hash = id ? `#/place/${id}` : "#/"; }

function ensureSeed() {
  if (state.places.length) return;
  state.places = [{
    id: crypto.randomUUID(),
    name: "台北車站",
    lat: 25.0478,
    lng: 121.517,
    note: "可作為集合點",
    itinerary: [{ id: crypto.randomUUID(), date: "2026-05-20", time: "09:00", title: "集合出發", note: "南二門" }],
    discussions: [{ id: crypto.randomUUID(), author: "小美", topic: "集合時間", message: "09:00 可以嗎？", resolved: false, createdAt: new Date().toISOString() }]
  }];
  saveState();
}

function createCard({ title, meta, content }) {
  const node = cardTemplate.content.cloneNode(true);
  node.querySelector("h3").textContent = title;
  node.querySelector(".meta").textContent = meta;
  node.querySelector(".content").textContent = content;
  return node;
}

function renderMainPanels() {
  placesListEl.innerHTML = "";
  itineraryOverviewEl.innerHTML = "";

  if (!state.places.length) {
    placesListEl.innerHTML = "<p class='meta'>尚無地點，請新增。</p>";
    itineraryOverviewEl.innerHTML = "<p class='meta'>尚無行程。</p>";
    return;
  }

  state.places.forEach((place) => {
    const node = createCard({ title: place.name, meta: `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`, content: place.note || "（無備註）" });
    const actions = node.querySelector(".item-actions");
    const openBtn = document.createElement("button");
    openBtn.textContent = "進入內頁編輯";
    openBtn.className = "primary";
    openBtn.onclick = () => updateHash(place.id);
    actions.appendChild(openBtn);
    placesListEl.appendChild(node);

    const items = [...place.itinerary].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    items.forEach((item) => {
      const itineraryNode = createCard({
        title: `${item.date} ${item.time}｜${item.title}`,
        meta: `地點：${place.name}`,
        content: item.note || "（無備註）"
      });
      itineraryNode.querySelector(".item-actions").remove();
      itineraryOverviewEl.appendChild(itineraryNode);
    });
  });

  if (!itineraryOverviewEl.children.length) itineraryOverviewEl.innerHTML = "<p class='meta'>尚無行程。</p>";
}

function clearMarkers() { markers.forEach((m) => m.setMap(null)); markers = []; }

function renderMarkers() {
  if (!map) return;
  clearMarkers();
  state.places.forEach((place) => {
    const marker = new google.maps.Marker({ map, position: { lat: place.lat, lng: place.lng }, title: place.name });
    marker.addListener("click", () => updateHash(place.id));
    markers.push(marker);
  });
}

function setupMap() {
  map = new google.maps.Map(document.getElementById("map"), { center: { lat: 25.0478, lng: 121.517 }, zoom: 11 });
  renderMarkers();
}

function loadGoogleMap() {
  const key = localStorage.getItem(MAP_KEY);
  if (!key) {
    mapHintEl.classList.remove("hidden");
    mapHintEl.textContent = "尚未設定 API Key，請按右上『Google Map 設定』。";
    return;
  }
  if (window.google?.maps) return setupMap();

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=__initMap`;
  script.async = true;
  window.__initMap = setupMap;
  script.onerror = () => {
    mapHintEl.classList.remove("hidden");
    mapHintEl.textContent = "Google Maps 載入失敗，請檢查 API Key 與授權設定。";
  };
  document.head.appendChild(script);
}

function renderDetail() {
  const place = getPlace();
  if (!place) return updateHash(null);

  document.getElementById("detailTitle").textContent = place.name;
  document.getElementById("detailCoords").textContent = `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`;
  document.getElementById("placeName").value = place.name;
  document.getElementById("placeNote").value = place.note || "";

  const detailItineraryEl = document.getElementById("detailItinerary");
  detailItineraryEl.innerHTML = "";
  [...place.itinerary].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).forEach((item) => {
    const node = createCard({ title: `${item.date} ${item.time}｜${item.title}`, meta: "此地點行程", content: item.note || "（無備註）" });
    const actions = node.querySelector(".item-actions");
    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "刪除";
    del.onclick = () => { place.itinerary = place.itinerary.filter((x) => x.id !== item.id); saveState(); renderAll(); };
    actions.appendChild(del);
    detailItineraryEl.appendChild(node);
  });
  if (!detailItineraryEl.children.length) detailItineraryEl.innerHTML = "<p class='meta'>尚無行程項目。</p>";

  const detailDiscussionsEl = document.getElementById("detailDiscussions");
  detailDiscussionsEl.innerHTML = "";
  [...place.discussions].sort((a, b) => (Number(a.resolved) - Number(b.resolved)) || b.createdAt.localeCompare(a.createdAt)).forEach((d) => {
    const node = createCard({
      title: d.topic,
      meta: `${d.author} ・ ${new Date(d.createdAt).toLocaleString("zh-TW", { hour12: false })}`,
      content: d.message
    });
    const actions = node.querySelector(".item-actions");
    const tag = document.createElement("span");
    tag.className = `status-tag ${d.resolved ? "resolved" : "pending"}`;
    tag.textContent = d.resolved ? "已處理" : "未處理";
    const toggle = document.createElement("button");
    toggle.className = "status-btn";
    toggle.textContent = d.resolved ? "標記未處理" : "標記已處理";
    toggle.onclick = () => { d.resolved = !d.resolved; saveState(); renderDetail(); renderMainPanels(); };
    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "刪除";
    del.onclick = () => { place.discussions = place.discussions.filter((x) => x.id !== d.id); saveState(); renderAll(); };
    actions.append(tag, toggle, del);
    detailDiscussionsEl.appendChild(node);
  });
  if (!detailDiscussionsEl.children.length) detailDiscussionsEl.innerHTML = "<p class='meta'>尚無討論。</p>";
}

function route() {
  const match = location.hash.match(/^#\/place\/(.+)$/);
  if (match) {
    state.selectedPlaceId = match[1];
    mainView.classList.add("hidden");
    detailView.classList.remove("hidden");
    renderDetail();
  } else {
    state.selectedPlaceId = null;
    detailView.classList.add("hidden");
    mainView.classList.remove("hidden");
    renderMainPanels();
  }
}

function renderAll() {
  renderMainPanels();
  renderMarkers();
  if (state.selectedPlaceId) renderDetail();
}

document.getElementById("addPlaceBtn").addEventListener("click", () => {
  const name = prompt("輸入地點名稱（例：九份老街）");
  if (!name) return;
  const lat = Number(prompt("輸入緯度（例：25.1099）"));
  const lng = Number(prompt("輸入經度（例：121.8442）"));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return alert("經緯度格式錯誤");

  state.places.push({ id: crypto.randomUUID(), name, lat, lng, note: "", itinerary: [], discussions: [] });
  saveState();
  renderAll();
});

document.getElementById("mapConfigBtn").addEventListener("click", () => {
  const dlg = document.getElementById("mapConfigDialog");
  document.getElementById("apiKeyInput").value = localStorage.getItem(MAP_KEY) || "";
  dlg.showModal();
});

document.getElementById("closeApiKeyBtn").addEventListener("click", () => document.getElementById("mapConfigDialog").close());
document.getElementById("saveApiKeyBtn").addEventListener("click", () => {
  const key = document.getElementById("apiKeyInput").value.trim();
  if (!key) return alert("請輸入 API Key");
  localStorage.setItem(MAP_KEY, key);
  document.getElementById("mapConfigDialog").close();
  mapHintEl.classList.add("hidden");
  loadGoogleMap();
});

document.getElementById("backBtn").addEventListener("click", () => updateHash(null));

document.getElementById("placeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const place = getPlace();
  if (!place) return;
  place.name = document.getElementById("placeName").value.trim();
  place.note = document.getElementById("placeNote").value.trim();
  saveState();
  renderAll();
});

document.getElementById("itineraryForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const place = getPlace();
  if (!place) return;
  place.itinerary.push({
    id: crypto.randomUUID(),
    date: document.getElementById("itemDate").value,
    time: document.getElementById("itemTime").value,
    title: document.getElementById("itemTitle").value.trim(),
    note: document.getElementById("itemNote").value.trim()
  });
  e.target.reset();
  saveState();
  renderAll();
});

document.getElementById("discussionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const place = getPlace();
  if (!place) return;
  place.discussions.push({
    id: crypto.randomUUID(),
    author: document.getElementById("author").value.trim(),
    topic: document.getElementById("topic").value.trim(),
    message: document.getElementById("message").value.trim(),
    resolved: false,
    createdAt: new Date().toISOString()
  });
  e.target.reset();
  saveState();
  renderAll();
});

window.addEventListener("hashchange", route);

loadState();
ensureSeed();
loadGoogleMap();
route();
