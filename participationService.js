// ===============================================================
// participationService.js
// 「視聴者ごとの参加権・視聴時間データ」を扱うサービス層。
//
// 【設計方針】
// ・参加権(canParticipate)を「誰に付与するか」の判断ロジックはこのコード内には持たない。
//   判断は配信者側の外部の仕組み（プロフィール欄のリンクなど）で行い、
//   その結果としてFirestore上の canParticipate フラグが更新される想定。
// ・このファイルはあくまで「今のフラグを読む」「将来書き込む場所を用意する」役割に徹する。
// ・視聴時間(watchTimeMinutes)の更新ロジックは今後ご自身で実装される予定のため、
//   ここでは呼び出すだけで使える関数の型だけ用意しておく（中身は最小実装）。
// ===============================================================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "./firebaseInit.js";
import { VIEWERS_COLLECTION } from "./firebaseConfig.js";

/**
 * 指定した視聴者のドキュメント参照を取得する
 * @param {string} viewerId - 視聴者を一意に識別するID（配信プラットフォームのユーザー名など）
 */
function getViewerRef(viewerId) {
  return doc(db, VIEWERS_COLLECTION, viewerId);
}

/**
 * 視聴者データを取得する
 * @param {string} viewerId
 * @returns {Promise<Object|null>} データが無ければnull
 */
export async function getViewerData(viewerId) {
  const snapshot = await getDoc(getViewerRef(viewerId));
  return snapshot.exists() ? snapshot.data() : null;
}

/**
 * 視聴者に参加権があるかどうかを判定する
 * （判定基準そのものはこの関数の外＝配信者側の運用で決める。ここは値を読むだけ）
 * @param {string} viewerId
 * @returns {Promise<boolean>}
 */
export async function canParticipate(viewerId) {
  const data = await getViewerData(viewerId);
  return Boolean(data?.canParticipate);
}

/**
 * 視聴者データが存在しない場合に初期ドキュメントを作成する
 * （プロフィールリンク経由の参加権管理ツール側から呼ばれる想定。
 *   ゲーム側から直接使うことは基本無い想定だが、動作確認用に用意）
 * @param {string} viewerId
 */
export async function ensureViewerDocument(viewerId) {
  const ref = getViewerRef(viewerId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      watchTimeMinutes: 0,
      canParticipate: false,
      updatedAt: serverTimestamp()
    });
  }
}

// -----------------------------------------------------------------
// 【拡張ポイント】視聴時間の更新
// 実際の計測ロジック（何分視聴したら加算するか等）はご自身で実装される想定のため、
// ここでは「Firestoreへの書き込み方」だけを最小限用意しています。
// 計測側の実装が完成したら、この関数を呼び出すだけで反映できます。
// -----------------------------------------------------------------

/**
 * 視聴者の累計視聴時間(分)を更新する
 * @param {string} viewerId
 * @param {number} watchTimeMinutes - 更新後の累計視聴時間（分）
 */
export async function updateWatchTime(viewerId, watchTimeMinutes) {
  const ref = getViewerRef(viewerId);
  await updateDoc(ref, {
    watchTimeMinutes,
    updatedAt: serverTimestamp()
  });
}
