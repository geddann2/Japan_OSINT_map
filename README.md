# Japan OSINT Dashboard

OSINTを活用した日本周辺のリアルタイム監視Webアプリケーション。  
航空機・船舶・地震・監視カメラの情報を地図上にリアルタイムで表示します。

---

## 使用技術

| 種別 | 技術 |
|------|------|
| バックエンド | Python / Flask / SQLite |
| フロントエンド | Leaflet.js |
| 船舶通信 | WebSocket (AISStream) |

---

## 使用API・データソース

- **気象庁 地震情報 API**  
  https://www.jma.go.jp/bosai/quake/data/list.json

- **OpenSky Network API**（航空機）  
  https://opensky-network.org/

- **AISStream**（船舶 AIS WebSocket）  
  https://aisstream.io/

- **アイコン画像**  
  https://icons8.jp/

---

## 主な機能

### ✈ 航空機
- 日本周辺の飛行中の航空機をリアルタイム表示
- 表示情報：コールサイン・国籍・高度・速度・針路
- マーカークリックで飛行ルートを地図上に描画（SQLite保存、3時間TTL）
- 針路に応じてアイコンが回転

### ⚓ 船舶
- AISStreamのWebSocket接続による船舶のリアルタイム表示
- 表示情報：船名・MMSI・速度・針路
- 針路に応じてアイコンが回転

### ⚡ 地震
- 気象庁APIから最新の地震情報を取得・表示
- 震度3以上の震源をマップ上にアイコン表示
- 地震ログパネル（最新10件表示 / 全件展開）
- ログ行クリックで震源地に移動・ポップアップ表示
- 震度別に色分けされたバッジ・カラーバー

### 📷 監視カメラ
- cametan.com等からスクレイピングしたカメラ情報を表示
- YouTubeライブ映像をポップアップ内でインライン再生
- 埋め込み可否を手動（OK/NG）または自動（iframeエラー101/150）で判定・保存
- カメラ状態に応じた3種類のアイコン（通常 / NG / 未確認）

### 共通
- 各レイヤーの表示/非表示切り替えボタン
- 都道府県境の表示
- ダークテーマUI

---

## 工夫した点

- OpenSky APIの負荷軽減のため、サーバー側で1分間キャッシュを実装
- 航空機マーカーの差分更新により描画パフォーマンスを向上
- 航空機のルートをSQLiteで永続化（サーバー再起動後も3時間分を保持）
- YouTubeのiframeエラーを自動検知し、埋め込みNG状態をJSONに書き戻す
- OpenSky APIのデイリーリクエスト数をサーバー側でカウントし、UIに表示

---

## セットアップ

### 環境変数（`.env`）

```env
OPENSKY_USER=あなたのユーザー名
OPENSKY_PASS=あなたのパスワード
AISSTREAM_KEY=あなたのAISSTREAM APIキー
```

### 起動

```bash
pip install -r requirements.txt
python app.py
```

---

## ファイル構成

```
├── app.py                  # Flaskルーティング
├── api/
│   ├── aircraft.py         # 航空機取得・ルート保存
│   ├── ship.py             # 船舶WebSocket
│   ├── earthquake.py       # 地震情報取得
│   ├── camera.py           # カメラ情報・embed管理
│   └── counter.py          # APIリクエストカウンター
├── static/
│   ├── js/
│   │   ├── layers.js       # マップ初期化・レイヤー切替
│   │   ├── aircraft.js     # 航空機マーカー・ルート描画
│   │   ├── ship.js         # 船舶マーカー
│   │   ├── earthquake.js   # 地震マーカー・ログ
│   │   ├── camera.js       # カメラマーカー・ポップアップ
│   │   └── prefecture_border.js
│   ├── css/style.css
│   ├── cameras/            # カメラ情報JSON（pref別）
│   └── images/
├── aircraft_route.db       # 航空機ルートDB（自動生成）
```

---

## 注意事項

- OpenSky Networkの無料プランは1日約400リクエスト制限があります。登録ユーザーでの利用を推奨します。
- 表示される位置情報は必ずしも正確ではありません。
- AISStreamの無料プランには接続数・データ量の制限があります。