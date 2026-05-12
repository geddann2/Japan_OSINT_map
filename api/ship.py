import os
import json
import threading
import websocket
from flask import jsonify

AISSTREAM_KEY = os.getenv("AISSTREAM_KEY")

# 船舶データのキャッシュ（mmsi -> 船舶情報）
_ships = {}
_lock = threading.Lock()

def _on_message(ws, message):
    try:
        data = json.loads(message)
        msg_type = data.get("MessageType")

        if msg_type != "PositionReport":
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
                "speed":   pos.get("Sog"),    # 対地速度（ノット）
                "heading": pos.get("Cog"),    # 針路
            }
    except (KeyError, ValueError):
        pass

def _on_error(ws, error):
    print(f"Ship WS error: {error}")

def _on_close(ws, close_status_code, close_msg):
    print("Ship WS closed, reconnecting...")
    _start_ws()  # 切断時に再接続

def _on_open(ws):
    print("Ship WS connected")
    subscribe = {
        "APIKey": AISSTREAM_KEY,
        "BoundingBoxes": [
            # 日本周辺（経度122〜154、緯度20〜49）
            [[20, 122], [49, 154]]
        ]
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
    return jsonify({"data": data})
