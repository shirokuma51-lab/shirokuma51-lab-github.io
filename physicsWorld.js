// ===============================================================
// physicsWorld.js
// Matter.js を使った物理演算ワールドを管理するクラス。
// ペアが揃った際、アイコンが降ってくる演出を担当する。
// ===============================================================

import { CANVAS_WIDTH, CANVAS_HEIGHT, PHYSICS_CONFIG } from "./constants.js";

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
    const { World, Bodies } = Matter;
    const { min, max } = PHYSICS_CONFIG.dropXRange;
    const x = Math.random() * (max - min) + min;

    const ball = Bodies.circle(x, PHYSICS_CONFIG.dropY, PHYSICS_CONFIG.iconRadius, {
      restitution: PHYSICS_CONFIG.iconRestitution,
      friction: PHYSICS_CONFIG.iconFriction,
      render: {
        sprite: {
          texture: image,
          xScale: PHYSICS_CONFIG.iconSpriteScale,
          yScale: PHYSICS_CONFIG.iconSpriteScale
        }
      }
    });

    World.add(this.engine.world, ball);
    this.soundManager.play("drop");
  }
}
