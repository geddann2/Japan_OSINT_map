let shipMarkers = {};
let shipHistory = {};

const SHIP_COLOR = "#2dd4bf";

function updateShip() {
    fetch('/api/ship')
    .then(res => res.json())
    .then(result => {
        const data = result.data;
        const active = new Set();
        const now = Date.now();

        data.forEach(ship => {
            active.add(ship.mmsi);

            if (!shipHistory[ship.mmsi]) shipHistory[ship.mmsi] = [];
            shipHistory[ship.mmsi].push({ lat: ship.lat, lon: ship.lon, ts: now });

            const icon = L.icon({
                iconUrl: '/static/images/ship.png',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -60],
            });

            const popup =
                `<span class="popup-label">船名</span><span class="popup-value-accent">${ship.name}</span><br>` +
                `<span class="popup-label">MMSI</span><span class="popup-value">${ship.mmsi}</span><br>` +
                `<span class="popup-label">速度</span><span class="popup-value">${ship.speed != null ? ship.speed + " kt" : "—"}</span><br>` +
                `<span class="popup-label">針路</span><span class="popup-value">${ship.heading != null ? Math.round(ship.heading) + "°" : "—"}</span>`;

            const rotation = ship.heading != null ? ship.heading - 90 : 0;

            if (shipMarkers[ship.mmsi]) {
                shipMarkers[ship.mmsi].setLatLng([ship.lat, ship.lon]);
                shipMarkers[ship.mmsi].setPopupContent(popup);
                shipMarkers[ship.mmsi].setRotationAngle(rotation);
                if (!layerVisible.ship) map.removeLayer(shipMarkers[ship.mmsi]);
            } else {
                shipMarkers[ship.mmsi] = L.marker([ship.lat, ship.lon], { icon, rotationAngle: rotation, rotationOrigin: 'center' })
                    .bindPopup(popup);
                if (layerVisible.ship) shipMarkers[ship.mmsi].addTo(map);
            }
        });

        for (let mmsi in shipMarkers) {
            if (!active.has(mmsi)) {
                map.removeLayer(shipMarkers[mmsi]);
                delete shipMarkers[mmsi];
                delete shipHistory[mmsi];
            }
        }
    })
    .catch(e => console.log("Ship fetch error:", e));
}

updateShip();
setInterval(updateShip, 30000);