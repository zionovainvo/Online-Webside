/* ============================================================
   ZIONOVA — Firebase Initialization
   Loaded after the Firebase SDK <script> tags and firebase-config.js
   ============================================================ */

let fbReady = false;
let db = null;
let auth = null;
let storage = null;

try{
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();
  storage = firebase.storage();
  fbReady = true;
}catch(e){
  console.error('Firebase failed to initialize. Did you paste your keys into firebase-config.js?', e);
}

/* Shown on any page if Firebase isn't configured yet, so the site
   fails clearly instead of silently doing nothing. */
function checkFirebaseConfigured(){
  if(!fbReady || firebaseConfig.apiKey === 'YOUR_API_KEY'){
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b3261e;color:#fff;text-align:center;padding:10px;font-family:sans-serif;font-size:13px;';
    bar.innerHTML = '⚠️ Firebase is not connected yet. Open <code>firebase-config.js</code> and paste in your project keys (see the instructions inside that file).';
    document.body.prepend(bar);
    return false;
  }
  return true;
}
