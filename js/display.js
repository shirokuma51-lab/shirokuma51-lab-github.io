import { SoundManager } from "./game/soundManager.js";
import { PhysicsWorld } from "./game/physicsWorld.js";
import { MemoryGame } from "./game/memoryGame.js";
import { setupResizeHandler } from "./game/resizeHandler.js";
import { watchSettings, resolveConfig } from "./shared/store.js";
const gameEl = document.getElementById("game"),
  status = document.getElementById("displayStatus"),
  start = document.getElementById("startBtn");
const sound = new SoundManager(),
  physics = new PhysicsWorld(gameEl, sound),
  game = new MemoryGame(document.getElementById("memory"), sound, physics);
let latest = null,
  request = 0;
start.disabled = true;
status.textContent = "設定を読み込んでいます…";
watchSettings(
  (c) => {
    latest = c;
    sound.configure(c.sounds, c.volume);
    document.body.style.background = {
      transparent: "transparent",
      green: "#00ff00",
      white: "#fff",
      black: "#000",
    }[c.background];
    start.disabled = false;
    status.textContent = "";
  },
  () => {
    status.textContent =
      "設定を取得できません。通信状態を確認して再読み込みしてください。";
  },
);
start.onclick = async () => {
  const token = ++request;
  start.disabled = true;
  status.textContent = "画像を準備しています…";
  try {
    const config = await resolveConfig(latest);
    await Promise.all(
      [
        ...new Set([
          config.back,
          ...config.types
            .filter((t) => t.enabled)
            .flatMap((t) => [t.drop, ...t.poses.map((p) => p.image)]),
        ]),
      ].map(
        (src) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = () =>
              reject(
                Error(
                  "画像を読み込めません。管理画面で素材を確認してください。",
                ),
              );
            img.src = src;
          }),
      ),
    );
    if (token !== request) return;
    game.start(config);
    sound.play("start");
    status.textContent = "";
  } catch (e) {
    if (token === request) status.textContent = e.message;
  } finally {
    if (token === request) start.disabled = false;
  }
};
document.getElementById("resetBtn").onclick = () => {
  request++;
  game.reset();
  start.disabled = !latest;
  status.textContent = "";
};
setupResizeHandler(gameEl, physics);
