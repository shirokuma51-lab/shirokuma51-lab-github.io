// ===============================================================
// soundManager.js
// 効果音の読み込み・再生を一元管理するクラス。
// 呼び出し側は soundManager.play("flip") のように名前だけ指定すればよい。
// ===============================================================

import { SOUND_PATHS } from "./constants.js";

export class SoundManager {
  /**
   * @param {Object<string,string>} soundPaths - キー名と音声ファイルパスの対応表
   */
  constructor(soundPaths = SOUND_PATHS) {
    this.sounds = {};
    for (const [name, path] of Object.entries(soundPaths)) {
      this.sounds[name] = new Audio(path);
    }
  }

  /**
   * 指定した名前の効果音を最初から再生する
   * @param {string} name - constants.js の SOUND_PATHS に定義したキー名
   */
  play(name) {
    const sound = this.sounds[name];
    if (!sound) {
      console.warn(`[SoundManager] 未定義のサウンド名です: "${name}"`);
      return;
    }
    sound.currentTime = 0;
    sound.play();
  }
}
