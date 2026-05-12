const INTENSITY = {
    "1":  { color: "lightblue",  icon: 1 },
    "2":  { color: "lightgreen", icon: 2 },
    "3":  { color: "yellow",     icon: 3 },
    "4":  { color: "orange",     icon: 4 },
    "5-": { color: "red",        icon: 5 },
    "5+": { color: "red",        icon: 6 },
    "6-": { color: "pink",       icon: 7 },
    "6+": { color: "pink",       icon: 8 },
    "7":  { color: "purple",     icon: 9 },
};

// 震度3以上をマップに表示
const ON_MAP = new Set(["3","4","5-","5+","6-","6+","7"]);

let earthquakeMarkers = [];
let allLogHtml = "";
let shortLogHtml = "";
let showingAll = false;

// 震度の強い順に都道府県を並べて色付け
function buildPrefText(prefs) {
    let prefArray = Object.entries(prefs)
        .map(([name, intensity]) => ({ name, intensity }))
        .sort((a, b) => (INTENSITY[b.intensity]?.icon || 0) - (INTENSITY[a.intensity]?.icon || 0));

    if (prefArray.length === 0) return "震源付近で揺れを感知";

    return prefArray.map((p, i) => {
        let color = INTENSITY[p.intensity]?.color || "white";
        let tag = i === 0 ? "b" : "span";
        return `<${tag} style="color:${color}">${p.name}：震度${p.intensity}</${tag}>`;
    }).join("<br>");
}

// ログをクリックしたらマーカーにジャンプ
function moveToEarthquake(index) {
    let marker = earthquakeMarkers[index];
    if (marker) {
        map.setView(marker.getLatLng(), 7);
        marker.openPopup();
    }
}

function toggleLog() {
    showingAll = !showingAll;
    if (showingAll) {
        document.getElementById("log").innerHTML = allLogHtml + `<div onclick="toggleLog()" style="text-align:center; cursor:pointer; padding:4px; color:#aaa;">▲ 折りたたむ</div>`;
    } else {
        document.getElementById("log").innerHTML = shortLogHtml + `<div onclick="toggleLog()" style="text-align:center; cursor:pointer; padding:4px; color:#aaa;">▼ 全て表示</div>`;
    }
}

function loadEarthquake() {
    fetch('/api/earthquake')
    .then(res => res.json())
    .then(data => {
        allLogHtml = "";
        shortLogHtml = "";

        data.forEach((eq, index) => {
            const info = INTENSITY[eq.maxi] || {};
            const showOnMap = ON_MAP.has(eq.maxi);

            if (showOnMap) {
                let icon = L.icon({
                    iconUrl: `/static/images/${info.icon}.png`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                    popupAnchor: [0, -12]
                });

                let marker = L.marker([eq.lat, eq.lon], { icon })
                    .addTo(map)
                    .bindPopup(
                        `日時: ${new Date(eq.at).toLocaleString()}<br>` +
                        `場所: ${eq.place}<br>` +
                        `最大震度: ${eq.maxi}<br>` +
                        `M: ${eq.mag}<br>` +
                        `<b>各地の震度:</b><br>${buildPrefText(eq.prefs)}`
                    );
                earthquakeMarkers.push(marker);
            } else {
                earthquakeMarkers.push(null);
            }

            let color = info.color || "white";
            let time = new Date(eq.at).toLocaleString("ja-JP", {
                month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit"
            });
            let text = `${time}　最大震度 <b style="color:${color}">${eq.maxi || "不明"}</b>　M${eq.mag}　${eq.place}`;
            let row = showOnMap
                ? `<div onclick="moveToEarthquake(${index})" class="clickable">${text}</div>`
                : `<div>${text}</div>`;

            allLogHtml += row;
            if (index < 10) shortLogHtml += row;
        });

        document.getElementById("log").innerHTML = shortLogHtml + `<div onclick="toggleLog()" style="text-align:center; cursor:pointer; padding:4px; color:#aaa;">▼ 全て表示</div>`;
    });
}

loadEarthquake();