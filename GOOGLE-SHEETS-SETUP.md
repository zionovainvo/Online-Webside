# Google Sheets order sync

1. Create a Google Sheet and copy its ID from the URL. It is the value between `/d/` and `/edit`.
2. Open **Extensions > Apps Script**, replace the editor contents with `google-apps-script.gs`, and replace `PASTE_YOUR_GOOGLE_SHEET_ID_HERE` with the Sheet ID.
3. Select **Deploy > New deployment**, choose **Web app**, set **Execute as** to yourself, set access to **Anyone**, and deploy.
4. Copy the `/exec` web-app URL.
5. Log in to `admin.html`, open **Settings**, paste the URL into **Google Sheets Web App URL**, and save.

The `Orders` tab is created automatically. Online checkout and POS sales append one row per order. Opening the admin dashboard downloads the sheet orders and uses the combined data for dashboard totals, Sales Reports, daily sales, monthly sales, and best sellers.