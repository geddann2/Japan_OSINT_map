// 都道府県境の表示
fetch("/static/japan_simple.geojson")
    .then(res => res.json())
    .then(geojson => {
        L.geoJSON(geojson, {
            style: {
                color: "rgba(148, 163, 184, 0.4)",
                weight: 1,
                fillOpacity: 0,
            }
        }).addTo(map);
    })
    .catch(e => console.warn("Prefecture border load error:", e));