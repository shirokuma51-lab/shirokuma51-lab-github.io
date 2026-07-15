// ===============================================================
// slotMachineUI.js
// 3桁デジタルスロットの見た目（DOM描画）を管理するクラス。
// ロジック(SlotMachine)から発行される onUpdate / onResult / onResume を
// 受け取って画面を更新するだけの役割。
//
// 【表示の仕組み】
// 各桁は「現在の数字」と「次の数字」を縦に2段重ねた帯(.digitStrip)を
// 窓(.slotDigit / overflow:hidden)の中でスクロールさせることで、
// 数字が上から下へ滑らかに流れる「本物のスロットらしい」動きを表現している。
// 数字が変わらない更新（停止表示の再描画など）ではスクロールさせない。
// ===============================================================

import { LUCKY_CHANCE_DIGIT_COUNT, LUCKY_CHANCE_TICK_INTERVAL_MS } from "./constants.js";

export class SlotMachineUI {
  /**
   * @param {HTMLElement} containerElement - 桁を描画するコンテナ要素
   */
  constructor(containerElement) {
    this.container = containerElement;
    this._digitCells = []; // { root, strip, currentSpan, nextSpan }
    this._lastValues = []; // 各桁の直前の表示値（値が変わった時だけスクロールさせるための記録）
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

      const currentSpan = document.createElement("span");
      currentSpan.textContent = "0";

      const nextSpan = document.createElement("span");
      nextSpan.textContent = "0";

      strip.appendChild(currentSpan);
      strip.appendChild(nextSpan);
      root.appendChild(strip);
      this.container.appendChild(root);

      this._digitCells.push({ root, strip, currentSpan, nextSpan });
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
   * 桁の状態が変化するたびに呼ばれる想定。数字と停止/回転中の見た目を更新する。
   * 数字が変わった時だけ、上から下へスクロールする演出を再生する。
   * @param {Array<{digit:number, isSpinning:boolean}>} reelStates
   */
  update(reelStates) {
    reelStates.forEach((reel, i) => {
      const cell = this._digitCells[i];
      if (!cell) return;

      cell.root.classList.toggle("stopped", !reel.isSpinning);

      // 値が変わっていない場合（停止した桁の再描画など）はスクロールさせず、そのまま反映する
      if (reel.digit === this._lastValues[i]) {
        cell.currentSpan.textContent = String(reel.digit);
        cell.strip.style.transition = "none";
        cell.strip.style.transform = "translateY(0)";
        return;
      }

      this._playRollAnimation(cell, reel.digit);
      this._lastValues[i] = reel.digit;
    });
  }

  /**
   * 【演出】現在の数字から次の数字へ、スクロールで滑らかに切り替える。
   * CSS Animationではなく、値が変わるたびに一度きり再生するtransitionを使っている
   * （回転間隔=LUCKY_CHANCE_TICK_INTERVAL_MSに合わせて滑らかにつながるようにするため）。
   * @param {{root:HTMLElement, strip:HTMLElement, currentSpan:HTMLElement, nextSpan:HTMLElement}} cell
   * @param {number} nextDigit
   */
  _playRollAnimation(cell, nextDigit) {
    cell.nextSpan.textContent = String(nextDigit);

    // 回転間隔と同じ時間をかけてスクロールさせることで、次のtickとシームレスにつながる
    cell.strip.style.transition = `transform ${LUCKY_CHANCE_TICK_INTERVAL_MS}ms linear`;
    cell.strip.style.transform = "translateY(-50%)";

    const onTransitionEnd = () => {
      cell.strip.removeEventListener("transitionend", onTransitionEnd);
      // スクロール完了後、瞬間的に先頭位置へ戻す（transitionを切ってから戻すので見た目は動かない）
      cell.strip.style.transition = "none";
      cell.strip.style.transform = "translateY(0)";
      cell.currentSpan.textContent = String(nextDigit);
    };
    cell.strip.addEventListener("transitionend", onTransitionEnd);
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
   * @param {number[]} digits
   * @param {boolean} isJackpot - 全桁ゾロ目かどうか
   */
  showResult(digits, isJackpot) {
    this._digitCells.forEach((cell, i) => {
      cell.strip.style.transition = "none";
      cell.strip.style.transform = "translateY(0)";
      cell.currentSpan.textContent = String(digits[i]);
      this._lastValues[i] = digits[i];

      cell.root.classList.add("stopped");
      cell.root.classList.toggle("jackpot", isJackpot);
    });
  }
}
