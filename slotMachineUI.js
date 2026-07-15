// ===============================================================
// slotMachineUI.js
// 3桁スロットの見た目（DOM描画）を管理するクラス。
// ロジック(SlotMachine)から発行される onUpdate / onResult / onResume を
// 受け取って画面を更新するだけの役割。
//
// 【表示の仕組み】
// 各桁は「現在の画像」と「次の画像」を縦に2段重ねた帯(.digitStrip)を
// 窓(.slotDigit / overflow:hidden)の中でスクロールさせることで、
// 画像が上から下へ滑らかに流れる「本物のスロットらしい」動きを表現している。
//
// スクロールの進行は CSS transition ではなく requestAnimationFrame で
// 自前計算している。CSS transitionだと「0.5秒ごとのJSタイマー」と
// 「CSS側の時計」がそれぞれ独立しているため、わずかなズレが蓄積して
// 特定の桁だけカクつくことがあった。rAFで毎フレーム自分で位置を計算する
// ことで、そのズレを起こさないようにしている。
// ===============================================================

import { LUCKY_CHANCE_DIGIT_COUNT, LUCKY_CHANCE_TICK_INTERVAL_MS, SLOT_SYMBOLS } from "./constants.js";

export class SlotMachineUI {
  /**
   * @param {HTMLElement} containerElement - 桁を描画するコンテナ要素
   */
  constructor(containerElement) {
    this.container = containerElement;
    this._digitCells = []; // { root, strip, currentImg, nextImg, animationFrameId }
    this._lastValues = []; // 各桁の直前の表示値（SLOT_SYMBOLSのインデックス）
    this._render();
  }

  /** 桁の数だけ「窓＋スクロール帯」のDOM構造を初期生成する */
  _render() {
    this.container.innerHTML = "";
    this._digitCells = [];
    this._lastValues = [];

    for (let i = 0; i < LUCKY_CHANCE_DIGIT_COUNT; i++) {
      const root = document.createElement("div");
      root.className = "slotDigit";

      const strip = document.createElement("div");
      strip.className = "digitStrip";
      // JSで毎フレーム transform を書き換えるので、CSS側のtransitionは使わない
      strip.style.transition = "none";

      const currentImg = document.createElement("img");
      currentImg.src = SLOT_SYMBOLS[0];

      const nextImg = document.createElement("img");
      nextImg.src = SLOT_SYMBOLS[0];

      strip.appendChild(currentImg);
      strip.appendChild(nextImg);
      root.appendChild(strip);
      this.container.appendChild(root);

      this._digitCells.push({ root, strip, currentImg, nextImg, animationFrameId: null });
      this._lastValues.push(0);
    }
  }

  /** スロット演出エリアを表示する */
  show() {
    this.container.style.display = "flex";
    this._digitCells.forEach(cell => cell.root.classList.remove("stopped", "jackpot"));
  }

  /** スロット演出エリアを隠す */
  hide() {
    this.container.style.display = "none";
  }

  /**
   * 桁の状態が変化するたびに呼ばれる想定。画像と停止/回転中の見た目を更新する。
   * 値が変わった時だけ、上から下へスクロールする演出を再生する。
   * @param {Array<{digit:number, isSpinning:boolean}>} reelStates - digitはSLOT_SYMBOLSのインデックス
   */
  update(reelStates) {
    reelStates.forEach((reel, i) => {
      const cell = this._digitCells[i];
      if (!cell) return;

      cell.root.classList.toggle("stopped", !reel.isSpinning);

      // 値が変わっていない場合（停止した桁の再描画など）は、
      // 進行中のアニメーションがあれば止めて、即座に静止状態にする
      if (reel.digit === this._lastValues[i]) {
        this._cancelAnimation(cell);
        cell.currentImg.src = SLOT_SYMBOLS[reel.digit];
        cell.strip.style.transform = "translateY(0)";
        return;
      }

      this._playRollAnimation(cell, reel.digit);
      this._lastValues[i] = reel.digit;
    });
  }

  /**
   * 【演出】現在の画像から次の画像へ、スクロールで滑らかに切り替える。
   * requestAnimationFrameで自前タイミング管理することで、
   * CSS transitionとJSタイマーのズレによるカクつきを防いでいる。
   * @param {{strip:HTMLElement, currentImg:HTMLElement, nextImg:HTMLElement}} cell
   * @param {number} nextIndex - SLOT_SYMBOLSのインデックス
   */
  _playRollAnimation(cell, nextIndex) {
    // 前のアニメーションが終わっていなければキャンセルしてから最初からやり直す
    this._cancelAnimation(cell);

    cell.nextImg.src = SLOT_SYMBOLS[nextIndex];

    const duration = LUCKY_CHANCE_TICK_INTERVAL_MS;
    const startTime = performance.now();

    const step = now => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      cell.strip.style.transform = `translateY(${-50 * t}%)`;

      if (t < 1) {
        cell.animationFrameId = requestAnimationFrame(step);
      } else {
        cell.animationFrameId = null;
        cell.strip.style.transform = "translateY(0)";
        cell.currentImg.src = SLOT_SYMBOLS[nextIndex];
      }
    };

    cell.animationFrameId = requestAnimationFrame(step);
  }

  /** 進行中のスクロールアニメーションがあればキャンセルする */
  _cancelAnimation(cell) {
    if (cell.animationFrameId !== null) {
      cancelAnimationFrame(cell.animationFrameId);
      cell.animationFrameId = null;
    }
  }

  /** 制限時間切れで全桁が再始動した時の見た目（軽く赤く光らせて知らせる） */
  flashResume() {
    this._digitCells.forEach(cell => {
      cell.root.classList.remove("stopped");
      cell.root.classList.add("resumeFlash");
      setTimeout(() => cell.root.classList.remove("resumeFlash"), 400);
    });
  }

  /**
   * 結果確定時の強調表示
   * @param {number[]} digits - SLOT_SYMBOLSのインデックスの配列
   * @param {boolean} isJackpot - 全桁ゾロ目かどうか
   */
  showResult(digits, isJackpot) {
    this._digitCells.forEach((cell, i) => {
      this._cancelAnimation(cell);
      cell.strip.style.transform = "translateY(0)";
      cell.currentImg.src = SLOT_SYMBOLS[digits[i]];
      this._lastValues[i] = digits[i];

      cell.root.classList.add("stopped");
      cell.root.classList.toggle("jackpot", isJackpot);
    });
  }
}
