import {
  GRID_LAYOUTS,
  CARD_PREVIEW_HOLD_MS,
  CARD_PREVIEW_FADE_MS,
  EFFECT_CARD_FLIP_SWAP_MS,
  EFFECT_CORRECT_DURATION_MS,
  EFFECT_MISS_SHAKE_DURATION_MS,
} from "./constants.js";
import { buildDeck } from "../shared/model.js";
export class MemoryGame {
  constructor(area, sound, physics) {
    this.area = area;
    this.sound = sound;
    this.physics = physics;
    this.timers = new Set();
    this.preview = document.getElementById("cardPreview");
    this.reset();
  }
  later(fn, ms) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }
  reset() {
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    this.area.replaceChildren();
    this.area.style.display = "none";
    this.first = null;
    this.previewing = false;
    if (this.preview) {
      this.preview.hidden = true;
      this.preview.classList.remove("leaving");
      this.preview.querySelector("img").removeAttribute("src");
    }
    this.locked = false;
    this.combo = 0;
    const c = document.getElementById("comboDisplay");
    if (c) {
      c.textContent = "";
      c.classList.remove("combo-pop");
    }
  }
  start(config) {
    this.reset();
    this.back = config.back;
    const layout = GRID_LAYOUTS[config.pairCount];
    this.area.style.gridTemplateColumns = `repeat(${layout.columns},${layout.cardSize}px)`;
    for (const [i, answer] of buildDeck(config).entries()) {
      const div = document.createElement("button");
      div.className = "card";
      div.style.width = div.style.height = layout.cardSize + "px";
      div.setAttribute("aria-label", "カード" + (i + 1));
      const img = document.createElement("img");
      img.src = this.back;
      img.alt = "";
      const number = document.createElement("span");
      number.className = "cardNumber";
      number.textContent = i + 1;
      number.style.fontSize = layout.cardSize * 0.5 + "px";
      div.append(img, number);
      const card = { div, img, number, answer, matched: false };
      div.onclick = () => this.flip(card);
      this.area.append(div);
    }
    this.area.style.display = "grid";
  }
  flip(card) {
    if (this.locked || this.previewing || card.matched || card === this.first) return;
    this.previewing = true;
    this.sound.play("flip");
    card.div.classList.add("card-flip", "card-gloss");
    this.later(() => {
      card.img.src = card.answer.image;
      card.number.style.display = "none";
      this.showPreview(card);
    }, EFFECT_CARD_FLIP_SWAP_MS);
    this.later(() => card.div.classList.remove("card-flip", "card-gloss"), 260);
    const first = this.first;
    if (!first) {
      this.first = card;
    } else {
      this.locked = true;
    }
    this.later(() => {
      this.previewing = false;
      if (first) this.check(first, card);
    }, EFFECT_CARD_FLIP_SWAP_MS + CARD_PREVIEW_HOLD_MS + CARD_PREVIEW_FADE_MS);
  }
  showPreview(card) {
    if (!this.preview) return;
    this.preview.querySelector("img").src = card.answer.image;
    this.preview.querySelector("figcaption").textContent =
      "カード " + card.number.textContent;
    this.preview.classList.remove("leaving");
    this.preview.hidden = false;
    this.later(() => this.preview.classList.add("leaving"), CARD_PREVIEW_HOLD_MS);
    this.later(() => {
      this.preview.hidden = true;
    }, CARD_PREVIEW_HOLD_MS + CARD_PREVIEW_FADE_MS);
  }
  check(a, b) {
    if (a.answer.type === b.answer.type) {
      a.matched = b.matched = true;
      this.sound.play("correct");
      this.combo++;
      const c = document.getElementById("comboDisplay");
      if (c) {
        c.textContent = this.combo + " COMBO!";
        c.classList.remove("combo-pop");
        void c.offsetWidth;
        c.classList.add("combo-pop");
      }
      for (const card of [a, b])
        card.div.classList.add("pop", "correct-ring", "sparkle");
      this.later(() => {
        this.physics.dropIcon(a.answer.drop);
        for (const card of [a, b]) {
          card.div.style.visibility = "hidden";
          card.div.disabled = true;
        }
        this.first = null;
        this.locked = false;
      }, EFFECT_CORRECT_DURATION_MS);
    } else {
      this.sound.play("miss");
      this.combo = 0;
      for (const card of [a, b]) card.div.classList.add("shake");
      this.later(() => {
        for (const card of [a, b]) {
          card.img.src = this.back;
          card.number.style.display = "flex";
          card.div.classList.remove("shake");
        }
        this.first = null;
        this.locked = false;
      }, EFFECT_MISS_SHAKE_DURATION_MS);
    }
  }
}
