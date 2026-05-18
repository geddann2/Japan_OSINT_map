var map = L.map('map', {
    zoomControl: false,
    minZoom: 5,
    maxBounds: [[20, 122], [49, 154]],
    maxBoundsViscosity: 1.0
}).setView([36, 138], 5);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri'
}).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    opacity: 0.65
}).addTo(map);

// レイヤー表示切替（共通）
let layerVisible = { aircraft: true, earthquake: true, ship: true };

function toggleLayer(type) {
    layerVisible[type] = !layerVisible[type];
//飛行機情報
    if (type === "aircraft") {
        for (let icao in aircraftMarkers) {
            if (layerVisible.aircraft) {
                aircraftMarkers[icao].addTo(map);
            } else {
                map.removeLayer(aircraftMarkers[icao]);
            }
        }
    }
//地震情報
    if (type === "earthquake") {
        earthquakeMarkers.forEach(m => {
            if (!m) return;
            if (layerVisible.earthquake) {
                m.addTo(map);
            } else {
                map.removeLayer(m);
            }
        });
    }

//船舶情報
       if (type === "ship") {
    for (let mmsi in shipMarkers) {
        if (layerVisible.ship) {
            shipMarkers[mmsi].addTo(map);
        } else {
            map.removeLayer(shipMarkers[mmsi]);
        }
    }
}


    const btn = document.getElementById(`btn-${type}`);
    if (btn) btn.style.opacity = layerVisible[type] ? "1" : "0.4";
}