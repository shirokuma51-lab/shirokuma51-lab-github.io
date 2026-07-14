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
  LUCKY_CHANCE_PLACEHOLDER_AUTO_STOP_MIN_MS,
  LUCKY_CHANCE_PLACEHOLDER_AUTO_STOP_MAX_MS,
  LUCKY_CHANCE_RESULT_DISPLAY_MS
} from "./constants.js";

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

  // --- 各モジュールの初期化 ---
  const soundManager = new SoundManager();
  const physicsWorld = new PhysicsWorld(gameEl, soundManager);
  const luckyChanceManager = new LuckyChanceManager();
  const memoryGame = new MemoryGame(memoryAreaEl, soundManager, physicsWorld, luckyChanceManager);

  const slotMachine = new SlotMachine();
  const slotMachineUI = new SlotMachineUI(slotMachineEl);

  // スロットが1コマ進むたびに、見た目のハイライトを更新
  slotMachine.onTick((outcome, index) => {
    slotMachineUI.highlight(index);
  });

  // スロットが停止し、結果が確定したら結果を強調表示 → 一定時間後に閉じる
  slotMachine.onResult(outcome => {
    const resultIndex = slotMachine.currentIndex;
    slotMachineUI.showResult(resultIndex);

    // 実際に「猫を多く落とす」などの報酬反映はPhase3-4で実装予定。
    // 今はどの出目が確定したかコンソールで確認できるようにしている。
    console.log("[LuckyChance] 結果:", outcome);

    setTimeout(() => {
      slotMachineUI.hide();
      luckyChanceManager.finish();
    }, LUCKY_CHANCE_RESULT_DISPLAY_MS);
  });

  // Lucky Chance発生 → スロット開始
  luckyChanceManager.onTrigger(() => {
    slotMachineUI.show();
    slotMachine.start();

    // 【仮仕様】Phase3-3で「3人同時押しSTOP」ができるまでの間、
    // ランダムな時間で自動的に止まるようにしておく（動作確認用）。
    const autoStopDelay =
      Math.random() * (LUCKY_CHANCE_PLACEHOLDER_AUTO_STOP_MAX_MS - LUCKY_CHANCE_PLACEHOLDER_AUTO_STOP_MIN_MS) +
      LUCKY_CHANCE_PLACEHOLDER_AUTO_STOP_MIN_MS;

    setTimeout(() => {
      slotMachine.stop();
    }, autoStopDelay);
  });

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
