let aircraftMarkers = {};

function updateAircraft() {
    fetch('/api/aircraft')
    .then(res => res.json())
    .then(result => {
        if (result.error) {
            console.log("Aircraft error:", result.error);
            return;
        }

        const data = result.data;

        // キャッシュ状態をUIに表示
        const statusEl = document.getElementById("aircraft-status");
        if (statusEl) {
            statusEl.textContent = result.cached
                ? `✈ キャッシュ表示中（${result.age}秒前のデータ）`
                : `✈ 最新データ取得済み`;
            statusEl.style.color = result.cached ? "#aaa" : "#4fc3f7";
        }

        let active = new Set();

        data.forEach(ac => {
            if (ac.on_ground) return;
            active.add(ac.icao);

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
                    .bindPopup(popup);
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
            }
        }
    })
    .catch(e => console.log("Aircraft fetch error:", e));
}

// 初回表示・1分ごとに更新
updateAircraft();
setInterval(updateAircraft, 60000);