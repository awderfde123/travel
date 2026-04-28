// ─────────────────────────────────────────────
// Google Maps
// ─────────────────────────────────────────────
let map;
let markers = [];
let directionsRenderer = null;
let routePolyline      = null;
let pendingLatLng      = null;
let _placesService     = null;

// ── Nearby search ──
let nearbyMarkers    = [];
let nearbyInfoWindow = null;
let activeNearbyType = null;

// ── Marker SVGs ──
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
    anchor: new google.maps.Point(s/2, s/2),
  };
}

function searchMarkerSvg() {
  const w = 28, h = 38;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <path d="M14 2C8.477 2 4 6.477 4 12c0 7.418 10 24 10 24S24 19.418 24 12C24 6.477 19.523 2 14 2z"
          fill="#16a34a" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="12" r="5" fill="white"/>
  </svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(w / 2, h),
  };
}

function nearbyMarkerSvg() {
  const s = 18;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
    <circle cx="${s/2}" cy="${s/2}" r="${s/2-1.5}" fill="#f97316" stroke="white" stroke-width="2"/>
  </svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(s, s),
    anchor: new google.maps.Point(s/2, s/2),
  };
}

// ── Regular markers ──
function clearMarkers() {
  markers.forEach(m => m.setMap(null));
  markers = [];
}

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

// ── Nearby search markers ──
function clearNearbyMarkers() {
  nearbyMarkers.forEach(m => m.setMap(null));
  nearbyMarkers = [];
  if (nearbyInfoWindow) { nearbyInfoWindow.close(); nearbyInfoWindow = null; }
}

function searchNearby(type) {
  if (!map || !_placesService) return;

  // Toggle off if already active
  if (activeNearbyType === type) {
    clearNearbyMarkers();
    activeNearbyType = null;
    document.querySelectorAll(".nearby-btn").forEach(b => b.classList.remove("active"));
    return;
  }

  clearNearbyMarkers();
  activeNearbyType = type;
  document.querySelectorAll(".nearby-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.type === type)
  );

  // For restaurant, also search meal_takeaway to catch food shops (e.g. 雙月食品社)
  const searchTypes = type === "restaurant" ? ["restaurant", "meal_takeaway"] : [type];
  const seen = new Set();

  searchTypes.forEach(searchType => {
    _placesService.nearbySearch(
      { location: map.getCenter(), radius: 1500, type: searchType },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) return;
        results.forEach(place => {
          if (!place.geometry?.location) return;
          if (seen.has(place.place_id)) return;
          seen.add(place.place_id);
          const marker = new google.maps.Marker({
            map,
            position: place.geometry.location,
            title: place.name,
            icon: nearbyMarkerSvg(),
            zIndex: 10,
          });
          marker.addListener("click", () => {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            if (place.place_id && _placesAllowed()) {
              _placesIncrement();
              _placesService.getDetails(
                { placeId: place.place_id, fields: ["name", "opening_hours", "formatted_address"] },
                (details, detailStatus) => {
                  const ok = detailStatus === google.maps.places.PlacesServiceStatus.OK;
                  const openHours = ok ? (details?.opening_hours?.weekday_text || null) : null;
                  const address   = ok ? (details?.formatted_address || "") : "";
                  if (state.finalized) {
                    _showMapPin(lat, lng, place.name || "", address, openHours);
                  } else {
                    pendingLatLng = { lat, lng };
                    openAddDialog(place.name || "", openHours);
                  }
                }
              );
            } else {
              if (state.finalized) {
                _showMapPin(lat, lng, place.name || "", "", null);
              } else {
                pendingLatLng = { lat, lng };
                openAddDialog(place.name || "", null);
              }
            }
          });
          nearbyMarkers.push(marker);
        });
      }
    );
  });
}

// ── Route ──
function clearRoute() {
  if (directionsRenderer) {
    directionsRenderer.setMap(null);
    directionsRenderer = null;
  }
  if (routePolyline) {
    routePolyline.setMap(null);
    routePolyline = null;
  }
}

function renderRoute() {
  clearRoute();
  if (!map || (!state.showRoute && !state.finalized) || state.places.length < 2) return;

  const places = state.places;
  directionsRenderer = new google.maps.DirectionsRenderer({
    map,
    suppressMarkers: true,
    polylineOptions: {
      strokeColor: "#2563eb",
      strokeWeight: 4,
      strokeOpacity: 0.75,
    },
  });

  new google.maps.DirectionsService().route(
    {
      origin:      { lat: places[0].lat,       lng: places[0].lng },
      destination: { lat: places.at(-1).lat,   lng: places.at(-1).lng },
      waypoints:   places.slice(1, -1).map(p => ({ location: { lat: p.lat, lng: p.lng }, stopover: true })),
      travelMode:  google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);
      } else {
        if (directionsRenderer) { directionsRenderer.setMap(null); directionsRenderer = null; }
        routePolyline = new google.maps.Polyline({
          path: places.map(p => ({ lat: p.lat, lng: p.lng })),
          map,
          strokeColor: "#2563eb",
          strokeWeight: 4,
          strokeOpacity: 0.8,
          geodesic: true,
          icons: [{
            icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 },
            offset: "50%",
            repeat: "150px",
          }],
        });
      }
    },
  );
}

// ── Fit bounds ──
function fitBounds() {
  if (!map || !state.places.length) return;
  const bounds = new google.maps.LatLngBounds();
  state.places.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
  map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
}

// ── Drop a search/click pin with bottom card ──
let _placeCardLat = null, _placeCardLng = null, _placeCardOpenHours = null;

function _showPlaceCard(name, address, openHours) {
  const card = document.getElementById("placeCard");
  if (!card) return;
  document.getElementById("placeCardName").textContent    = name || "（未知地點）";
  document.getElementById("placeCardAddress").textContent = address || "";

  const hoursEl = document.getElementById("placeCardHours");
  if (Array.isArray(openHours) && openHours.length) {
    const todayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();
    if (state.finalized) {
      // Finalized: show only today's hours
      const todayRow = openHours[todayIdx];
      hoursEl.innerHTML = todayRow
        ? `<div class="place-card-hour-row today">${esc(todayRow)}</div>`
        : "";
    } else {
      // All 7 days, highlight today
      hoursEl.innerHTML = openHours.map((row, i) =>
        `<div class="place-card-hour-row${i === todayIdx ? " today" : ""}">${esc(row)}</div>`
      ).join("");
    }
  } else {
    hoursEl.innerHTML = "";
  }

  document.getElementById("placeCardAdd").classList.toggle("hidden", !!state.finalized);
  card.classList.remove("hidden");
}

function _hidePlaceCard() {
  document.getElementById("placeCard")?.classList.add("hidden");
}

function _showMapPin(lat, lng, name, address, openHours) {
  _placeCardLat       = lat;
  _placeCardLng       = lng;
  _placeCardOpenHours = openHours;

  if (_searchMarker) {
    // Just move the existing marker — no flash
    _searchMarker.setPosition({ lat, lng });
    _searchMarker.setTitle(name || "");
  } else {
    _searchMarker = new google.maps.Marker({
      map,
      position:  { lat, lng },
      icon:      searchMarkerSvg(),
      animation: google.maps.Animation.DROP,
      title:     name || "",
      zIndex:    999,
    });
  }

  // Refresh click listener for updated place info
  google.maps.event.clearListeners(_searchMarker, "click");
  _searchMarker.addListener("click", () => _showPlaceCard(name, address, openHours));

  _showPlaceCard(name, address, openHours);
}

// ── Setup ──
function setupMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 25.0478, lng: 121.517 },
    zoom: 11,
    mapTypeControl: false,
    streetViewControl: false,
    gestureHandling: "greedy",
    fullscreenControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
  });

  _placesService = new google.maps.places.PlacesService(map);

  // ── Places API 用量監控（每月上限 10,000 次）──
  const PLACES_MONTHLY_LIMIT = 10000;
  function _placesKey() {
    const d = new Date();
    return `places-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function _placesCount()     { return parseInt(localStorage.getItem(_placesKey()) || "0", 10); }
  function _placesAllowed()   { return _placesCount() < PLACES_MONTHLY_LIMIT; }
  function _placesIncrement() {
    const key = _placesKey();
    const next = _placesCount() + 1;
    localStorage.setItem(key, next);
    if (PLACES_MONTHLY_LIMIT - next === 500)
      console.warn(`[Places API] 本月剩餘配額僅剩 500 次`);
  }

  // Make quota helpers accessible to nearbySearch
  window._placesAllowed   = _placesAllowed;
  window._placesIncrement = _placesIncrement;

  let _suppressMapClick = false;

  map.addListener("click", event => {
    if (_suppressMapClick) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    if (event.placeId && _placesAllowed()) {
      event.stop();
      _placesIncrement();
      _placesService.getDetails(
        { placeId: event.placeId, fields: ["name", "types", "opening_hours", "formatted_address"] },
        (place, status) => {
          const SKIP_TYPES = ["route", "street_address", "street_number",
            "intersection", "political", "country",
            "administrative_area_level_1", "administrative_area_level_2",
            "administrative_area_level_3", "locality", "sublocality",
            "sublocality_level_1", "postal_code", "neighborhood"];
          const isRoadOrArea = place?.types?.some(t => SKIP_TYPES.includes(t));
          const ok        = status === google.maps.places.PlacesServiceStatus.OK;
          const name      = (ok && !isRoadOrArea) ? (place.name || "") : "";
          const openHours = (ok && !isRoadOrArea) ? (place?.opening_hours?.weekday_text || null) : null;
          const address   = (ok && !isRoadOrArea) ? (place?.formatted_address || "") : "";
          _showMapPin(lat, lng, name, address, openHours);
        }
      );
    } else {
      _showMapPin(lat, lng, "", "", null);
    }
  });

  // Place card buttons
  document.getElementById("placeCardClose")?.addEventListener("click", () => {
    _suppressMapClick = true;
    _hidePlaceCard();
    setTimeout(() => { _suppressMapClick = false; }, 300);
  });
  document.getElementById("placeCardAdd")?.addEventListener("click", () => {
    if (_placeCardLat === null) return;
    pendingLatLng = { lat: _placeCardLat, lng: _placeCardLng };
    const name = document.getElementById("placeCardName").textContent;
    _clearSearchPin();
    openAddDialog(name === "（未知地點）" ? "" : name, _placeCardOpenHours);
  });

  renderMarkers();
  if (state.places.length) fitBounds();
  initPlacesSearch();
}

// Google Maps API Key
const GOOGLE_MAPS_KEY = "AIzaSyACPr5Rmw-vyFeNOO_oScADGSsxT3LR4D0";

function loadGoogleMap() {
  if (window.google?.maps) return setupMap();
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&language=zh-TW&callback=__initMap`;
  script.async = true;
  window.__initMap = setupMap;
  script.onerror = () => {
    mapHintEl.classList.remove("hidden");
    mapHintEl.querySelector("p").textContent = "Google Maps 載入失敗，請確認網路連線。";
    document.getElementById("map").style.display = "none";
  };
  document.head.appendChild(script);
}

// ── Places Search ──
let _searchMarker     = null;
let _searchInfoWindow = null;

function _clearSearchPin() {
  if (_searchMarker) { _searchMarker.setMap(null); _searchMarker = null; }
  _hidePlaceCard();
}

function initPlacesSearch() {
  const input    = document.getElementById("mapSearch");
  const clearBtn = document.getElementById("mapSearchClear");
  if (!window.google?.maps?.places || !input) return;

  const autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["name", "geometry", "opening_hours", "formatted_address"],
  });
  autocomplete.bindTo("bounds", map);

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    // Pan / zoom
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
      google.maps.event.addListenerOnce(map, "idle", () => {
        if (map.getZoom() < 15) map.setZoom(15);
      });
    } else {
      map.panTo({ lat, lng });
      map.setZoom(16);
    }

    const openHours = place.opening_hours?.weekday_text || null;
    _showMapPin(lat, lng, place.name || "", place.formatted_address || "", openHours);
    clearBtn.classList.remove("hidden");
  });

  input.addEventListener("input", () => {
    clearBtn.classList.toggle("hidden", !input.value.trim());
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.classList.add("hidden");
    _clearSearchPin();
    input.focus();
  });
}

// ─ 事件綁定 ─
routeToggleBtn.addEventListener("click", () => {
  state.showRoute = !state.showRoute;
  routeToggleBtn.textContent = state.showRoute ? "🛣 隱藏路線" : "🛣 顯示路線";
  routeToggleBtn.classList.toggle("active", state.showRoute);
  renderRoute();
});

document.querySelectorAll(".nearby-btn").forEach(btn => {
  btn.addEventListener("click", () => searchNearby(btn.dataset.type));
});
