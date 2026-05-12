import os
import time
import requests
from flask import jsonify

OPENSKY_USER = os.getenv("OPENSKY_USER")
OPENSKY_PASS = os.getenv("OPENSKY_PASS")

CACHE_TTL = 60  # 秒

_cache = {
    "data": None,
    "timestamp": 0
}

def get_aircraft():
    now = time.time()

    # キャッシュが有効なら返す
    if _cache["data"] is not None and (now - _cache["timestamp"]) < CACHE_TTL:
        return jsonify({
            "cached": True,
            "age": round(now - _cache["timestamp"]),
            "data": _cache["data"]
        })

    url = "https://opensky-network.org/api/states/all?lamin=20&lamax=49&lomin=122&lomax=154"
    try:
        res = requests.get(url, timeout=10, auth=(OPENSKY_USER, OPENSKY_PASS))

        if res.status_code == 429:
            print("Aircraft API: rate limited")
            return jsonify({
                "cached": True,
                "age": round(now - _cache["timestamp"]) if _cache["data"] else 0,
                "data": _cache["data"] or [],
                "rate_limited": True
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

        return jsonify({"cached": False, "age": 0, "data": results})

    except Exception as e:
        print(f"Aircraft fetch error: {e}")
        return jsonify({
            "cached": True,
            "age": 0,
            "data": _cache["data"] or []
        })
