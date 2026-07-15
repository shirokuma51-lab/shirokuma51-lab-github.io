// ===============================================================
// physicsWorld.js
// Matter.js を使った物理演算ワールドを管理するクラス。
// ペアが揃った際、アイコンが降ってくる演出を担当する。
// ===============================================================

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PHYSICS_CONFIG,
  EFFECT_ICON_APPEAR_DURATION_MS,
  EFFECT_ICON_START_SCALE_RATIO,
  EFFECT_ICON_PEAK_SCALE_RATIO
} from "./constants.js";

export class PhysicsWorld {
  /**
   * @param {HTMLElement} container - Matter.Render の描画先要素(#game)
   * @param {SoundManager} soundManager - 落下音を再生するために使用
   */
  constructor(container, soundManager) {
    const { Engine, Render } = Matter;

    this.soundManager = soundManager;
    this.engine = Engine.create();

    this.render = Render.create({
      element: container,
      engine: this.engine,
      options: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: "transparent",
        wireframes: false
      }
    });

    Render.run(this.render);
    Engine.run(this.engine);

    this._createBoundaries();
  }

  /** 床・左壁・右壁を生成してワールドに追加する（静的オブジェクト） */
  _createBoundaries() {
    const { World, Bodies } = Matter;
    const t = PHYSICS_CONFIG.wallThickness;

    World.add(this.engine.world, [
      // 床
      Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT - t / 2, CANVAS_WIDTH, t, { isStatic: true }),
      // 左壁
      Bodies.rectangle(0, CANVAS_HEIGHT / 2, t, CANVAS_HEIGHT, { isStatic: true }),
      // 右壁
      Bodies.rectangle(CANVAS_WIDTH, CANVAS_HEIGHT / 2, t, CANVAS_HEIGHT, { isStatic: true })
    ]);
  }

  /**
   * 指定した画像のアイコンを画面上部からランダムなX座標で落下させる
   * @param {string} image - 落下させるアイコン画像のパス
   */
  dropIcon(image) {
    const { World, Bodies, Body } = Matter;
    const { min, max } = PHYSICS_CONFIG.dropXRange;
    const x = Math.random() * (max - min) + min;

    // 【演出】最終的なサイズ(baseScale)に対する、出現時・ピーク時のスケール比率
    const baseScale = PHYSICS_CONFIG.iconSpriteScale;
    const startScale = baseScale * EFFECT_ICON_START_SCALE_RATIO;
    const peakScale = baseScale * EFFECT_ICON_PEAK_SCALE_RATIO;

    const ball = Bodies.circle(x, PHYSICS_CONFIG.dropY, PHYSICS_CONFIG.iconRadius, {
      restitution: PHYSICS_CONFIG.iconRestitution,
      friction: PHYSICS_CONFIG.iconFriction,
      render: {
        sprite: {
          texture: image,
          xScale: startScale,
          yScale: startScale
        },
        opacity: 0 // 【演出】フェードインさせるため、最初は透明にしておく
      }
    });

    World.add(this.engine.world, ball);
    this.soundManager.play("drop");

    // 【演出】出現時に少しだけランダムに回転させる（柔らかく可愛い揺れ）
    const randomSpin = (Math.random() * 2 - 1) * PHYSICS_CONFIG.iconSpinVelocity;
    Body.setAngularVelocity(ball, randomSpin);

    // 【演出】拡大→縮小の弾むような出現アニメーション＋フェードイン
    this._animateIconAppearance(ball, startScale, peakScale, baseScale);
  }

  /**
   * 【演出】落下アイコンの出現アニメーション（拡大→縮小＋フェードイン）を再生する。
   * Matter.jsはCanvasに直接描画するためCSS Animationが使えず、
   * ここだけ requestAnimationFrame でスプライトのスケール・不透明度を短時間だけ
   * 手動で補間している（物理演算そのものには一切影響しない、見た目だけの処理）。
   * @param {Matter.Body} ball
   * @param {number} startScale - 出現直後のスケール
   * @param {number} peakScale - 一番大きくなる瞬間のスケール
   * @param {number} baseScale - 最終的に落ち着くスケール
   */
  _animateIconAppearance(ball, startScale, peakScale, baseScale) {
    const duration = EFFECT_ICON_APPEAR_DURATION_MS;
    const startTime = performance.now();

    const step = now => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // 前半(0〜0.5): startScale→peakScale、後半(0.5〜1): peakScale→baseScale
      const scale =
        t < 0.5
          ? startScale + (peakScale - startScale) * (t / 0.5)
          : peakScale + (baseScale - peakScale) * ((t - 0.5) / 0.5);

      ball.render.sprite.xScale = scale;
      ball.render.sprite.yScale = scale;
      ball.render.opacity = Math.min(t * 2, 1); // フェードインは前半で完了させる

      if (t < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }
}
