// ===============================================================
// firebaseConfig.js
// Firebaseプロジェクトの接続情報。
//
// 【使い方】
// Firebaseコンソール（https://console.firebase.google.com/）で
// プロジェクトを作成し、「プロジェクトの設定」→「マイアプリ」→
// 「SDK の設定と構成」に表示される値をここに貼り付けてください。
//
// このファイルの値を書き換えるだけで、他のFirebase関連ファイルは
// 一切変更する必要がありません。
// ===============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyAucRpmiRDuWK5qFEj11oAepAosWezWXhQ",
  authDomain: "your-api-key-87e31.firebaseapp.com",
  projectId: "your-api-key-87e31",
  storageBucket: "your-api-key-87e31.firebasestorage.app",
  messagingSenderId: "498476749816",
  appId: "1:498476749816:web:ab591e34401ba0f916bc0d"
};

// Firestoreの中で使うコレクション名（視聴者データを入れる場所）
// 将来コレクション構成を変える場合はここだけ直せばよい
export const VIEWERS_COLLECTION = "viewers";

// Lucky Chanceの「現在進行中のセッション」を1件だけ保持するドキュメント
// （視聴者ページはこれを見て「今押せるかどうか」を判断する）
export const LUCKY_CHANCE_COLLECTION = "luckyChance";
export const LUCKY_CHANCE_SESSION_DOC = "currentSession";

// 視聴者がSTOPを押すたびに1件追加されるコレクション
export const LUCKY_CHANCE_PRESSES_COLLECTION = "luckyChancePresses";
