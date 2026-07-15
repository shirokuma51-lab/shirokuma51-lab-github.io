// ===============================================================
// luckyChanceSync.js
// OBS側（配信画面）で使う、Lucky Chanceの
// 「セッション管理」「スロット状態の配信」「視聴者からのSTOP押下の受信」の窓口。
//
// 【仕組み】
// 1. Lucky Chanceが発生したら startLuckyChanceSession() を呼び、
//    Firestoreに「今このセッションIDが有効です」という印を立てる。
// 2. OBS側のスロット(slotMachine.js)が回転・停止するたびに
//    publishSlotState() / publishSlotResume() / publishSlotResult() を呼び、
//    今の桁の状態をFirestoreに書き込む。
// 3. 視聴者ページ(viewer.html)はこの状態をリアルタイムに読み取り、
//    OBS側と同じスロットを自分の画面にも表示する（＝中継のように見える）。
//    STOPボタンが押されると luckyChancePresses に1件記録する。
// 4. OBS側は listenForPresses() でその記録をリアルタイムに監視し、
//    新しい記録が来るたびに slotMachine.press() を呼び出す。
// 5. スロットの結果が確定したら endLuckyChanceSession() を呼んで
//    セッションを無効化する（視聴者側のボタンも自動的に押せなくなる）。
//
// 【注意】
// Firebaseプロジェクトの設定（firebaseConfig.js）が未設定のままだと
// 通信は失敗しますが、その場合もエラーはこのファイル内で処理され、
// 神経衰弱本体やスロットの見た目には影響しないようにしている
// （＝Firebase未設定でもゲーム自体は今まで通り動く）。
// ===============================================================

import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "./firebaseInit.js";
import {
  LUCKY_CHANCE_COLLECTION,
  LUCKY_CHANCE_SESSION_DOC,
  LUCKY_CHANCE_PRESSES_COLLECTION
} from "./firebaseConfig.js";

function sessionDocRef() {
  return doc(db, LUCKY_CHANCE_COLLECTION, LUCKY_CHANCE_SESSION_DOC);
}

/**
 * 新しいLucky Chanceセッションを開始する（OBS側で、スロット開始時に呼ぶ）
 * @returns {Promise<string|null>} 発行されたセッションID。失敗時はnull
 */
export async function startLuckyChanceSession() {
  const sessionId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  try {
    await setDoc(sessionDocRef(), {
      sessionId,
      isActive: true,
      startedAt: serverTimestamp(),
      reels: [],
      resultDigits: null,
      isJackpot: null,
      lastResumeAt: null
    });
    return sessionId;
  } catch (err) {
    console.error("[LuckyChanceSync] セッション開始に失敗しました:", err);
    return null;
  }
}

/**
 * 今のスロットの桁の状態をFirestoreに送信する（OBS側で、桁が変化するたびに呼ぶ）
 * @param {Array<{digit:number, isSpinning:boolean}>} reelStates
 */
export async function publishSlotState(reelStates) {
  try {
    await updateDoc(sessionDocRef(), { reels: reelStates });
  } catch (err) {
    console.error("[LuckyChanceSync] スロット状態の送信に失敗しました:", err);
  }
}

/** 制限時間切れで全桁が再始動したことをFirestoreに送信する（OBS側で呼ぶ） */
export async function publishSlotResume() {
  try {
    await updateDoc(sessionDocRef(), { lastResumeAt: serverTimestamp() });
  } catch (err) {
    console.error("[LuckyChanceSync] 再始動の送信に失敗しました:", err);
  }
}

/**
 * スロットの結果をFirestoreに送信する（OBS側で、結果確定時に呼ぶ）
 * @param {number[]} digits
 * @param {boolean} isJackpot
 */
export async function publishSlotResult(digits, isJackpot) {
  try {
    await updateDoc(sessionDocRef(), { resultDigits: digits, isJackpot });
  } catch (err) {
    console.error("[LuckyChanceSync] 結果の送信に失敗しました:", err);
  }
}

/** Lucky Chanceセッションを終了する（OBS側で、結果確定時に呼ぶ） */
export async function endLuckyChanceSession() {
  try {
    await updateDoc(sessionDocRef(), { isActive: false });
  } catch (err) {
    console.error("[LuckyChanceSync] セッション終了に失敗しました:", err);
  }
}

/**
 * 指定したセッションへのSTOP押下をリアルタイムで監視する（OBS側で呼ぶ）
 * @param {string} sessionId
 * @param {Function} onPress - 新しい押下が来るたびに呼ばれるコールバック
 * @returns {Function} 監視を止めるための関数（何もしていない場合は何もしない関数）
 */
export function listenForPresses(sessionId, onPress) {
  if (!sessionId) return () => {};

  try {
    const pressesRef = collection(db, LUCKY_CHANCE_PRESSES_COLLECTION);
    const q = query(pressesRef, where("sessionId", "==", sessionId), orderBy("pressedAt", "asc"));

    return onSnapshot(
      q,
      snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === "added") {
            onPress(change.doc.data());
          }
        });
      },
      err => {
        console.error("[LuckyChanceSync] 押下の監視でエラーが発生しました:", err);
      }
    );
  } catch (err) {
    console.error("[LuckyChanceSync] 押下の監視を開始できませんでした:", err);
    return () => {};
  }
}
