let shipMarkers = {};

function updateShip() {
    fetch('/api/ship')
    .then(res => res.json())
    .then(result => {
        const data = result.data;
        let active = new Set();

        data.forEach(ship => {
            active.add(ship.mmsi);

            let icon = L.icon({
                iconUrl: '/static/images/ship.png',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12],
            });

            let popup =
                `船名: ${ship.name}<br>` +
                `MMSI: ${ship.mmsi}<br>` +
                `速度: ${ship.speed != null ? ship.speed + " kt" : "不明"}<br>` +
                `針路: ${ship.heading != null ? Math.round(ship.heading) + "°" : "不明"}`;

            if (shipMarkers[ship.mmsi]) {
                shipMarkers[ship.mmsi].setLatLng([ship.lat, ship.lon]);
                shipMarkers[ship.mmsi].setPopupContent(popup);
                if (!layerVisible.ship) {
                    map.removeLayer(shipMarkers[ship.mmsi]);
                }
            } else {
                shipMarkers[ship.mmsi] = L.marker([ship.lat, ship.lon], { icon })
                    .bindPopup(popup);
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
            }
        }
    })
    .catch(e => console.log("Ship fetch error:", e));
}

// 初回表示・30秒ごとに更新
updateShip();
setInterval(updateShip, 30000);
