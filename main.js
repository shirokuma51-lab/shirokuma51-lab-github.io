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
import { LUCKY_CHANCE_PLACEHOLDER_DURATION_MS } from "./constants.js";

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

  const luckyChanceBannerEl = document.getElementById("luckyChanceBanner");

  // --- 各モジュールの初期化 ---
  const soundManager = new SoundManager();
  const physicsWorld = new PhysicsWorld(gameEl, soundManager);
  const luckyChanceManager = new LuckyChanceManager();
  const memoryGame = new MemoryGame(memoryAreaEl, soundManager, physicsWorld, luckyChanceManager);

  // 【仮演出】Lucky Chanceが発生したことを確認するための仮表示。
  // Phase3-2でスロット演出ができたら、この中身を差し替える。
  luckyChanceManager.onTrigger(() => {
    luckyChanceBannerEl.style.display = "flex";
    setTimeout(() => {
      luckyChanceManager.finish();
    }, LUCKY_CHANCE_PLACEHOLDER_DURATION_MS);
  });

  luckyChanceManager.onFinish(() => {
    luckyChanceBannerEl.style.display = "none";
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
