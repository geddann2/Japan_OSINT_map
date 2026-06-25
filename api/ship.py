import os
import json
import time
import threading
import sqlite3
import websocket
from flask import jsonify, request

AISSTREAM_KEY = os.getenv("AISSTREAM_KEY")

ROUTE_TTL = 3 * 60 * 60  # 3時間

_ships = {}
_lock = threading.Lock()

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "ship_route.db")

# --- DB初期化 ---
def init_db():
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS ship_route (
            mmsi TEXT,
            lat  REAL,
            lon  REAL,
            ts   INTEGER,
            PRIMARY KEY (mmsi, ts)
        )
    """)
    con.commit()
    con.close()

init_db()

def _prune_old_routes():
    cutoff = int(time.time() * 1000) - ROUTE_TTL * 1000
    con = sqlite3.connect(DB_PATH)
    cur = con.execute("DELETE FROM ship_route WHERE ts < ?", (cutoff,))
    deleted = cur.rowcount
    con.commit()
    con.close()
    if deleted > 0:
        print(f"Ship route pruned: {deleted}件削除")

def save_route():
    body = request.get_json()
    mmsi = body.get("mmsi")
    lat  = body.get("lat")
    lon  = body.get("lon")
    ts   = body.get("ts")

    if not all([mmsi, lat is not None, lon is not None, ts]):
        return jsonify({"error": "invalid params"}), 400

    con = sqlite3.connect(DB_PATH)
    con.execute(
        "INSERT OR IGNORE INTO ship_route (mmsi, lat, lon, ts) VALUES (?, ?, ?, ?)",
        (mmsi, lat, lon, ts)
    )
    con.commit()
    con.close()
    return jsonify({"ok": True})

def get_route():
    mmsi = request.args.get("mmsi")
    if not mmsi:
        return jsonify({"error": "mmsi required"}), 400

    con  = sqlite3.connect(DB_PATH)
    rows = con.execute(
        "SELECT lat, lon, ts FROM ship_route WHERE mmsi = ? ORDER BY ts ASC",
        (mmsi,)
    ).fetchall()
    con.close()

    points = [{"lat": r[0], "lon": r[1], "ts": r[2]} for r in rows]
    return jsonify({"mmsi": mmsi, "points": points})

# --- WebSocket ---
def _on_message(ws, message):
    try:
        data = json.loads(message)
        if data.get("MessageType") != "PositionReport":
            return

        meta = data.get("MetaData", {})
        pos  = data.get("Message", {}).get("PositionReport", {})

        mmsi = str(meta.get("MMSI", ""))
        lat  = meta.get("latitude")
        lon  = meta.get("longitude")

        if not mmsi or lat is None or lon is None:
            return

        with _lock:
            _ships[mmsi] = {
                "mmsi":    mmsi,
                "name":    meta.get("ShipName", "不明").strip(),
                "lat":     lat,
                "lon":     lon,
                "speed":   pos.get("Sog"),
                "heading": pos.get("Cog"),
            }
    except (KeyError, ValueError):
        pass

def _on_error(ws, error):
    print(f"Ship WS error: {error}")

def _on_close(ws, close_status_code, close_msg):
    print("Ship WS closed, reconnecting...")
    _start_ws()

def _on_open(ws):
    print("Ship WS connected")
    subscribe = {
        "APIKey": AISSTREAM_KEY,
        "BoundingBoxes": [[[20, 122], [49, 154]]]
    }
    ws.send(json.dumps(subscribe))

def _start_ws():
    ws = websocket.WebSocketApp(
        "wss://stream.aisstream.io/v0/stream",
        on_open=_on_open,
        on_message=_on_message,
        on_error=_on_error,
        on_close=_on_close,
    )
    t = threading.Thread(target=ws.run_forever, daemon=True)
    t.start()

def init_ship():
    if not AISSTREAM_KEY:
        print("Ship: AISSTREAM_KEY未設定、スキップ")
        return
    _start_ws()

def get_ship():
    with _lock:
        data = list(_ships.values())
    _prune_old_routes()
    return jsonify({"data": data})