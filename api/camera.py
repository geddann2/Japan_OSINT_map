import os
import json
import glob
from datetime import datetime
from flask import jsonify, request

CAMERAS_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "cameras")


def get_camera():
    results = []

    pattern = os.path.join(CAMERAS_DIR, "*.json")
    for path in glob.glob(pattern):
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            for cam in data:
                if cam.get("lat") is None or cam.get("lon") is None:
                    continue
                results.append({
                    "name":      cam.get("name", "不明"),
                    "pref":      cam.get("pref", ""),
                    "city":      cam.get("city", ""),
                    "lat":       cam["lat"],
                    "lon":       cam["lon"],
                    "youtube":   cam.get("youtube"),
                    "embed":     cam.get("embed", None),
                    "has_embed": "embed" in cam,
                })
        except Exception as e:
            print(f"Camera JSON read error ({path}): {e}")

    return jsonify(results)


def _write_json_safe(path, data):
    """一時ファイルに書いてからリネーム（書き込み中の破損を防ぐ）"""
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, path)


def set_embed():
    """
    POST /api/camera/embed
    body: { "youtube": "https://...", "embed": true/false }
    """
    body = request.get_json()
    youtube_url = body.get("youtube")
    embed = body.get("embed")

    if not youtube_url or embed is None:
        return jsonify({"error": "invalid params"}), 400

    pattern = os.path.join(CAMERAS_DIR, "*.json")
    for path in glob.glob(pattern):
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)

            updated = False
            for cam in data:
                if cam.get("youtube") == youtube_url:
                    cam["embed"] = embed
                    updated = True
                    print(
                        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
                        f"embed={'OK' if embed else 'NG'}: "
                        f"{cam.get('pref')} {cam.get('city')} {cam.get('name')} | {youtube_url}"
                    )

            if updated:
                _write_json_safe(path, data)

        except Exception as e:
            print(f"embed update error ({path}): {e}")

    return jsonify({"ok": True})


def report_embed_ng():
    """
    POST /api/camera/embed_ng
    body: { "youtube": "https://..." }
    YouTubeのiframeエラー(101/150)で自動的にNGを記録する
    """
    body = request.get_json()
    youtube_url = body.get("youtube")
    if not youtube_url:
        return jsonify({"error": "youtube required"}), 400

    pattern = os.path.join(CAMERAS_DIR, "*.json")
    for path in glob.glob(pattern):
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)

            updated = False
            for cam in data:
                if cam.get("youtube") == youtube_url:
                    cam["embed"] = False
                    updated = True
                    print(
                        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
                        f"embed_ng(auto): {cam.get('pref')} {cam.get('city')} "
                        f"{cam.get('name')} | {youtube_url}"
                    )

            if updated:
                _write_json_safe(path, data)

        except Exception as e:
            print(f"embed_ng update error ({path}): {e}")

    return jsonify({"ok": True})