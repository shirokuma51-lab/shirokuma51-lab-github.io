// ===============================================================
// slotMachine.js
// スロットの「回転」「停止」「出目の確定」を管理するクラス。
//
// 【設計方針】
// ・このクラスはDOM(見た目)を一切知らない。ロジックだけを持つ。
//   見た目の更新は slotMachineUI.js が onTick / onResult を購読して行う。
// ・stop() は今はPhase3-2の動作確認用に自動タイマーから呼んでいるが、
//   Phase3-3では「3人同時押しが成立した瞬間」から呼ばれる形に差し替わる。
//   stop()自体のインターフェースは変わらないため、呼び出し元を差し替えるだけで済む。
// ===============================================================

import { LUCKY_CHANCE_TICK_INTERVAL_MS, LUCKY_CHANCE_OUTCOMES } from "./constants.js";

export class SlotMachine {
  constructor() {
    this.currentIndex = 0;
    this._timerId = null;
    this._tickListeners = [];
    this._resultListeners = [];
  }

  /** スロットが1コマ進むたびに呼ばれるコールバックを登録する */
  onTick(callback) {
    this._tickListeners.push(callback);
  }

  /** スロットが停止し、結果が確定した時に呼ばれるコールバックを登録する */
  onResult(callback) {
    this._resultListeners.push(callback);
  }

  /** スロットの回転を開始する */
  start() {
    this.currentIndex = 0;
    this._emitTick();

    this._timerId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % LUCKY_CHANCE_OUTCOMES.length;
      this._emitTick();
    }, LUCKY_CHANCE_TICK_INTERVAL_MS);
  }

  _emitTick() {
    const outcome = LUCKY_CHANCE_OUTCOMES[this.currentIndex];
    this._tickListeners.forEach(cb => cb(outcome, this.currentIndex));
  }

  /**
   * スロットを停止し、その時点の出目を結果として確定する。
   * @returns {Object|null} 確定した出目（回転中でなければnull）
   */
  stop() {
    if (this._timerId === null) return null;

    clearInterval(this._timerId);
    this._timerId = null;

    const outcome = LUCKY_CHANCE_OUTCOMES[this.currentIndex];
    this._resultListeners.forEach(cb => cb(outcome));
    return outcome;
  }

  /** 現在回転中かどうか */
  get isSpinning() {
    return this._timerId !== null;
  }
}
