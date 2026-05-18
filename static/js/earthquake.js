const INTENSITY = {
    "1":  { icon: 1,  badgeCls: "intensity-1",  barCls: "bar-1",  onMap: false },
    "2":  { icon: 2,  badgeCls: "intensity-2",  barCls: "bar-2",  onMap: false },
    "3":  { icon: 3,  badgeCls: "intensity-3",  barCls: "bar-3",  onMap: true  },
    "4":  { icon: 4,  badgeCls: "intensity-4",  barCls: "bar-4",  onMap: true  },
    "5-": { icon: 5,  badgeCls: "intensity-5m", barCls: "bar-5m", onMap: true  },
    "5+": { icon: 6,  badgeCls: "intensity-5p", barCls: "bar-5p", onMap: true  },
    "6-": { icon: 7,  badgeCls: "intensity-6m", barCls: "bar-6m", onMap: true  },
    "6+": { icon: 8,  badgeCls: "intensity-6p", barCls: "bar-6p", onMap: true  },
    "7":  { icon: 9,  badgeCls: "intensity-7",  barCls: "bar-7",  onMap: true  },
};

let earthquakeMarkers = [];

// 表示状態: "short"（10件）| "all"（全件）| "hidden"（非表示）
let logState = "short";

function buildPrefText(prefs) {
    const colorMap = {
        "1": "rgba(148,163,184,0.6)", "2": "#60a5fa", "3": "#34d399",
        "4": "#fbbf24", "5-": "#f87171", "5+": "#ef4444",
        "6-": "#f472b6", "6+": "#ec4899", "7": "#a78bfa"
    };
    const order = { "1":1,"2":2,"3":3,"4":4,"5-":5,"5+":6,"6-":7,"6+":8,"7":9 };

    let prefArray = Object.entries(prefs)
        .map(([name, intensity]) => ({ name, intensity }))
        .sort((a, b) => (order[b.intensity] || 0) - (order[a.intensity] || 0));

    if (prefArray.length === 0) return "震源付近で揺れを感知";

    return prefArray.map((p, i) => {
        let color = colorMap[p.intensity] || "white";
        let tag = i === 0 ? "b" : "span";
        return `<${tag} style="color:${color}">${p.name}：震度${p.intensity}</${tag}>`;
    }).join("<br>");
}

function moveToEarthquake(index) {
    let marker = earthquakeMarkers[index];
    if (marker) {
        map.setView(marker.getLatLng(), 7);
        marker.openPopup();
    }
}

// ヘッダークリックで非表示 ↔ 10件表示 を切り替え
function toggleLogCollapse() {
    if (logState === "hidden") {
        logState = "short";
    } else {
        logState = "hidden";
    }
    applyLogState();
}

// フッターボタンで 10件 ↔ 全件 を切り替え
function toggleLogExpand() {
    if (logState === "short") {
        logState = "all";
    } else {
        logState = "short";
    }
    applyLogState();
}

let _allRows = [];
let _totalCount = 0;

function applyLogState() {
    const logBody = document.getElementById("log-body");
    const logFooter = document.getElementById("log-footer");
    const toggleIcon = document.getElementById("log-toggle-icon");
    if (!logBody) return;

    if (logState === "hidden") {
        logBody.style.display = "none";
        if (logFooter) logFooter.style.display = "none";
        if (toggleIcon) toggleIcon.textContent = "▼";
    } else if (logState === "short") {
        logBody.style.display = "block";
        logBody.innerHTML = _allRows.slice(0, 10).join("");
        if (logFooter) {
            logFooter.style.display = _totalCount > 10 ? "block" : "none";
            logFooter.textContent = `▼ すべて表示 (${_totalCount}件)`;
        }
        if (toggleIcon) toggleIcon.textContent = "▲";
    } else { // all
        logBody.style.display = "block";
        logBody.innerHTML = _allRows.join("");
        if (logFooter) {
            logFooter.style.display = "block";
            logFooter.textContent = "▲ 折りたたむ";
        }
        if (toggleIcon) toggleIcon.textContent = "▲";
    }
}

function renderLog(data) {
    _totalCount = data.length;
    _allRows = [];

    data.forEach((eq, index) => {
        const info = INTENSITY[eq.maxi] || { icon: 1, badgeCls: "intensity-1", barCls: "bar-1", onMap: false };
        const showOnMap = info.onMap;

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

        let time = new Date(eq.at).toLocaleString("ja-JP", {
            month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit"
        });

        const bar   = `<div class="intensity-bar ${info.barCls}"></div>`;
        const badge = `<span class="intensity-badge ${info.badgeCls}">震度${eq.maxi}</span>`;
        const body  = `<div class="log-info"><div class="log-place">${eq.place}</div><div class="log-meta">${time}&nbsp;&nbsp;M${eq.mag}</div></div>`;
        const arrow = `<span class="log-arrow">›</span>`;

        let row;
        if (showOnMap) {
            row = `<div class="clickable" onclick="moveToEarthquake(${index})">${bar}<div class="log-row-body">${badge}${body}${arrow}</div></div>`;
        } else {
            row = `<div class="log-row-plain">${bar}<div class="log-row-body">${badge}${body}</div></div>`;
        }

        _allRows.push(row);
    });

    const logEl = document.getElementById("log");

    let logBody = document.getElementById("log-body");
    if (!logBody) {
        logBody = document.createElement("div");
        logBody.id = "log-body";
        logEl.appendChild(logBody);
    }

    // フッターボタン（全件表示 / 折りたたむ）
    let logFooter = document.getElementById("log-footer");
    if (!logFooter) {
        logFooter = document.createElement("div");
        logFooter.id = "log-footer";
        logFooter.onclick = toggleLogExpand;
        logEl.appendChild(logFooter);
    }

    applyLogState();
}

function loadEarthquake() {
    fetch('/api/earthquake')
    .then(res => res.json())
    .then(data => renderLog(data));

    // 仮データを使う場合はこちら:
    // renderLog(MOCK_EARTHQUAKE_DATA);
}

loadEarthquake();