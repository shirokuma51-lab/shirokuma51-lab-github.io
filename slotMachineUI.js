// ===============================================================
// slotMachineUI.js
// スロットの見た目（出目の一覧表示・現在位置のハイライト）を管理するクラス。
// ロジック(SlotMachine)とは分離されており、SlotMachineが発行する
// イベント(onTick / onResult)を受け取って画面を更新するだけの役割。
// ===============================================================

import { LUCKY_CHANCE_OUTCOMES } from "./constants.js";

export class SlotMachineUI {
  /**
   * @param {HTMLElement} containerElement - 出目一覧を描画するコンテナ要素
   */
  constructor(containerElement) {
    this.container = containerElement;
    this._outcomeElements = [];
    this._render();
  }

  /** 出目一覧のDOM要素を初期生成する */
  _render() {
    this.container.innerHTML = "";
    this._outcomeElements = LUCKY_CHANCE_OUTCOMES.map(outcome => {
      const el = document.createElement("div");
      el.className = "slotOutcome";
      el.textContent = outcome.label;
      this.container.appendChild(el);
      return el;
    });
  }

  /** スロット演出エリアを表示する */
  show() {
    this.container.style.display = "flex";
  }

  /** スロット演出エリアを隠す */
  hide() {
    this.container.style.display = "none";
    this._clearHighlight();
  }

  /**
   * 指定したインデックスの出目をハイライト表示する（回転中の演出用）
   * @param {number} index
   */
  highlight(index) {
    this._outcomeElements.forEach((el, i) => {
      el.classList.toggle("active", i === index);
    });
  }

  /**
   * 結果確定時の強調表示（回転中とは異なる見た目にする）
   * @param {number} index
   */
  showResult(index) {
    this._clearHighlight();
    const el = this._outcomeElements[index];
    if (el) el.classList.add("result");
  }

  _clearHighlight() {
    this._outcomeElements.forEach(el => {
      el.classList.remove("active", "result");
    });
  }
}
