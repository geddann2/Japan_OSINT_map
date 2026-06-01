"""
APIカウンター（共有モジュール）
aircraft.py と ship.py から import して使う
"""
from datetime import date

_counters = {
    "aircraft": {"count": 0, "date": str(date.today())},
    "ship":     {"count": 0, "date": str(date.today())},
}

def increment(key):
    today = str(date.today())
    if _counters[key]["date"] != today:
        _counters[key] = {"count": 0, "date": today}
    _counters[key]["count"] += 1

def get_counts():
    today = str(date.today())
    return {
        "aircraft": _counters["aircraft"]["count"] if _counters["aircraft"]["date"] == today else 0,
        "ship":     _counters["ship"]["count"]     if _counters["ship"]["date"]     == today else 0,
        "date":     today,
    }