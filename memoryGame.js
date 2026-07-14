// ===============================================================
// memoryGame.js
// 神経衰弱ゲーム本体のロジックを管理するクラス。
// カードの生成・めくり判定・正解時の演出呼び出しなどを担当する。
// ===============================================================

import {
  ICONS,
  CARD_BACK_IMAGE,
  GRID_LAYOUTS,
  CARD_CHECK_DELAY,
  CARD_HIDE_DELAY
} from "./constants.js";

export class MemoryGame {
  /**
   * @param {HTMLElement} areaElement - カードを描画するコンテナ要素(#memory)
   * @param {SoundManager} soundManager
   * @param {PhysicsWorld} physicsWorld - ペア成立時にアイコンを落下させるために使用
   * @param {LuckyChanceManager} [luckyChanceManager] - ペア成立時にLucky Chance抽選を行うために使用（任意）
   */
  constructor(areaElement, soundManager, physicsWorld, luckyChanceManager = null) {
    this.area = areaElement;
    this.soundManager = soundManager;
    this.physicsWorld = physicsWorld;
    this.luckyChanceManager = luckyChanceManager;

    this.first = null;   // 1枚目にめくったカード情報
    this.second = null;  // 2枚目にめくったカード情報
    this._pendingCardSize = null;
  }

  /**
   * ゲームを開始する（前回の状態はリセットしてから開始）
   * @param {number} pairCount - ペア数（3 / 6 / 10）
   * @param {number} typeCount - アイコン種類数（3 / 4 / 5）
   */
  start(pairCount, typeCount) {
    this.reset();

    const cards = this._buildShuffledCards(pairCount, typeCount);
    this._applyLayout(pairCount);

    let numberCount = 1;
    cards.forEach(icon => {
      const cardEl = this._createCardElement(icon, numberCount);
      numberCount++;
      this.area.appendChild(cardEl);
    });

    this.area.style.display = "grid";
  }

  /** ペア数・種類数から、シャッフル済みのカード配列(画像パスの配列)を生成する */
  _buildShuffledCards(pairCount, typeCount) {
    const cards = [];
    for (let i = 0; i < pairCount; i++) {
      const icon = ICONS[i % typeCount];
      cards.push(icon, icon);
    }
    return cards.sort(() => Math.random() - 0.5);
  }

  /** ペア数に応じたグリッド列数・カードサイズを適用する */
  _applyLayout(pairCount) {
    const layout = GRID_LAYOUTS[pairCount];
    if (!layout) {
      console.warn(`[MemoryGame] GRID_LAYOUTS に未定義のペア数です: ${pairCount}`);
      this._pendingCardSize = null;
      return;
    }
    this.area.style.gridTemplateColumns = `repeat(${layout.columns}, ${layout.cardSize}px)`;
    this._pendingCardSize = layout.cardSize;
  }

  /** 1枚分のカード要素（裏面画像＋番号表示）を生成する */
  _createCardElement(icon, number) {
    const div = document.createElement("div");
    div.className = "card";

    if (this._pendingCardSize) {
      div.style.width = `${this._pendingCardSize}px`;
      div.style.height = `${this._pendingCardSize}px`;
    }

    const img = document.createElement("img");
    img.src = CARD_BACK_IMAGE;

    const numberEl = document.createElement("div");
    numberEl.className = "cardNumber";
    numberEl.textContent = number;

    div.appendChild(img);
    div.appendChild(numberEl);

    const cardData = { div, img, number: numberEl, answer: icon };
    div.addEventListener("click", () => this._onCardClick(cardData));

    return div;
  }

  /** カードクリック時の処理 */
  _onCardClick(card) {
    // 既にめくられている（1枚目 or 2枚目として選択済みの）カードは無視する
    // ※元コードにはこのガードが無く、同じカードを連打すると自己ペア成立してしまう
    //   不具合があったため、リファクタ時に安全側へ修正しています。
    if (card === this.first || card === this.second) return;

    this.soundManager.play("flip");
    card.number.style.display = "none";
    card.img.src = card.answer;

    if (!this.first) {
      this.first = card;
    } else if (!this.second) {
      this.second = card;
      setTimeout(() => this._checkPair(), CARD_CHECK_DELAY);
    }
  }

  /** 2枚めくったカードが揃っているか判定する */
  _checkPair() {
    if (this.first.answer === this.second.answer) {
      this.soundManager.play("correct");
      this.physicsWorld.dropIcon(this.first.answer);

      // ペアが揃うたびに、一定確率でLucky Chanceの抽選を行う
      if (this.luckyChanceManager) {
        this.luckyChanceManager.rollForTrigger();
      }

      setTimeout(() => {
        this.first.div.style.visibility = "hidden";
        this.second.div.style.visibility = "hidden";
      }, CARD_HIDE_DELAY);
    } else {
      this.soundManager.play("miss");
      this.first.img.src = CARD_BACK_IMAGE;
      this.second.img.src = CARD_BACK_IMAGE;
      this.first.number.style.display = "flex";
      this.second.number.style.display = "flex";
    }

    this.first = null;
    this.second = null;
  }

  /** ゲーム状態を初期化する（カードを全て削除し、エリアを非表示にする） */
  reset() {
    this.area.innerHTML = "";
    this.area.style.display = "none";
    this.first = null;
    this.second = null;
  }
}
