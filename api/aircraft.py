import os
import time
import sqlite3
import requests
from flask import jsonify, request
from api.counter import increment, get_counts

OPENSKY_USER = os.getenv("OPENSKY_USER")
OPENSKY_PASS = os.getenv("OPENSKY_PASS")

CACHE_TTL  = 60
ROUTE_TTL  = 3 * 60 * 60

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "aircraft_route.db")

_cache = {
    "data": None,
    "timestamp": 0
}

def init_db():
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS aircraft_route (
            icao TEXT,
            lat  REAL,
            lon  REAL,
            ts   INTEGER,
            PRIMARY KEY (icao, ts)
        )
    """)
    con.commit()
    con.close()

init_db()

def _prune_old_routes():
    cutoff = int(time.time() * 1000) - ROUTE_TTL * 1000
    con = sqlite3.connect(DB_PATH)
    cur = con.execute("DELETE FROM aircraft_route WHERE ts < ?", (cutoff,))
    deleted = cur.rowcount
    con.commit()
    con.close()
    if deleted > 0:
        print(f"Aircraft route pruned: {deleted}件削除")

def save_route():
    body = request.get_json()
    icao = body.get("icao")
    lat  = body.get("lat")
    lon  = body.get("lon")
    ts   = body.get("ts")

    if not all([icao, lat is not None, lon is not None, ts]):
        return jsonify({"error": "invalid params"}), 400

    con = sqlite3.connect(DB_PATH)
    con.execute(
        "INSERT OR IGNORE INTO aircraft_route (icao, lat, lon, ts) VALUES (?, ?, ?, ?)",
        (icao, lat, lon, ts)
    )
    con.commit()
    con.close()
    return jsonify({"ok": True})

def get_route():
    icao = request.args.get("icao")
    if not icao:
        return jsonify({"error": "icao required"}), 400

    con  = sqlite3.connect(DB_PATH)
    rows = con.execute(
        "SELECT lat, lon, ts FROM aircraft_route WHERE icao = ? ORDER BY ts ASC",
        (icao,)
    ).fetchall()
    con.close()

    points = [{"lat": r[0], "lon": r[1], "ts": r[2]} for r in rows]
    return jsonify({"icao": icao, "points": points})

def get_aircraft():
    now = time.time()

    if _cache["data"] is not None and (now - _cache["timestamp"]) < CACHE_TTL:
        return jsonify({
            "cached": True,
            "age": round(now - _cache["timestamp"]),
            "data": _cache["data"],
            "api_count": get_counts()["aircraft"],
        })

    url = "https://opensky-network.org/api/states/all?lamin=20&lamax=49&lomin=122&lomax=154"
    try:
        res = requests.get(url, timeout=10, auth=(OPENSKY_USER, OPENSKY_PASS))
        increment("aircraft")
        count = get_counts()["aircraft"]
        print(f"Aircraft API: リクエスト {count}回/日")

        if res.status_code == 429:
            print("Aircraft API: rate limited")
            return jsonify({
                "cached": True,
                "age": round(now - _cache["timestamp"]) if _cache["data"] else 0,
                "data": _cache["data"] or [],
                "rate_limited": True,
                "api_count": count,
            })

        res_json = res.json()
        results = []
        for s in res_json.get("states", []):
            if s[5] is None or s[6] is None:
                continue
            results.append({
                "icao":      s[0],
                "callsign":  (s[1] or "不明").strip(),
                "country":   s[2],
                "lon":       s[5],
                "lat":       s[6],
                "alt":       s[7],
                "speed":     s[9],
                "heading":   s[10],
                "on_ground": s[8]
            })

        _cache["data"] = results
        _cache["timestamp"] = now
        print(f"Aircraft API: {len(results)}機取得")

        _prune_old_routes()

        return jsonify({
            "cached": False,
            "age": 0,
            "data": results,
            "api_count": count,
        })

    except Exception as e:
        print(f"Aircraft fetch error: {e}")
        return jsonify({
            "cached": True,
            "age": 0,
            "data": _cache["data"] or [],
            "api_count": get_counts()["aircraft"],
        })