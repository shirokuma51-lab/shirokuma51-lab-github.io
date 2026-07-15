// ===============================================================
// viewerApp.js
// 視聴者用STOPページ(viewer.html)のロジック。
//
// 【流れ】
// 1. URLの ?id=視聴者ID を読み取る（例: viewer.html?id=abc123）
//    このIDは配信者側の参加権管理の仕組み（プロフィール欄のリンクなど）から
//    発行される想定。IDが無い、または参加権が無い場合はボタンを表示しない。
// 2. Firestoreの「現在のLucky Chanceセッション」をリアルタイムで見て、
//    - 発生中なら、OBS側と同じスロット表示を出し、STOPボタンを押せるようにする
//    - スロットの桁の状態（回転中/停止中/数字）もこの中に含まれているので、
//      OBS側と同じ SlotMachineUI を使ってそのまま描画できる
// 3. ボタンが押されたら、押下記録をFirestoreに1件書き込む。
//    実際にスロットの桁を止める処理はOBS側(main.js)が行う。
// ===============================================================

import { doc, onSnapshot, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebaseInit.js";
import {
  LUCKY_CHANCE_COLLECTION,
  LUCKY_CHANCE_SESSION_DOC,
  LUCKY_CHANCE_PRESSES_COLLECTION
} from "./firebaseConfig.js";
import { canParticipate } from "./participationService.js";
import { SlotMachineUI } from "./slotMachineUI.js";

/** URLの ?id= パラメータから視聴者IDを取得する */
function getViewerIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function main() {
  const statusEl = document.getElementById("status");
  const stopBtn = document.getElementById("stopBtn");
  const slotContainerEl = document.getElementById("slotContainer");
  const resultTextEl = document.getElementById("resultText");

  const slotMachineUI = new SlotMachineUI(slotContainerEl);

  const viewerId = getViewerIdFromURL();
  if (!viewerId) {
    statusEl.textContent = "参加リンクが正しくありません。配信者から案内されたリンクからアクセスしてください。";
    return;
  }

  let eligible = false;
  try {
    eligible = await canParticipate(viewerId);
  } catch (err) {
    console.error("[viewerApp] 参加権の確認に失敗しました:", err);
    statusEl.textContent = "通信エラーが発生しました。少し時間をおいて開き直してください。";
    return;
  }

  if (!eligible) {
    statusEl.textContent = "現在、参加権がありません。";
    return;
  }

  let currentSessionId = null;
  let isSessionActive = false;
  let lastSeenResumeAt = null; // 再始動の演出を、同じ変化に対して二重に出さないための記録
  let lastSeenResultDigits = null; // 結果表示を、同じ結果に対して二重に出さないための記録

  // 現在のLucky Chanceセッションをリアルタイムで監視
  const sessionRef = doc(db, LUCKY_CHANCE_COLLECTION, LUCKY_CHANCE_SESSION_DOC);
  onSnapshot(
    sessionRef,
    snapshot => {
      const data = snapshot.data();
      if (!data) {
        statusEl.textContent = "Lucky Chanceの発生を待っています…";
        stopBtn.disabled = true;
        slotMachineUI.hide();
        return;
      }

      currentSessionId = data.sessionId;
      isSessionActive = Boolean(data.isActive);

      if (isSessionActive) {
        statusEl.textContent = "Lucky Chance発生中！STOPを押そう！";
        stopBtn.disabled = false;
        resultTextEl.style.display = "none";

        // OBS側と同じスロットの状態をそのまま描画する
        if (Array.isArray(data.reels) && data.reels.length > 0) {
          slotMachineUI.show();
          slotMachineUI.update(data.reels);
        }

        // 再始動（惜しかった演出）の検知
        const resumeAtValue = data.lastResumeAt ? data.lastResumeAt.toMillis() : null;
        if (resumeAtValue && resumeAtValue !== lastSeenResumeAt) {
          lastSeenResumeAt = resumeAtValue;
          slotMachineUI.flashResume();
        }
      } else {
        statusEl.textContent = "Lucky Chanceの発生を待っています…";
        stopBtn.disabled = true;

        setTimeout(() => {
          slotMachineUI.hide();
        }, 2000);
      }

      // 結果確定の検知
      if (Array.isArray(data.resultDigits) && data.resultDigits.join(",") !== lastSeenResultDigits) {
        lastSeenResultDigits = data.resultDigits.join(",");
        slotMachineUI.showResult(data.resultDigits, Boolean(data.isJackpot));
        resultTextEl.style.display = "block";
        resultTextEl.textContent = data.isJackpot
          ? `🎉 ${data.resultDigits.join("")} ゾロ目！`
          : `結果: ${data.resultDigits.join("")}`;
      }
    },
    err => {
      console.error("[viewerApp] セッション監視でエラーが発生しました:", err);
      statusEl.textContent = "通信エラーが発生しました。少し時間をおいて開き直してください。";
    }
  );

  // STOPボタン押下 → Firestoreに1件記録
  stopBtn.addEventListener("click", async () => {
    if (!isSessionActive || !currentSessionId) return;

    // 連打で同じ人が何件も送ってしまわないよう、一瞬だけ操作をロックする
    stopBtn.disabled = true;

    try {
      await addDoc(collection(db, LUCKY_CHANCE_PRESSES_COLLECTION), {
        sessionId: currentSessionId,
        viewerId,
        pressedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("[viewerApp] STOP送信に失敗しました:", err);
    }

    setTimeout(() => {
      if (isSessionActive) stopBtn.disabled = false;
    }, 300);
  });
}

document.addEventListener("DOMContentLoaded", main);
