// ===============================================================
// slotMachineUI.js
// 3桁デジタルスロットの見た目（DOM描画）を管理するクラス。
// ロジック(SlotMachine)から発行される onUpdate / onResult / onResume を
// 受け取って画面を更新するだけの役割。
// ===============================================================

import { LUCKY_CHANCE_DIGIT_COUNT } from "./constants.js";

export class SlotMachineUI {
  /**
   * @param {HTMLElement} containerElement - 桁を描画するコンテナ要素
   */
  constructor(containerElement) {
    this.container = containerElement;
    this._digitElements = [];
    this._render();
  }

  /** 桁の数だけ枠（div）を初期生成する */
  _render() {
    this.container.innerHTML = "";
    this._digitElements = Array.from({ length: LUCKY_CHANCE_DIGIT_COUNT }, () => {
      const el = document.createElement("div");
      el.className = "slotDigit";
      el.textContent = "0";
      this.container.appendChild(el);
      return el;
    });
  }

  /** スロット演出エリアを表示する */
  show() {
    this.container.style.display = "flex";
    this._digitElements.forEach(el => el.classList.remove("stopped", "jackpot"));
  }

  /** スロット演出エリアを隠す */
  hide() {
    this.container.style.display = "none";
  }

  /**
   * 桁の状態が変化するたびに呼ばれる想定。数字と停止/回転中の見た目を更新する。
   * @param {Array<{digit:number, isSpinning:boolean}>} reelStates
   */
  update(reelStates) {
    reelStates.forEach((reel, i) => {
      const el = this._digitElements[i];
      if (!el) return;
      el.textContent = String(reel.digit);
      el.classList.toggle("stopped", !reel.isSpinning);
    });
  }

  /** 制限時間切れで全桁が再始動した時の見た目（軽く赤く光らせて知らせる） */
  flashResume() {
    this._digitElements.forEach(el => {
      el.classList.remove("stopped");
      el.classList.add("resumeFlash");
      setTimeout(() => el.classList.remove("resumeFlash"), 400);
    });
  }

  /**
   * 結果確定時の強調表示
   * @param {number[]} digits
   * @param {boolean} isJackpot - 全桁ゾロ目かどうか
   */
  showResult(digits, isJackpot) {
    this._digitElements.forEach((el, i) => {
      el.textContent = String(digits[i]);
      el.classList.add("stopped");
      el.classList.toggle("jackpot", isJackpot);
    });
  }
}
