// ─────────────────────────────────────────────
// Google Maps
// ─────────────────────────────────────────────
let map;
let markers           = [];
let directionsRenderer = null;
let routePolyline     = null;
let pendingLatLng     = null;

// ── Marker SVG ──
function markerSvg(num) {
  const s = 28, f = 11;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
    <circle cx="${s/2}" cy="${s/2}" r="${s/2-2}" fill="#2563eb" stroke="white" stroke-width="2.5"/>
    <text x="${s/2}" y="${s/2+4}" text-anchor="middle" fill="white"
          font-family="Arial,sans-serif" font-size="${f}" font-weight="bold">${num}</text>
  </svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(s, s),
    anchor: new google.maps.Point(s / 2, s / 2),
  };
}

// ── Markers ──
function clearMarkers() { markers.forEach(m => m.setMap(null)); markers = []; }

function renderMarkers() {
  if (!map) return;
  clearMarkers();
  state.places.forEach((place, i) => {
    const marker = new google.maps.Marker({
      map,
      position: { lat: place.lat, lng: place.lng },
      title: place.name,
      icon: markerSvg(i + 1),
    });
    marker.addListener("click", () => openDiscussPage(place.id));
    markers.push(marker);
  });
  renderRoute();
}

// ── Route ──
function clearRoute() {
  if (directionsRenderer) { directionsRenderer.setMap(null); directionsRenderer = null; }
  if (routePolyline)      { routePolyline.setMap(null);      routePolyline = null; }
}

function renderRoute() {
  clearRoute();
  if (!map || !state.showRoute || state.places.length < 2) return;

  const places = state.places;
  directionsRenderer = new google.maps.DirectionsRenderer({
    map,
    suppressMarkers: true,
    polylineOptions: { strokeColor: "#2563eb", strokeWeight: 4, strokeOpacity: 0.75 },
  });

  new google.maps.DirectionsService().route({
    origin:      { lat: places[0].lat,     lng: places[0].lng },
    destination: { lat: places.at(-1).lat, lng: places.at(-1).lng },
    waypoints:   places.slice(1, -1).map(p => ({ location: { lat: p.lat, lng: p.lng }, stopover: true })),
    travelMode:  google.maps.TravelMode.DRIVING,
  }, (result, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(result);
    } else {
      if (directionsRenderer) { directionsRenderer.setMap(null); directionsRenderer = null; }
      routePolyline = new google.maps.Polyline({
        path: places.map(p => ({ lat: p.lat, lng: p.lng })),
        map,
        strokeColor: "#2563eb", strokeWeight: 4, strokeOpacity: 0.8, geodesic: true,
        icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 }, offset: "50%", repeat: "150px" }],
      });
    }
  });
}

// ── Fit bounds ──
function fitBounds() {
  if (!map || !state.places.length) return;
  const bounds = new google.maps.LatLngBounds();
  state.places.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
  map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
}

// ── Setup ──
function setupMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 25.0478, lng: 121.517 },
    zoom: 11,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
  });

  map.addListener("click", event => {
    pendingLatLng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    if (event.placeId) {
      event.stop();
      new google.maps.places.PlacesService(map).getDetails(
        { placeId: event.placeId, fields: ["name"] },
        (place, status) => {
          const name = status === google.maps.places.PlacesServiceStatus.OK ? place.name : "";
          openAddDialog(name);
        }
      );
    } else {
      openAddDialog("");
    }
  });

  renderMarkers();
  if (state.places.length) fitBounds();
  initPlacesSearch();
}

function updateMapConfigBtn() {
  const hasKey = !!localStorage.getItem(MAP_KEY);
  document.getElementById("mapConfigBtn").classList.toggle("hidden", hasKey);
}

function loadGoogleMap() {
  updateMapConfigBtn();
  const key = localStorage.getItem(MAP_KEY);
  if (!key) {
    mapHintEl.classList.remove("hidden");
    document.getElementById("map").style.display = "none";
    document.getElementById("mapConfigDialog").showModal();
    return;
  }
  if (window.google?.maps) return setupMap();

  const script = document.createElement("script");
  script.src   = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=__initMap`;
  script.async  = true;
  window.__initMap = setupMap;
  script.onerror = () => {
    mapHintEl.classList.remove("hidden");
    mapHintEl.querySelector("p").textContent = "Google Maps 載入失敗，請檢查 API Key 與授權設定。";
    document.getElementById("map").style.display = "none";
  };
  document.head.appendChild(script);
}

// ── Places Autocomplete ──
function initPlacesSearch() {
  const input = document.getElementById("mapSearch");
  if (!window.google?.maps?.places || !input) return;
  const autocomplete = new google.maps.places.Autocomplete(input, { fields: ["name", "geometry"] });
  autocomplete.bindTo("bounds", map);
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry?.location) return;
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.panTo({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      map.setZoom(16);
    }
    input.value = "";
  });
}

// ─ 事件綁定 ─
routeToggleBtn.addEventListener("click", () => {
  state.showRoute = !state.showRoute;
  routeToggleBtn.textContent = state.showRoute ? "🛣 隱藏路線" : "🛣 顯示路線";
  routeToggleBtn.classList.toggle("active", state.showRoute);
  renderRoute();
});

document.getElementById("mapConfigBtn").addEventListener("click", () => {
  document.getElementById("apiKeyInput").value = localStorage.getItem(MAP_KEY) || "";
  document.getElementById("mapConfigDialog").showModal();
});
document.getElementById("closeApiKeyBtn").addEventListener("click", () => {
  document.getElementById("mapConfigDialog").close();
});
document.getElementById("saveApiKeyBtn").addEventListener("click", () => {
  const key = document.getElementById("apiKeyInput").value.trim();
  if (!key) return alert("請輸入 API Key");
  localStorage.setItem(MAP_KEY, key);
  document.getElementById("mapConfigDialog").close();
  mapHintEl.classList.add("hidden");
  document.getElementById("map").style.display = "";
  updateMapConfigBtn();
  loadGoogleMap();
});
