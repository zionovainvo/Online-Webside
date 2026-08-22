# Zionova Website — Setup Guide

Your site now runs on **Firebase** (a free Google cloud database), so every
change — products, orders, admin login, even your site's colours and text —
is stored in one shared place. That fixes both problems you had before:
edits made on your laptop now show up on your phone / any other device
immediately, and social link changes take effect right away.

There are two short one-time setups to do before the site works:
**(1) Firebase** (required) and **(2) Google Sheets sync** (optional).

---

## 1. Firebase Setup (required — takes ~5 minutes)

1. Go to **https://console.firebase.google.com** and click **"Add project"**.
   Name it "Zionova" (or anything) → finish the wizard (you can turn off
   Google Analytics, it's not needed).

2. Inside the new project, click the **`</>`  (Web)** icon to register a web
   app. Give it a nickname like "Zionova Website" → **Register app**.
   Firebase will show you a code block that looks like this:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "zionova-xxxxx.firebaseapp.com",
     projectId: "zionova-xxxxx",
     storageBucket: "zionova-xxxxx.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

   **Copy those exact values into `firebase-config.js`** in your website
   folder, replacing the placeholder text.

3. In the left sidebar: **Build → Firestore Database → Create Database**.
   Choose any nearby region → Start in **Production mode**.

4. Still in Firestore, click the **Rules** tab, delete everything there, and
   paste this in (then click **Publish**):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /products/{doc} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /orders/{doc} {
         allow read: if request.auth != null;
         allow create: if true;
         allow update, delete: if request.auth != null;
       }
       match /settings/{doc} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

   This means: customers can browse products and place orders, but only
   **you**, logged into `admin.html`, can edit products, view the orders
   list, or change site settings/design.

5. In the left sidebar: **Build → Authentication → Get started →
   Sign-in method** → enable **Email/Password**.

6. Go to the **Users** tab (still in Authentication) → **Add user** → enter
   your own email and a password. This is what you'll type into
   `admin.html` to log in. You can add more staff logins the same way later.

That's it — open `index.html`, add a couple of products from
`admin.html` → Products, and your store is live and syncing across every
device.

> **Tip:** because this site uses `fetch`/Firebase over the network, it
> works best when opened via a real web server rather than double-clicking
> the file. If you're testing locally, run `python3 -m http.server` in the
> folder and open `http://localhost:8000`. When you're ready to publish,
> upload the whole folder to any static host (Netlify, Vercel, GitHub
> Pages, Firebase Hosting itself, or your own web hosting).

---

## 2. Google Sheets Order Sync (optional)

This lets every order (online checkout **and** POS sales) automatically
append as a new row in a Google Sheet — useful for backups, sharing with
an accountant, etc. It's separate from Firebase and takes about 3 minutes.

1. Create a new Google Sheet (or use an existing one). Add a header row:
   `Order ID | Date | Customer Name | Phone | Email | Items | Subtotal | Shipping | Total | Payment Method | Source`

2. In the Sheet, go to **Extensions → Apps Script**. Delete the placeholder
   code and paste this in:

   ```js
   function doPost(e) {
     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     var data = JSON.parse(e.postData.contents);
     sheet.appendRow([
       data.orderId,
       data.date,
       data.customerName,
       data.customerPhone,
       data.customerEmail,
       data.items,
       data.subtotal,
       data.shipping,
       data.total,
       data.paymentMethod,
       data.source
     ]);
     return ContentService
       .createTextOutput(JSON.stringify({ status: 'success' }))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```

3. Click **Deploy → New deployment**. For "Select type" choose
   **Web app**. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click **Deploy**, authorize the permissions Google asks for, then copy
   the **Web app URL** it gives you (ends in `/exec`).

4. In your site, go to `admin.html` → **Settings → Integrations → Google
   Sheets Order Sync**, paste that URL into the field, click **Save
   Connection**, then **Send Test Row** to confirm a row appears in your
   sheet.

From then on, every order placed (online or via POS) is pushed to that
sheet automatically in the background.

---

## 3. Exporting Sales Reports to Excel

In `admin.html` → **Sales Reports**, click **Export to Excel**. It
downloads a real `.xlsx` file (opens directly in Excel/Google Sheets) with
every order from the current month, including customer, items, totals,
payment method, and source.

---

## 4. Website Editor (colours, fonts, text, images)

`admin.html` → **Website Editor** lets you change, live, without touching
any code:
- Hero/about text and tagline
- Hero background image and about-section image (paste any image URL)
- Background / text / gold accent colours
- One of three font pairings

Every change saves straight to Firebase and appears on the live storefront
within a second or two — open `index.html` in another tab while editing to
watch it update in real time.

---

## Notes & Limits

- **Cart** (the shopping bag before checkout) is stored in the browser only
  — that's normal for e-commerce sites and matches how most stores behave
  for guests.
- **Product/hero/about images** are pasted as URLs (e.g. from Imgur, your
  own hosting, or a public Google Drive image link) rather than uploaded
  directly — direct upload would need Firebase Storage, which is an easy
  add-on later if you want it.
- **Payment methods** (Card/Bank Transfer) are recorded but not actually
  processed — connecting a real gateway (Stripe, PayHere, etc.) is a
  separate integration.
- Keep `firebase-config.js` and your Firestore rules as shown above —
  don't set Firestore rules to fully public read/write, or anyone could
  edit your products or see your orders.
