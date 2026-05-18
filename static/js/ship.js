let shipMarkers = {};
let shipHistory = {}; // mmsi -> [{lat, lon, ts}, ...]
let shipRouteLines = {};
let activeShipRoute = null;

const SHIP_ROUTE_TTL = 30 * 60 * 1000;
const SHIP_COLOR = "#2dd4bf";
const STORAGE_KEY_SHIP = "ship_history";

// --- localStorage ---
function saveShipHistory() {
    try {
        // 保存前に全エントリをprune＆空になったものは削除
        const cutoff = Date.now() - SHIP_ROUTE_TTL;
        for (let mmsi in shipHistory) {
            shipHistory[mmsi] = shipHistory[mmsi].filter(p => p.ts >= cutoff);
            if (shipHistory[mmsi].length === 0) {
                delete shipHistory[mmsi];
            }
        }
        localStorage.setItem(STORAGE_KEY_SHIP, JSON.stringify(shipHistory));
    } catch (e) {
        console.warn("Ship history save failed:", e);
    }
}

function loadShipHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_SHIP);
        if (!raw) return;
        const stored = JSON.parse(raw);
        const cutoff = Date.now() - SHIP_ROUTE_TTL;
        for (let mmsi in stored) {
            const pruned = stored[mmsi].filter(p => p.ts >= cutoff);
            if (pruned.length > 0) {
                shipHistory[mmsi] = pruned;
            }
        }
        console.log(`Ship history restored: ${Object.keys(shipHistory).length} ships`);
    } catch (e) {
        console.warn("Ship history load failed:", e);
    }
}

function pruneShipHistory(history) {
    const cutoff = Date.now() - SHIP_ROUTE_TTL;
    return history.filter(p => p.ts >= cutoff);
}

// --- ルート表示 ---
function showShipRoute(mmsi) {
    if (activeShipRoute === mmsi) {
        clearShipRoute();
        return;
    }
    clearShipRoute();

    const history = shipHistory[mmsi];
    if (!history || history.length < 2) return;

    const latlngs = history.map(p => [p.lat, p.lon]);
    shipRouteLines[mmsi] = L.polyline(latlngs, {
        color: SHIP_COLOR,
        weight: 1.5,
        opacity: 0.6,
        dashArray: "4 4"
    }).addTo(map);

    activeShipRoute = mmsi;
}

function clearShipRoute() {
    if (activeShipRoute && shipRouteLines[activeShipRoute]) {
        map.removeLayer(shipRouteLines[activeShipRoute]);
        delete shipRouteLines[activeShipRoute];
    }
    activeShipRoute = null;
}

// --- メイン更新 ---
function updateShip() {
    fetch('/api/ship')
    .then(res => res.json())
    .then(result => {
        const data = result.data;
        let active = new Set();
        const now = Date.now();

        data.forEach(ship => {
            active.add(ship.mmsi);

            if (!shipHistory[ship.mmsi]) {
                shipHistory[ship.mmsi] = [];
            }
            shipHistory[ship.mmsi].push({ lat: ship.lat, lon: ship.lon, ts: now });
            shipHistory[ship.mmsi] = pruneShipHistory(shipHistory[ship.mmsi]);

            if (activeShipRoute === ship.mmsi && shipRouteLines[ship.mmsi]) {
                const latlngs = shipHistory[ship.mmsi].map(p => [p.lat, p.lon]);
                shipRouteLines[ship.mmsi].setLatLngs(latlngs);
            }

            let icon = L.icon({
                iconUrl: '/static/images/ship.png',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -60],
            });

            let popup =
                `<span class="popup-label">船名</span><span class="popup-value-accent">${ship.name}</span><br>` +
                `<span class="popup-label">MMSI</span><span class="popup-value">${ship.mmsi}</span><br>` +
                `<span class="popup-label">速度</span><span class="popup-value">${ship.speed != null ? ship.speed + " kt" : "—"}</span><br>` +
                `<span class="popup-label">針路</span><span class="popup-value">${ship.heading != null ? Math.round(ship.heading) + "°" : "—"}</span>`;

            const rotation = ship.heading != null ? ship.heading - 90 : 0;

            if (shipMarkers[ship.mmsi]) {
                shipMarkers[ship.mmsi].setLatLng([ship.lat, ship.lon]);
                shipMarkers[ship.mmsi].setPopupContent(popup);
                shipMarkers[ship.mmsi].setRotationAngle(rotation);
                if (!layerVisible.ship) {
                    map.removeLayer(shipMarkers[ship.mmsi]);
                }
            } else {
                shipMarkers[ship.mmsi] = L.marker([ship.lat, ship.lon], { icon, rotationAngle: rotation, rotationOrigin: 'center' })
                    .bindPopup(popup)
                    .on('click', () => showShipRoute(ship.mmsi));
                if (layerVisible.ship) {
                    shipMarkers[ship.mmsi].addTo(map);
                }
            }
        });

        // 消えた船舶を削除
        for (let mmsi in shipMarkers) {
            if (!active.has(mmsi)) {
                map.removeLayer(shipMarkers[mmsi]);
                delete shipMarkers[mmsi];
                delete shipHistory[mmsi];
                if (activeShipRoute === mmsi) clearShipRoute();
            }
        }

        saveShipHistory();
    })
    .catch(e => console.log("Ship fetch error:", e));
}

loadShipHistory();
updateShip();
setInterval(updateShip, 30000);