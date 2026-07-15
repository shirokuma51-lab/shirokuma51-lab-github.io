// ===============================================================
// optionMenu.js
// 設定メニュー（ペア数・アイコン種類数の選択UI）の開閉と、
// 選択値の取得を管理するクラス。
// ===============================================================

import { EFFECT_OPTION_MENU_DURATION_MS } from "./constants.js";

export class OptionMenu {
  /**
   * @param {Object} elements
   * @param {HTMLElement} elements.menuElement - 設定メニュー全体の要素
   * @param {HTMLElement} elements.openButton - メニューを開くボタン
   * @param {HTMLElement} elements.closeButton - メニューを閉じる（決定）ボタン
   * @param {HTMLSelectElement} elements.cardCountSelect - ペア数選択
   * @param {HTMLSelectElement} elements.iconCountSelect - 種類数選択
   */
  constructor({ menuElement, openButton, closeButton, cardCountSelect, iconCountSelect }) {
    this.menuElement = menuElement;
    this.cardCountSelect = cardCountSelect;
    this.iconCountSelect = iconCountSelect;

    openButton.addEventListener("click", () => this.open());
    closeButton.addEventListener("click", () => this.close());
  }

  /** 設定メニューを表示する（フェードイン＋scale 0.9→1.0） */
  open() {
    this.menuElement.style.display = "block";

    // display:none から block に変えた直後にクラスを付けると
    // ブラウザがtransitionを認識できないことがあるため、
    // 1フレーム待ってから表示用クラスを付ける（CSSアニメーションの定石）
    requestAnimationFrame(() => {
      this.menuElement.classList.add("option-menu-visible");
    });
  }

  /** 設定メニューを閉じる（フェードアウト＋scale 1.0→0.9、終了後にdisplay:noneへ） */
  close() {
    this.menuElement.classList.remove("option-menu-visible");

    setTimeout(() => {
      this.menuElement.style.display = "none";
    }, EFFECT_OPTION_MENU_DURATION_MS);
  }

  /** 現在選択されているペア数を取得する */
  getPairCount() {
    return Number(this.cardCountSelect.value);
  }

  /** 現在選択されているアイコン種類数を取得する */
  getTypeCount() {
    return Number(this.iconCountSelect.value);
  }
}
