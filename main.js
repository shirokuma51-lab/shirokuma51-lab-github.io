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

  // --- 各モジュールの初期化 ---
  const soundManager = new SoundManager();
  const physicsWorld = new PhysicsWorld(gameEl, soundManager);
  const luckyChanceManager = new LuckyChanceManager();
  const memoryGame = new MemoryGame(memoryAreaEl, soundManager, physicsWorld, luckyChanceManager);

  const slotMachine = new SlotMachine();
  const slotMachineUI = new SlotMachineUI(slotMachineEl);

  // 桁の状態（回転中/停止中/数字）が変化するたびに見た目を更新
  slotMachine.onUpdate(reelStates => {
    slotMachineUI.update(reelStates);
  });

  // 制限時間内に揃わず、全桁が再始動した時の演出（軽く赤く光らせる）
  slotMachine.onResume(() => {
    slotMachineUI.flashResume();
  });

  // 3桁揃って結果が確定した時の処理
  slotMachine.onResult(digits => {
    const isJackpot = digits.every(d => d === digits[0]);
    slotMachineUI.showResult(digits, isJackpot);

    // 実際に「猫を多く落とす」などの報酬反映はPhase3-4で実装予定。
    // 今はどんな結果になったかコンソールで確認できるようにしている。
    console.log("[LuckyChance] 結果:", digits.join(""), isJackpot ? "🎉ゾロ目！" : "");

    setTimeout(() => {
      slotMachineUI.hide();
      if (slotStopTestBtn) slotStopTestBtn.style.display = "none";
      luckyChanceManager.finish();
    }, LUCKY_CHANCE_RESULT_DISPLAY_MS);
  });

  // Lucky Chance発生 → スロット開始
  luckyChanceManager.onTrigger(() => {
    slotMachineUI.show();
    slotMachine.start();
    if (slotStopTestBtn) slotStopTestBtn.style.display = "block";
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
