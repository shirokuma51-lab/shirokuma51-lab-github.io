// ===============================================================
// firebaseInit.js
// Firebaseアプリの初期化を行い、Firestoreインスタンスを他ファイルへ提供する。
//
// ビルドツールを使わない構成なので、Firebase公式CDNのモジュール版を
// import して使用している（npm installは不要）。
// ===============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// Firestore（データベース）インスタンス。他ファイルからはこれをimportして使う
export const db = getFirestore(app);
