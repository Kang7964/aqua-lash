# Aqua Lash Lab 上線步驟

## 1. 建立 Google Sheet 後台

1. 到 Google Drive 建立一份新的 Google 試算表。
2. 建議命名為 `Aqua Lash Lab 預約資料`。
3. 在試算表上方選單點 `擴充功能` -> `Apps Script`。
4. 把 `google-apps-script.gs` 的全部內容貼到 Apps Script 編輯器。
5. 儲存後，先在函式下拉選單選 `setupAquaLashSheets`。
6. 按 `執行`，依畫面授權。
7. 回到試算表，會看到兩個工作表：
   - `AquaLashState`
   - `Reservations`

## 2. 部署 Apps Script

1. 在 Apps Script 右上角點 `部署` -> `新增部署作業`。
2. 類型選 `網頁應用程式`。
3. `執行身分` 選 `我`。
4. `誰可以存取` 選 `任何人`。
5. 按 `部署`。
6. 複製產生的 Web App URL，網址通常會以 `/exec` 結尾。

## 3. 貼回網站設定

打開 `cloud-config.js`，把網址貼進去：

```js
window.AQUA_LASH_API_URL = "你的 Google Apps Script Web App URL";
```

## 4. 測試同步

1. 重新整理網站。
2. 點 `店家`，輸入密碼 `939393`。
3. 新增一個時段或服務。
4. 回 Google Sheet 檢查 `AquaLashState` 是否有更新。
5. 客戶送出預約後，`Reservations` 工作表會看到清楚的預約紀錄。

## 5. 上傳公開網站

把這些檔案一起上傳到 Netlify 或 Vercel：

- `index.html`
- `styles.css`
- `app.js`
- `cloud-config.js`

`google-apps-script.gs` 不用上傳到網站，它只放在 Google Apps Script。

## 注意

這是適合小型工作室的輕量版後台。店家密碼可以避免一般客人誤按管理功能，但不是正式會員登入系統。之後如果預約量變多，建議升級成真正的後端登入與資料庫。
