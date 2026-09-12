import {
  GRID_LAYOUTS,
  CARD_CHECK_DELAY,
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
    if (this.locked || card.matched || card === this.first) return;
    this.sound.play("flip");
    card.div.classList.add("card-flip", "card-gloss");
    this.later(() => {
      card.img.src = card.answer.image;
      card.number.style.display = "none";
    }, EFFECT_CARD_FLIP_SWAP_MS);
    this.later(() => card.div.classList.remove("card-flip", "card-gloss"), 260);
    if (!this.first) {
      this.first = card;
      return;
    }
    this.locked = true;
    const first = this.first;
    this.later(() => this.check(first, card), CARD_CHECK_DELAY);
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
