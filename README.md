# 旅伴地圖共筆 Trip Map Collab

這個版本改為 **Google Map 連動的主畫面 + 地點內頁編輯架構**：

- 主畫面：顯示 Google Map、地點列表、行程總覽（唯讀）
- 點擊地圖標記或地點卡片：進入該地點內頁
- 內頁才可編輯：地點資訊、該地點行程、該地點討論
- 討論可標記已處理/未處理，未處理優先顯示

## 啟動

```bash
python3 -m http.server 4173
```

打開 `http://localhost:4173`。

## Google Maps 設定

1. 右上角按「Google Map 設定」
2. 輸入可用的 API Key（需啟用 Maps JavaScript API）
3. 儲存後即可載入 Google 地圖

> 若沒有設定 API Key，畫面會顯示提示訊息，仍可先編輯資料。
