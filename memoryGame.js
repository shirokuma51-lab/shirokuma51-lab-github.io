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
  CARD_NUMBER_FONT_RATIO,
  EFFECT_CARD_FLIP_SWAP_MS,
  EFFECT_CORRECT_DURATION_MS,
  EFFECT_MISS_SHAKE_DURATION_MS
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

    // 【演出用】連続正解数。ゲームの当たり判定には一切影響しない、
    // 「N COMBO!」表示のためだけに数えているカウンタ。
    this.comboCount = 0;
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

    // 【修正】以前は文字サイズがCSSで150px固定だったため、6ペア/10ペアで
    // カードが小さくなると数字だけ大きいままはみ出してしまっていた。
    // カードサイズに比例させることで、枚数を変えても常にカード内に収まるようにする。
    if (this._pendingCardSize) {
      numberEl.style.fontSize = `${Math.round(this._pendingCardSize * CARD_NUMBER_FONT_RATIO)}px`;
    }

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

    // 【演出】カードめくり（3D Flip）＋光沢演出をトリガーする。
    // 実際の画像切り替え・番号非表示は、アニメーションの中間地点（90度回転時）で行う。
    this._playFlipAnimation(card);

    if (!this.first) {
      this.first = card;
    } else if (!this.second) {
      this.second = card;
      setTimeout(() => this._checkPair(), CARD_CHECK_DELAY);
    }
  }

  /**
   * 【演出】カードめくりアニメーション（CSS Animationのクラスを付け外しするだけ）。
   * ゲームロジックには影響せず、見た目のタイミング調整のみを行う。
   * @param {{div:HTMLElement, img:HTMLElement, number:HTMLElement, answer:string}} card
   */
  _playFlipAnimation(card) {
    card.div.classList.add("card-flip", "card-gloss");

    // 90度回転した瞬間（アニメーションの半分の時間）に、裏面→表面の画像へ切り替える
    setTimeout(() => {
      card.number.style.display = "none";
      card.img.src = card.answer;
    }, EFFECT_CARD_FLIP_SWAP_MS);

    // アニメーション終了後、クラスを外して元の状態に戻す
    card.div.addEventListener(
      "animationend",
      () => card.div.classList.remove("card-flip", "card-gloss"),
      { once: true }
    );
  }

  /** 2枚めくったカードが揃っているか判定する */
  _checkPair() {
    // setTimeoutのコールバックが実行される時点では this.first / this.second は
    // 既にnullになっているため、先にローカル変数へ退避しておく
    const firstCard = this.first;
    const secondCard = this.second;

    if (firstCard.answer === secondCard.answer) {
      this.soundManager.play("correct");

      // 【演出】連続正解数を更新し、コンボ表示をトリガーする（見た目のみ、判定には無関係）
      this.comboCount += 1;
      this._showComboEffect();

      // 【演出】拡大・ポップ＋リング＋キラキラをトリガーする
      this._playCorrectAnimation(firstCard);
      this._playCorrectAnimation(secondCard);

      // 演出（ポップ＆リング）が見えるよう少し待ってから、
      // アイコン落下・Lucky Chance抽選・カード非表示をまとめて行う
      setTimeout(() => {
        this.physicsWorld.dropIcon(firstCard.answer);

        // ペアが揃うたびに、一定確率でLucky Chanceの抽選を行う
        if (this.luckyChanceManager) {
          this.luckyChanceManager.rollForTrigger();
        }

        firstCard.div.style.visibility = "hidden";
        secondCard.div.style.visibility = "hidden";
      }, EFFECT_CORRECT_DURATION_MS);
    } else {
      this.soundManager.play("miss");

      // 【演出】連続正解が途切れたので、コンボ数をリセットする
      this.comboCount = 0;

      // 【演出】シェイクさせてから裏面に戻す
      this._playMissAnimation(firstCard, secondCard);
    }

    this.first = null;
    this.second = null;
  }

  /**
   * 【演出】正解時のポップ＆リング＆キラキラ演出をトリガーする（見た目のみ）。
   * @param {{div:HTMLElement}} card
   */
  _playCorrectAnimation(card) {
    card.div.classList.add("pop", "correct-ring", "sparkle");
    // このカードは演出後すぐ非表示（visibility:hidden）になるため、
    // クラスの明示的な取り外しは行わない（次のゲーム開始時にDOMごと作り直される）
  }

  /**
   * 【演出】不正解時のシェイク演出をトリガーし、終了後に裏面へ戻す（見た目のみ）。
   * @param {{div:HTMLElement, img:HTMLElement, number:HTMLElement}} first
   * @param {{div:HTMLElement, img:HTMLElement, number:HTMLElement}} second
   */
  _playMissAnimation(first, second) {
    first.div.classList.add("shake");
    second.div.classList.add("shake");

    setTimeout(() => {
      first.img.src = CARD_BACK_IMAGE;
      second.img.src = CARD_BACK_IMAGE;
      first.number.style.display = "flex";
      second.number.style.display = "flex";
      first.div.classList.remove("shake");
      second.div.classList.remove("shake");
    }, EFFECT_MISS_SHAKE_DURATION_MS);
  }

  /**
   * 【演出】画面上の「N COMBO!」表示を更新する（見た目のみ）。
   * 対応する要素(#comboDisplay)がHTML側に無い場合は何もしない。
   * 効果音: コンボ更新時の効果音(combo.mp3)は素材が未実装のため未再生。
   *         素材が追加され次第、ここで this.soundManager.play("combo") を呼び出す想定。
   */
  _showComboEffect() {
    const comboEl = document.getElementById("comboDisplay");
    if (!comboEl) return;

    comboEl.textContent = `${this.comboCount} COMBO!`;

    // 連続してコンボが発生した時にもアニメーションが再生されるよう、
    // 一度クラスを外してリフローを挟んでから付け直す（CSSアニメーション再トリガーの定石）
    comboEl.classList.remove("combo-pop");
    void comboEl.offsetWidth;
    comboEl.classList.add("combo-pop");
  }

  /** ゲーム状態を初期化する（カードを全て削除し、エリアを非表示にする） */
  reset() {
    this.area.innerHTML = "";
    this.area.style.display = "none";
    this.first = null;
    this.second = null;
    this.comboCount = 0; // 【演出用】コンボ数もリセットする
  }
}
