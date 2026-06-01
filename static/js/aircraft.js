let aircraftMarkers = {};
let aircraftHistory = {};
let aircraftRouteLines = {};
let activeAircraftRoute = null;

const AIRCRAFT_COLOR = "#38bdf8";

function showAircraftRoute(icao) {
    if (activeAircraftRoute === icao) {
        clearAircraftRoute();
        return;
    }
    clearAircraftRoute();

    fetch(`/api/aircraft/route?icao=${icao}`)
        .then(res => res.json())
        .then(result => {
            const dbPoints = result.points || [];
            const memPoints = aircraftHistory[icao] || [];
            const lastDbTs = dbPoints.length > 0 ? dbPoints[dbPoints.length - 1].ts : 0;
            const newPoints = memPoints.filter(p => p.ts > lastDbTs);
            const allPoints = [...dbPoints, ...newPoints];
            if (allPoints.length < 2) return;

            const latlngs = allPoints.map(p => [p.lat, p.lon]);
            aircraftRouteLines[icao] = L.polyline(latlngs, {
                color: AIRCRAFT_COLOR,
                weight: 1.5,
                opacity: 0.6,
                dashArray: "4 4"
            }).addTo(map);

            activeAircraftRoute = icao;
        })
        .catch(e => console.warn("Route fetch error:", e));
}

function clearAircraftRoute() {
    if (activeAircraftRoute && aircraftRouteLines[activeAircraftRoute]) {
        map.removeLayer(aircraftRouteLines[activeAircraftRoute]);
        delete aircraftRouteLines[activeAircraftRoute];
    }
    activeAircraftRoute = null;
}

function saveRoutePoint(icao, lat, lon, ts) {
    fetch('/api/aircraft/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icao, lat, lon, ts })
    }).catch(e => console.warn("Route save error:", e));
}

function updateAircraft() {
    fetch('/api/aircraft')
    .then(res => res.json())
    .then(result => {
        if (result.error) {
            console.log("Aircraft error:", result.error);
            return;
        }

        const data = result.data;
        const count = result.api_count ?? "—";

        // 左下ステータス
        const statusEl = document.getElementById("aircraft-status");
        if (statusEl) {
            statusEl.textContent = result.cached
                ? `✈ キャッシュ表示中（${result.age}秒前のデータ）　API: ${count}回/日`
                : `✈ 最新データ取得済み　API: ${count}回/日`;
            statusEl.style.color = result.cached ? "#aaa" : "#4fc3f7";
        }

        // 右上チップ
        const chipApi = document.getElementById("chip-api");
        if (chipApi) chipApi.textContent = `飛行機API ${count}回目`;

        let active = new Set();
        const now = Date.now();

        data.forEach(ac => {
            if (ac.on_ground) return;
            active.add(ac.icao);

            saveRoutePoint(ac.icao, ac.lat, ac.lon, now);

            if (!aircraftHistory[ac.icao]) aircraftHistory[ac.icao] = [];
            aircraftHistory[ac.icao].push({ lat: ac.lat, lon: ac.lon, ts: now });

            if (activeAircraftRoute === ac.icao && aircraftRouteLines[ac.icao]) {
                const latlngs = aircraftHistory[ac.icao].map(p => [p.lat, p.lon]);
                aircraftRouteLines[ac.icao].setLatLngs(latlngs);
            }

            const icon = L.icon({
                iconUrl: '/static/images/aircraft.png',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -60],
            });

            const popup =
                `<span class="popup-label">コールサイン</span><span class="popup-value-accent">${(ac.callsign || "不明")}</span><br>` +
                `<span class="popup-label">国籍</span><span class="popup-value">${ac.country}</span><br>` +
                `<span class="popup-label">高度</span><span class="popup-value">${ac.alt ? Math.round(ac.alt) + " m" : "—"}</span><br>` +
                `<span class="popup-label">速度</span><span class="popup-value">${ac.speed ? Math.round(ac.speed * 1.94384) + " kt" : "—"}</span><br>` +
                `<span class="popup-label">針路</span><span class="popup-value">${ac.heading ? Math.round(ac.heading) + "°" : "—"}</span>`;

            const rotation = ac.heading != null ? ac.heading - 90 : 0;

            if (aircraftMarkers[ac.icao]) {
                aircraftMarkers[ac.icao].setLatLng([ac.lat, ac.lon]);
                aircraftMarkers[ac.icao].setPopupContent(popup);
                aircraftMarkers[ac.icao].setRotationAngle(rotation);
                if (!layerVisible.aircraft) map.removeLayer(aircraftMarkers[ac.icao]);
            } else {
                aircraftMarkers[ac.icao] = L.marker([ac.lat, ac.lon], { icon, rotationAngle: rotation, rotationOrigin: 'center' })
                    .bindPopup(popup)
                    .on('click', () => showAircraftRoute(ac.icao));
                if (layerVisible.aircraft) aircraftMarkers[ac.icao].addTo(map);
            }
        });

        for (let icao in aircraftMarkers) {
            if (!active.has(icao)) {
                map.removeLayer(aircraftMarkers[icao]);
                delete aircraftMarkers[icao];
                delete aircraftHistory[icao];
                if (activeAircraftRoute === icao) clearAircraftRoute();
            }
        }
    })
    .catch(e => console.log("Aircraft fetch error:", e));
}

updateAircraft();
setInterval(updateAircraft, 60000);