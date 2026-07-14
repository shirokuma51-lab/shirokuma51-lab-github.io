// ===============================================================
// optionMenu.js
// 設定メニュー（ペア数・アイコン種類数の選択UI）の開閉と、
// 選択値の取得を管理するクラス。
// ===============================================================

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

  /** 設定メニューを表示する */
  open() {
    this.menuElement.style.display = "block";
  }

  /** 設定メニューを閉じる */
  close() {
    this.menuElement.style.display = "none";
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
