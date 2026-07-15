// ===============================================================
// main.js
// アプリのエントリーポイント。
// 各モジュール（SoundManager / PhysicsWorld / MemoryGame / OptionMenu）を
// 初期化し、DOM要素・イベントと結びつける。
//
// 今後 Phase2以降で Firebase連携やLucky Chance機能を追加する際は、
// ここに新しいモジュールのimportと初期化処理を足していく形になる想定。
// ===============================================================

import { SoundManager } from "./soundManager.js";
import { PhysicsWorld } from "./physicsWorld.js";
import { MemoryGame } from "./memoryGame.js";
import { OptionMenu } from "./optionMenu.js";
import { setupResizeHandler } from "./resizeHandler.js";
import { LuckyChanceManager } from "./luckyChanceManager.js";
import { SlotMachine } from "./slotMachine.js";
import { SlotMachineUI } from "./slotMachineUI.js";
import {
  startLuckyChanceSession,
  endLuckyChanceSession,
  listenForPresses,
  publishSlotState,
  publishSlotResume,
  publishSlotResult
} from "./luckyChanceSync.js";
import { LUCKY_CHANCE_RESULT_DISPLAY_MS } from "./constants.js";

function main() {
  // --- DOM要素の取得 ---
  const gameEl = document.getElementById("game");
  const memoryAreaEl = document.getElementById("memory");

  const startBtn = document.getElementById("startBtn");
  const resetBtn = document.getElementById("resetBtn");
  const optionBtn = document.getElementById("optionBtn");
  const closeOptionBtn = document.getElementById("closeOption");
  const optionMenuEl = document.getElementById("optionMenu");
  const cardCountSelect = document.getElementById("cardCount");
  const iconCountSelect = document.getElementById("iconCount");

  const slotMachineEl = document.getElementById("slotMachine");
  const slotStopTestBtn = document.getElementById("slotStopTestBtn");
  const emergencyStopBtn = document.getElementById("emergencyStopBtn");

  // --- 各モジュールの初期化 ---
  const soundManager = new SoundManager();
  const physicsWorld = new PhysicsWorld(gameEl, soundManager);
  const luckyChanceManager = new LuckyChanceManager();
  const memoryGame = new MemoryGame(memoryAreaEl, soundManager, physicsWorld, luckyChanceManager);

  const slotMachine = new SlotMachine();
  const slotMachineUI = new SlotMachineUI(slotMachineEl);

  // Firebase経由の視聴者STOP押下を監視するための状態
  let unsubscribePresses = null;
  let activeSessionId = null;

  /** Lucky Chance終了時に、Firebase側の監視・セッションを片付ける */
  function cleanupLuckyChanceSession() {
    if (unsubscribePresses) {
      unsubscribePresses();
      unsubscribePresses = null;
    }
    if (activeSessionId) {
      endLuckyChanceSession();
      activeSessionId = null;
    }
  }

  /** スロット演出・仮テストボタンを非表示に戻す（結果確定時・緊急停止時の両方で使う） */
  function closeLuckyChanceUI() {
    slotMachineUI.hide();
    if (slotStopTestBtn) slotStopTestBtn.style.display = "none";
  }

  // 桁の状態（回転中/停止中/数字）が変化するたびに見た目を更新
  // ＋ 視聴者ページにも同じ状態を配信する（Firebase未設定なら内部で無視される）
  slotMachine.onUpdate(reelStates => {
    slotMachineUI.update(reelStates);
    publishSlotState(reelStates);
  });

  // 制限時間内に揃わず、全桁が再始動した時の演出（軽く赤く光らせる）＋ 配信
  slotMachine.onResume(() => {
    slotMachineUI.flashResume();
    publishSlotResume();
  });

  // 3桁揃って結果が確定した時の処理
  slotMachine.onResult(digits => {
    const isJackpot = digits.every(d => d === digits[0]);
    slotMachineUI.showResult(digits, isJackpot);
    publishSlotResult(digits, isJackpot);

    // 実際に「猫を多く落とす」などの報酬反映はPhase3-4で実装予定。
    // 今はどんな結果になったかコンソールで確認できるようにしている。
    console.log("[LuckyChance] 結果:", digits.join(""), isJackpot ? "🎉ゾロ目！" : "");

    setTimeout(() => {
      closeLuckyChanceUI();
      luckyChanceManager.finish();
      cleanupLuckyChanceSession();
    }, LUCKY_CHANCE_RESULT_DISPLAY_MS);
  });

  // Lucky Chance発生 → スロット開始 ＋ 視聴者ページからのSTOP押下を受け付け開始
  luckyChanceManager.onTrigger(async () => {
    slotMachineUI.show();
    slotMachine.start();
    if (slotStopTestBtn) slotStopTestBtn.style.display = "block";

    // Firebase側にセッションを立てて、視聴者ページからの押下監視を開始する。
    // Firebase未設定などで失敗しても、テストボタンでの動作には影響しない。
    activeSessionId = await startLuckyChanceSession();
    if (activeSessionId) {
      unsubscribePresses = listenForPresses(activeSessionId, () => {
        slotMachine.press();
      });
    }
  });

  // 【動作確認用の仮ボタン】
  // 本来は視聴者用Webページ→Firebase経由で複数人が押すことでslotMachine.press()が
  // 呼ばれる想定（Phase3-3で実装）。それができるまでの間、配信者がこのボタンを
  // 連打することで「誰かが押した」動きを手元で確認できるようにしている。
  if (slotStopTestBtn) {
    slotStopTestBtn.addEventListener("click", () => {
      slotMachine.press();
    });
  }

  // Lucky Chance緊急停止（配信者専用）。
  // 発生していない時に押しても何も起きない。発生中に押すと、
  // その場でスロットを止めて演出を消し、視聴者ページのSTOPボタンも
  // 自動的に押せなくする（結果は確定させず、報酬も発生しない）。
  if (emergencyStopBtn) {
    emergencyStopBtn.addEventListener("click", () => {
      if (!luckyChanceManager.isActive) return;

      slotMachine.forceStop();
      closeLuckyChanceUI();
      luckyChanceManager.finish();
      cleanupLuckyChanceSession();
    });
  }

  const optionMenu = new OptionMenu({
    menuElement: optionMenuEl,
    openButton: optionBtn,
    closeButton: closeOptionBtn,
    cardCountSelect,
    iconCountSelect
  });

  // --- イベント結線 ---
  startBtn.addEventListener("click", () => {
    memoryGame.start(optionMenu.getPairCount(), optionMenu.getTypeCount());
  });

  resetBtn.addEventListener("click", () => {
    memoryGame.reset();
  });

  // --- リサイズ対応 ---
  setupResizeHandler(gameEl);
}

document.addEventListener("DOMContentLoaded", main);
