/* ============================================================
   ZIONOVA — Firebase Configuration
   ============================================================
   HOW TO GET THESE VALUES (takes ~5 minutes, free):
   1. Go to https://console.firebase.google.com and click "Add project".
      Name it "Zionova" (or anything) and finish the setup wizard.
   2. Inside your new project, click the "</>" (Web) icon to register
      a web app. Give it a nickname e.g. "Zionova Website".
   3. Firebase will show you a firebaseConfig object — copy those
      values into the object below (apiKey, authDomain, etc).
   4. In the left menu, go to Build > Firestore Database > Create
      Database. Start in "Production mode" (we set our own rules below).
   5. In the left menu, go to Build > Authentication > Get Started >
      Sign-in method > enable "Email/Password".
      Then go to the "Users" tab > "Add user" and create YOUR admin
      login (e.g. admin@zionova.com + a password). That's the login
      you'll use on admin.html.
   6. Go to Firestore Database > Rules and paste this (then Publish):

      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /products/{doc} { allow read: if true; allow write: if request.auth != null; }
          match /orders/{doc}   { allow read: if request.auth != null; allow create: if true; allow update, delete: if request.auth != null; }
          match /settings/{doc} { allow read: if true; allow write: if request.auth != null; }
        }
      }

      This lets customers browse products and place orders, but only
      YOUR logged-in admin account can edit products, view/manage
      orders, or change site settings.
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAHaRniwVmaqpcrBYczwL_mN0d3Wxp4KQM",
  authDomain: "zionova-website.firebaseapp.com",
  projectId: "zionova-website",
  storageBucket: "zionova-website.firebasestorage.app",
  messagingSenderId: "446656720368",
  appId: "1:446656720368:web:f06d219ca91e8bbbdd4135"
};
