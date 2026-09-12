// ===============================================================
// constants.js
// ゲーム全体で使う定数をまとめるファイル。
// 今後「ペア数を増やす」「アイコンを追加する」「演出時間を変える」等は
// 基本的にこのファイルの中だけを編集すれば対応できるようにしている。
// ===============================================================

// OBS用の固定キャンバスサイズ
export const CANVAS_WIDTH = 1536;
export const CANVAS_HEIGHT = 2048;

// 効果音ファイルのパス（キー名で呼び出す）
export const SOUND_PATHS = {
  flip: "assets/audio/flip.mp3",
  correct: "assets/audio/correct.mp3",
  miss: "assets/audio/miss.mp3",
  drop: "assets/audio/drop.mp3",
  start: "assets/audio/start.mp3",
};

// ペア数ごとのグリッド列数・カードサイズ設定
// 新しいペア数の選択肢を追加したい場合はここに1行追記するだけで対応可能
export const GRID_LAYOUTS = {
  3: { columns: 2, cardSize: 300 },
  6: { columns: 3, cardSize: 250 },
  10: { columns: 4, cardSize: 180 },
};

// カード番号の文字サイズを、カードサイズに対してどのくらいの比率にするか
// （元々は300pxカードに対して150pxだったので、その比率 0.5 を基準にしている）
export const CARD_NUMBER_FONT_RATIO = 0.5;

// 2枚目をめくってから正解判定を行うまでの待機時間(ms)
export const CARD_CHECK_DELAY = 600;
// Show each revealed face long enough to read it before checking the pair.
export const CARD_PREVIEW_HOLD_MS = 1800;
export const CARD_PREVIEW_FADE_MS = 220;
// ペア成立時、カードを非表示にするまでの待機時間(ms)
export const CARD_HIDE_DELAY = 300;

// Matter.js 物理演算関連の設定
export const PHYSICS_CONFIG = {
  wallThickness: 80, // 床・壁の厚み
  iconRadius: 120, // 落下するアイコンの半径
  iconRestitution: 0, // 反発係数
  iconFriction: 1, // 摩擦係数
  iconSpriteScale: 0.35, // アイコン画像の表示スケール（最終的な基準サイズ）
  dropXRange: { min: 200, max: 1200 }, // 落下開始X座標のランダム範囲
  dropY: 100, // 落下開始Y座標
  iconSpinVelocity: 0.06, // 【演出】出現時に与えるランダム回転の最大角速度(ラジアン/フレーム)
};

// ===============================================================
// 演出（アニメーション）関連の定数
// あくまで見た目のタイミング調整用で、ゲームの当たり判定などの
// ロジックには影響しない値だけをここにまとめている。
// ===============================================================

// カードめくり（3D Flip）のアニメーション時間(ms)。CSS側の card-flip と一致させること
export const EFFECT_CARD_FLIP_DURATION_MS = 250;
// カードめくりアニメーションの半分＝表裏の画像が切り替わる瞬間(ms)
export const EFFECT_CARD_FLIP_SWAP_MS = EFFECT_CARD_FLIP_DURATION_MS / 2;

// 正解演出（拡大・リング・キラキラ）の表示時間(ms)。
// この時間が経過してからdropIcon()を呼び、カードを非表示にする
export const EFFECT_CORRECT_DURATION_MS = CARD_HIDE_DELAY;

// 不正解演出（シェイク）の表示時間(ms)。この時間が経過してから裏面に戻す
export const EFFECT_MISS_SHAKE_DURATION_MS = 400;

// コンボ表示（ポップ＆フェードアウト）の表示時間(ms)
export const EFFECT_COMBO_DISPLAY_DURATION_MS = 800;

// 落下アイコンの出現アニメーション（拡大→縮小＋フェードイン）の時間(ms)
export const EFFECT_ICON_APPEAR_DURATION_MS = 200;
// 落下アイコンの出現時サイズ倍率（基準サイズ iconSpriteScale に対する比率）
export const EFFECT_ICON_START_SCALE_RATIO = 0.8;
export const EFFECT_ICON_PEAK_SCALE_RATIO = 1.15;

// ===============================================================
// 背景プリセット
// OBSの「ブラウザ」ソースで正しく透過キャプチャできていれば
// 基本は「transparent」のままでよいが、確認用・別ソフトとの
// 互換性のために色を選べるようにしておく。
// ===============================================================
export const BACKGROUND_OPTIONS = {
  transparent: { label: "透明（OBS用）", cssValue: "transparent" },
  green: { label: "グリーンバック", cssValue: "#00ff00" },
  white: { label: "白", cssValue: "#ffffff" },
  black: { label: "黒", cssValue: "#000000" },
};

// ページを開いた時点で適用しておく背景キー（BACKGROUND_OPTIONSのキーのいずれか）
export const DEFAULT_BACKGROUND_KEY = "transparent";
