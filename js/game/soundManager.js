import { SOUND_PATHS } from "./constants.js";
export class SoundManager {
  constructor() {
    this.sounds = {};
    this.configure(SOUND_PATHS, 70);
  }
  configure(paths, volume) {
    for (const [name, path] of Object.entries(paths)) {
      if (this.sounds[name]?.getAttribute("src") !== path) {
        this.sounds[name]?.pause();
        this.sounds[name] = new Audio(path);
      }
      this.sounds[name].volume = volume / 100;
    }
  }
  play(name) {
    const sound = this.sounds[name];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }
}
