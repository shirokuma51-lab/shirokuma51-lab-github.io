// ===============================================================
// luckyChanceManager.js
// Lucky Chanceの「発生するかどうか」の判定と状態管理を行うクラス。
//
// 【設計方針】
// ・このクラス自体は画面の見た目(スロット演出やボタンUI)を一切知らない。
//   「発生した」「終了した」というイベントを外部に通知するだけにして、
//   演出側(main.js や、今後作るスロットUI)がそれを購読(onTrigger)して
//   自由に演出を作れるようにしている。
// ・スロット演出・STOPボタンの同時押し判定は、この後のPhase3-2, 3-3で
//   別ファイルとして追加していく予定。このファイルはその土台。
// ===============================================================

import { LUCKY_CHANCE_TRIGGER_PROBABILITY } from "./constants.js";

export class LuckyChanceManager {
  constructor() {
    this.isActive = false;
    this._triggerListeners = [];
    this._finishListeners = [];
  }

  /**
   * Lucky Chanceが発生した時に呼ばれるコールバックを登録する
   * @param {Function} callback
   */
  onTrigger(callback) {
    this._triggerListeners.push(callback);
  }

  /**
   * Lucky Chanceが終了した時に呼ばれるコールバックを登録する
   * @param {Function} callback
   */
  onFinish(callback) {
    this._finishListeners.push(callback);
  }

  /**
   * ペア成立などのタイミングで呼び出し、一定確率でLucky Chanceを発生させる。
   * 既にLucky Chance進行中の場合は多重発生させない。
   * @returns {boolean} 発生したかどうか
   */
  rollForTrigger() {
    if (this.isActive) return false;

    const hit = Math.random() < LUCKY_CHANCE_TRIGGER_PROBABILITY;
    if (hit) {
      this.isActive = true;
      this._triggerListeners.forEach(cb => cb());
    }
    return hit;
  }

  /**
   * Lucky Chanceの進行を終了状態にする。
   * スロット演出やSTOPボタン側が「終わった」タイミングで呼び出す想定。
   * （Phase3-5で作る「緊急停止」もこの関数を呼ぶだけで実現できる）
   */
  finish() {
    if (!this.isActive) return;
    this.isActive = false;
    this._finishListeners.forEach(cb => cb());
  }
}
