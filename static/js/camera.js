let cameraMarkers = {};

function toEmbedUrl(url) {
    if (!url) return null;
    const params = "?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&enablejsapi=1";

    let m = url.match(/[?&]v=([^&]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}${params}`;

    m = url.match(/\/live\/([^?&/]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}${params}`;

    m = url.match(/youtu\.be\/([^?&/]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}${params}`;

    m = url.match(/\/channel\/([^/?&]+)/);
    if (m) return `https://www.youtube.com/embed/live_stream?channel=${m[1]}&${params.slice(1)}`;

    return null;
}

function getIconUrl(embed) {
    if (!("embed" in Object.assign({}, {embed}))) return '/static/images/camera_null.png'; // フィールドなし
    if (embed === false) return '/static/images/camera_blank.png'; // 埋め込みNG
    return '/static/images/camera.png'; // true or null
}

function setEmbed(youtubeUrl, embedVal) {
    fetch('/api/camera/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube: youtubeUrl, embed: embedVal })
    }).catch(e => console.warn("embed update error:", e));
}

function reportEmbedNg(youtubeUrl) {
    fetch('/api/camera/embed_ng', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube: youtubeUrl })
    }).catch(e => console.warn("embed_ng report error:", e));
}

function makeFallbackHtml(youtubeUrl) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                        height:100%;gap:12px;padding:16px;">
        <div style="color:#94a3b8;font-size:12px;text-align:center;">埋め込みが無効な動画です</div>
        <a href="${youtubeUrl}" target="_blank"
           style="display:flex;align-items:center;gap:6px;padding:8px 16px;
                  background:rgba(255,0,0,0.15);border:1px solid rgba(255,0,0,0.3);
                  border-radius:6px;color:#f87171;font-size:12px;text-decoration:none;">
            ▶ YouTubeで開く
        </a>
    </div>`;
}

function openCameraPopup(cam) {
    const embedUrl = toEmbedUrl(cam.youtube);
    const embedAllowed = cam.embed !== false;

    const existing = document.getElementById("camera-popup");
    if (existing) existing.remove();

    const embedBtnStyle = (active, color) =>
        `padding:3px 10px;font-size:11px;border-radius:4px;border:1px solid ${active ? color : 'rgba(255,255,255,0.1)'};
         background:${active ? color + '22' : 'transparent'};color:${active ? color : 'rgba(148,163,184,0.5)'};cursor:pointer;`;

    const popup = document.createElement("div");
    popup.id = "camera-popup";
    popup.innerHTML = `
        <div id="camera-popup-header">
            <span id="camera-popup-title">${cam.name}</span>
            <span id="camera-popup-sub">${cam.pref} ${cam.city}</span>
            <div style="display:flex;gap:4px;flex-shrink:0;">
                <button id="embed-ok-btn" style="${embedBtnStyle(cam.embed === true, '#4ade80')}"
                    onclick="onEmbedOk('${cam.youtube}')">埋め込みOK</button>
                <button id="embed-ng-btn" style="${embedBtnStyle(cam.embed === false, '#f87171')}"
                    onclick="onEmbedNg('${cam.youtube}')">埋め込みNG</button>
            </div>
            <button id="camera-popup-close" onclick="document.getElementById('camera-popup').remove()">✕</button>
        </div>
        <div id="camera-popup-body">
            ${embedAllowed && embedUrl
                ? `<iframe id="camera-iframe" src="${embedUrl}" frameborder="0"
                    allow="autoplay; encrypted-media" allowfullscreen></iframe>`
                : makeFallbackHtml(cam.youtube)
            }
        </div>
        <div id="camera-popup-resize"></div>
    `;

    document.body.appendChild(popup);

    const iframe = document.getElementById("camera-iframe");
    if (iframe) {
        const onMsg = e => {
            if (!e.data || typeof e.data !== "string") return;
            try {
                const data = JSON.parse(e.data);
                if (data.event === "onError" && (data.info === 101 || data.info === 150)) {
                    reportEmbedNg(cam.youtube);
                    const body = document.getElementById("camera-popup-body");
                    if (body) body.innerHTML = makeFallbackHtml(cam.youtube);
                    window.removeEventListener("message", onMsg);
                }
            } catch(_) {}
        };
        window.addEventListener("message", onMsg);
        document.getElementById("camera-popup-close").addEventListener("click", () => {
            window.removeEventListener("message", onMsg);
        });
    }

    const header = document.getElementById("camera-popup-header");
    header.addEventListener("mousedown", e => {
        if (["camera-popup-close", "embed-ok-btn", "embed-ng-btn"].includes(e.target.id)) return;
        let dragX = e.clientX - popup.offsetLeft;
        let dragY = e.clientY - popup.offsetTop;
        const onMove = e => {
            popup.style.left = (e.clientX - dragX) + "px";
            popup.style.top  = (e.clientY - dragY) + "px";
        };
        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    });

    document.getElementById("camera-popup-resize").addEventListener("mousedown", e => {
        e.preventDefault();
        const startX = e.clientX, startY = e.clientY;
        const startW = popup.offsetWidth, startH = popup.offsetHeight;
        const onMove = e => {
            popup.style.width  = Math.max(240, startW + (e.clientX - startX)) + "px";
            popup.style.height = Math.max(180, startH + (e.clientY - startY)) + "px";
        };
        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    });
}

function onEmbedOk(youtubeUrl) {
    setEmbed(youtubeUrl, true);
    document.getElementById("embed-ok-btn").style.cssText =
        `padding:3px 10px;font-size:11px;border-radius:4px;border:1px solid #4ade80;background:#4ade8022;color:#4ade80;cursor:pointer;`;
    document.getElementById("embed-ng-btn").style.cssText =
        `padding:3px 10px;font-size:11px;border-radius:4px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(148,163,184,0.5);cursor:pointer;`;
}

function onEmbedNg(youtubeUrl) {
    setEmbed(youtubeUrl, false);
    document.getElementById("embed-ng-btn").style.cssText =
        `padding:3px 10px;font-size:11px;border-radius:4px;border:1px solid #f87171;background:#f8717122;color:#f87171;cursor:pointer;`;
    document.getElementById("embed-ok-btn").style.cssText =
        `padding:3px 10px;font-size:11px;border-radius:4px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(148,163,184,0.5);cursor:pointer;`;
    const body = document.getElementById("camera-popup-body");
    if (body) body.innerHTML = makeFallbackHtml(youtubeUrl);
}

function updateCamera() {
    fetch('/api/camera')
    .then(res => res.json())
    .then(data => {
        const active = new Set();

        data.forEach(cam => {
            const key = `${cam.lat}_${cam.lon}_${cam.name}`;
            active.add(key);

            // embedフィールドの有無でアイコンを切り替え
            const iconUrl = !cam.has_embed
                ? '/static/images/camera_null.png'
                : cam.embed === false
                    ? '/static/images/camera_blank.png'
                    : '/static/images/camera.png';

            const icon = L.icon({
                iconUrl,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            });

            if (cameraMarkers[key]) {
                // アイコンを更新
                cameraMarkers[key].setIcon(icon);
            } else {
                cameraMarkers[key] = L.marker([cam.lat, cam.lon], { icon })
                    .on('click', () => openCameraPopup(cam));
                if (layerVisible.camera) {
                    cameraMarkers[key].addTo(map);
                }
            }
        });

        for (let key in cameraMarkers) {
            if (!active.has(key)) {
                map.removeLayer(cameraMarkers[key]);
                delete cameraMarkers[key];
            }
        }
    })
    .catch(e => console.log("Camera fetch error:", e));
}

updateCamera();