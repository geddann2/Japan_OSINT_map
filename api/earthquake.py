import requests
from flask import jsonify

# 都道府県コード（気象庁参考）
PREF_MAP = {
    "01": "北海道", "02": "青森県", "03": "岩手県", "04": "宮城県", "05": "秋田県",
    "06": "山形県", "07": "福島県", "08": "茨城県", "09": "栃木県", "10": "群馬県",
    "11": "埼玉県", "12": "千葉県", "13": "東京都", "14": "神奈川県", "15": "新潟県",
    "16": "富山県", "17": "石川県", "18": "福井県", "19": "山梨県", "20": "長野県",
    "21": "岐阜県", "22": "静岡県", "23": "愛知県", "24": "三重県", "25": "滋賀県",
    "26": "京都府", "27": "大阪府", "28": "兵庫県", "29": "奈良県", "30": "和歌山県",
    "31": "鳥取県", "32": "島根県", "33": "岡山県", "34": "広島県", "35": "山口県",
    "36": "徳島県", "37": "香川県", "38": "愛媛県", "39": "高知県", "40": "福岡県",
    "41": "佐賀県", "42": "長崎県", "43": "熊本県", "44": "大分県", "45": "宮崎県",
    "46": "鹿児島県", "47": "沖縄県"
}

def _intensity_value(i):
    order = {
        "1": 1, "2": 2, "3": 3, "4": 4,
        "5-": 5, "5+": 6,
        "6-": 7, "6+": 8,
        "7": 9
    }
    return order.get(i, 0)

def get_earthquake():
    url = "https://www.jma.go.jp/bosai/quake/data/list.json"
    data = requests.get(url).json()
    results = []

    for eq in data:
        try:
            # 重複、データの欠損がおこるため除外
            if eq["ttl"] not in ["震度速報", "震源・震度情報"]:
                continue

            maxi = eq["maxi"]
            cod = eq["cod"]
            parts = cod.replace("/", "").split("+")
            lat = float(parts[1])
            lon_depth = parts[2].split("-")
            lon = float(lon_depth[0])

            prefs = {}
            # 震度４以上の地域のみ表記
            for area in eq["int"]:
                for city in area["city"]:
                    city_maxi = city["maxi"]
                    if city_maxi in ["4", "5-", "5+", "6-", "6+", "7"]:
                        code = city["code"][:2]
                        pref = PREF_MAP.get(code, "不明")
                        if pref in prefs:
                            if _intensity_value(city_maxi) > _intensity_value(prefs[pref]):
                                prefs[pref] = city_maxi
                        else:
                            prefs[pref] = city_maxi

            results.append({
                "lat":   lat,
                "lon":   lon,
                "place": eq["anm"],
                "mag":   eq["mag"],
                "maxi":  maxi,
                "prefs": prefs,
                "at":    eq["at"]
            })
        except (KeyError, ValueError, IndexError):
             continue

    return jsonify(results)
