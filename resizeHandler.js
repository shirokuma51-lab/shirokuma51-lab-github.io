// ===============================================================
// resizeHandler.js
// ウィンドウ（OBSのブラウザソース）のサイズに合わせて、
// 1536x2048固定の #game 要素を等倍スケーリング表示するための処理。
// ===============================================================

import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./constants.js";

/**
 * リサイズイベントを監視し、#game要素にscale変形を適用する
 * @param {HTMLElement} gameElement - スケーリング対象の要素(#game)
 */
export function setupResizeHandler(gameElement) {
  function resize() {
    const scale = Math.min(
      window.innerWidth / CANVAS_WIDTH,
      window.innerHeight / CANVAS_HEIGHT
    );
    gameElement.style.transform = `scale(${scale})`;
  }

  window.addEventListener("resize", resize);
  resize(); // 初期表示時にも一度実行
}
