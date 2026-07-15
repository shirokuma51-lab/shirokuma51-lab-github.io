// ===============================================================
// slotMachine.js
// 3桁スロットのロジックを管理するクラス。
//
// 【仕様】
// ・3桁がそれぞれ独立して回転する（SLOT_SYMBOLSの画像をループ）
//   ※内部的には「digit」という数値プロパティで管理しているが、これは
//     SLOT_SYMBOLS配列のインデックス（何番目の画像か）を表す値になっている。
// ・press() が呼ばれるたびに、まだ回転中の桁のうち一番左の桁が止まる
// ・1桁目が止まった瞬間から LUCKY_CHANCE_STOP_WINDOW_MS のカウントダウンが始まる
// ・その時間内に残りの桁も全部止まらなければ、止めていた桁も含めて
//   全部また回転を再開する（＝複数人が息を合わせて押す必要がある）
// ・3桁全部止まったら、その時点の画像で結果が自動確定する
//
// 【設計方針】
// このクラスはDOMを一切知らない。誰が press() を呼ぶかも関知しない。
// ===============================================================

import {
  LUCKY_CHANCE_DIGIT_COUNT,
  LUCKY_CHANCE_TICK_INTERVAL_MS,
  LUCKY_CHANCE_STOP_WINDOW_MS,
  SLOT_SYMBOLS
} from "./constants.js";

export class SlotMachine {
  constructor() {
    this.reels = Array.from({ length: LUCKY_CHANCE_DIGIT_COUNT }, () => ({
      digit: 0,
      isSpinning: false
    }));

    this._spinTimerId = null;
    this._stopWindowTimerId = null;

    this._updateListeners = [];
    this._resultListeners = [];
    this._resumeListeners = [];
  }

  /** 桁の状態が変化するたびに呼ばれる（回転中の見た目更新・停止表示などに使用） */
  onUpdate(callback) {
    this._updateListeners.push(callback);
  }

  /** 3桁全部止まり、結果が確定した時に呼ばれる */
  onResult(callback) {
    this._resultListeners.push(callback);
  }

  /** 制限時間内に揃わず、止めていた桁も含めて全部再始動した時に呼ばれる */
  onResume(callback) {
    this._resumeListeners.push(callback);
  }

  /** スロットの回転を開始する（3桁とも回転状態にする） */
  start() {
    this.reels.forEach(reel => {
      reel.digit = Math.floor(Math.random() * SLOT_SYMBOLS.length);
      reel.isSpinning = true;
    });
    this._clearStopWindow();
    this._emitUpdate();

    this._spinTimerId = setInterval(() => {
      this.reels.forEach(reel => {
        if (reel.isSpinning) {
          reel.digit = (reel.digit + 1) % SLOT_SYMBOLS.length;
        }
      });
      this._emitUpdate();
    }, LUCKY_CHANCE_TICK_INTERVAL_MS);
  }

  /**
   * STOPボタンが押された時に呼び出す。
   * 現在回転中の桁のうち、一番左の桁を止める。
   */
  press() {
    const targetIndex = this.reels.findIndex(reel => reel.isSpinning);
    if (targetIndex === -1) return; // 全桁すでに停止済み

    this.reels[targetIndex].isSpinning = false;
    const stoppedCount = this.reels.filter(r => !r.isSpinning).length;

    // 1桁目が止まった瞬間にカウントダウンを開始する
    if (stoppedCount === 1) {
      this._stopWindowTimerId = setTimeout(() => {
        this._handleWindowExpired();
      }, LUCKY_CHANCE_STOP_WINDOW_MS);
    }

    this._emitUpdate();

    if (stoppedCount === this.reels.length) {
      this._confirmResult();
    }
  }

  /** 制限時間切れ：止めていた桁も含めて全部回転を再開する */
  _handleWindowExpired() {
    this._stopWindowTimerId = null;
    this.reels.forEach(reel => {
      reel.isSpinning = true;
    });
    this._resumeListeners.forEach(cb => cb());
    this._emitUpdate();
  }

  /** 3桁揃ったので結果を確定し、回転を完全に停止する */
  _confirmResult() {
    this._clearStopWindow();

    if (this._spinTimerId !== null) {
      clearInterval(this._spinTimerId);
      this._spinTimerId = null;
    }

    const digits = this.reels.map(r => r.digit);
    this._resultListeners.forEach(cb => cb(digits));
  }

  _clearStopWindow() {
    if (this._stopWindowTimerId !== null) {
      clearTimeout(this._stopWindowTimerId);
      this._stopWindowTimerId = null;
    }
  }

  _emitUpdate() {
    const snapshot = this.reels.map(r => ({ ...r }));
    this._updateListeners.forEach(cb => cb(snapshot));
  }

  /** 緊急停止（Phase3-5）用に、途中でも強制的に回転を止める */
  forceStop() {
    if (this._spinTimerId !== null) {
      clearInterval(this._spinTimerId);
      this._spinTimerId = null;
    }
    this._clearStopWindow();
  }
}
