let aircraftMarkers = {};
let aircraftHistory = {}; // icao -> [{lat, lon, ts}, ...]
let aircraftRouteLines = {};
let activeAircraftRoute = null;

const ROUTE_TTL = 30 * 60 * 1000;
const AIRCRAFT_COLOR = "#38bdf8";
const STORAGE_KEY_AIRCRAFT = "aircraft_history";

// --- localStorage ---
function saveAircraftHistory() {
    try {
        localStorage.setItem(STORAGE_KEY_AIRCRAFT, JSON.stringify(aircraftHistory));
    } catch (e) {
        console.warn("Aircraft history save failed:", e);
    }
}

function loadAircraftHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_AIRCRAFT);
        if (!raw) return;
        const stored = JSON.parse(raw);
        const cutoff = Date.now() - ROUTE_TTL;
        // 30分以内のものだけ復元
        for (let icao in stored) {
            const pruned = stored[icao].filter(p => p.ts >= cutoff);
            if (pruned.length > 0) {
                aircraftHistory[icao] = pruned;
            }
        }
        console.log(`Aircraft history restored: ${Object.keys(aircraftHistory).length} aircraft`);
    } catch (e) {
        console.warn("Aircraft history load failed:", e);
    }
}

function pruneAircraftHistory(history) {
    const cutoff = Date.now() - ROUTE_TTL;
    return history.filter(p => p.ts >= cutoff);
}

// --- ルート表示 ---
function showAircraftRoute(icao) {
    if (activeAircraftRoute === icao) {
        clearAircraftRoute();
        return;
    }
    clearAircraftRoute();

    const history = aircraftHistory[icao];
    if (!history || history.length < 2) return;

    const latlngs = history.map(p => [p.lat, p.lon]);
    aircraftRouteLines[icao] = L.polyline(latlngs, {
        color: AIRCRAFT_COLOR,
        weight: 1.5,
        opacity: 0.6,
        dashArray: "4 4"
    }).addTo(map);

    activeAircraftRoute = icao;
}

function clearAircraftRoute() {
    if (activeAircraftRoute && aircraftRouteLines[activeAircraftRoute]) {
        map.removeLayer(aircraftRouteLines[activeAircraftRoute]);
        delete aircraftRouteLines[activeAircraftRoute];
    }
    activeAircraftRoute = null;
}

// --- メイン更新 ---
function updateAircraft() {
    fetch('/api/aircraft')
    .then(res => res.json())
    .then(result => {
        if (result.error) {
            console.log("Aircraft error:", result.error);
            return;
        }

        const data = result.data;
        const statusEl = document.getElementById("aircraft-status");
        if (statusEl) {
            statusEl.textContent = result.cached
                ? `✈ キャッシュ表示中（${result.age}秒前のデータ）`
                : `✈ 最新データ取得済み`;
            statusEl.style.color = result.cached ? "#aaa" : "#4fc3f7";
        }

        let active = new Set();
        const now = Date.now();

        data.forEach(ac => {
            if (ac.on_ground) return;
            active.add(ac.icao);

            if (!aircraftHistory[ac.icao]) {
                aircraftHistory[ac.icao] = [];
            }
            aircraftHistory[ac.icao].push({ lat: ac.lat, lon: ac.lon, ts: now });
            aircraftHistory[ac.icao] = pruneAircraftHistory(aircraftHistory[ac.icao]);

            if (activeAircraftRoute === ac.icao && aircraftRouteLines[ac.icao]) {
                const latlngs = aircraftHistory[ac.icao].map(p => [p.lat, p.lon]);
                aircraftRouteLines[ac.icao].setLatLngs(latlngs);
            }

            let icon = L.icon({
                iconUrl: '/static/images/aircraft.png',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12],
            });

            let popup =
                `コールサイン: ${ac.callsign}<br>` +
                `国籍: ${ac.country}<br>` +
                `高度: ${ac.alt ? Math.round(ac.alt) + " m" : "不明"}<br>` +
                `速度: ${ac.speed ? Math.round(ac.speed * 1.94384) + " kt" : "不明"}<br>` +
                `針路: ${ac.heading ? Math.round(ac.heading) + "°" : "不明"}`;

            if (aircraftMarkers[ac.icao]) {
                aircraftMarkers[ac.icao].setLatLng([ac.lat, ac.lon]);
                aircraftMarkers[ac.icao].setPopupContent(popup);
                if (!layerVisible.aircraft) {
                    map.removeLayer(aircraftMarkers[ac.icao]);
                }
            } else {
                aircraftMarkers[ac.icao] = L.marker([ac.lat, ac.lon], { icon })
                    .bindPopup(popup)
                    .on('click', () => showAircraftRoute(ac.icao));
                if (layerVisible.aircraft) {
                    aircraftMarkers[ac.icao].addTo(map);
                }
            }
        });

        // 消えた機体を削除
        for (let icao in aircraftMarkers) {
            if (!active.has(icao)) {
                map.removeLayer(aircraftMarkers[icao]);
                delete aircraftMarkers[icao];
                delete aircraftHistory[icao];
                if (activeAircraftRoute === icao) clearAircraftRoute();
            }
        }

        saveAircraftHistory();
    })
    .catch(e => console.log("Aircraft fetch error:", e));
}

// 起動時に履歴を復元してから更新開始
loadAircraftHistory();
updateAircraft();
setInterval(updateAircraft, 60000);