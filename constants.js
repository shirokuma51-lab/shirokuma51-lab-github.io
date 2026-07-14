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
  flip: "flip.mp3",
  correct: "correct.mp3",
  miss: "miss.mp3",
  drop: "drop.mp3",
  start: "start.mp3" // 現状コード内では未使用（今後スタートボタン用などに利用可）
};

// カード表面に使うアイコン画像一覧
// ⚠️ 現在アップロードされているのは cat.png / cat2.png / cat3.png の3種のみです。
//    「4種類」「5種類」を選択すると cat4.png / cat5.png が見つからず
//    画像が表示されない状態になります。画像を追加する際はここに追記するだけでOKです。
export const ICONS = [
  "cat.png",
  "cat2.png",
  "cat3.png",
  "cat4.png",
  "cat5.png"
];

// カード裏面の画像
export const CARD_BACK_IMAGE = "back.png";

// ペア数ごとのグリッド列数・カードサイズ設定
// 新しいペア数の選択肢を追加したい場合はここに1行追記するだけで対応可能
export const GRID_LAYOUTS = {
  3: { columns: 2, cardSize: 300 },
  6: { columns: 3, cardSize: 250 },
  10: { columns: 4, cardSize: 180 }
};

// 2枚目をめくってから正解判定を行うまでの待機時間(ms)
export const CARD_CHECK_DELAY = 600;
// ペア成立時、カードを非表示にするまでの待機時間(ms)
export const CARD_HIDE_DELAY = 300;

// ===============================================================
// Lucky Chance 関連の設定
// ===============================================================

// ペアが揃った時にLucky Chanceが発生する確率（0〜1）
// 例: 0.15 なら 15%の確率で発生
export const LUCKY_CHANCE_TRIGGER_PROBABILITY = 0.15;

// スロットの桁数（例: 3なら「7 7 7」のような3桁スロット）
export const LUCKY_CHANCE_DIGIT_COUNT = 3;

// 回転中の桁が1コマ進む間隔(ms)
export const LUCKY_CHANCE_TICK_INTERVAL_MS = 500;

// 1桁目が止まってから、残り全部の桁が止まるまでの制限時間(ms)。
// この時間内に全桁止まらなければ、止めていた桁も含めて全部再び回り出す。
// （＝複数人が息を合わせてボタンを押す必要がある、という仕様のキモ）
export const LUCKY_CHANCE_STOP_WINDOW_MS = 500;

// 結果が確定してから、演出を消すまでの表示時間(ms)
export const LUCKY_CHANCE_RESULT_DISPLAY_MS = 2000;

// Matter.js 物理演算関連の設定
export const PHYSICS_CONFIG = {
  wallThickness: 80,       // 床・壁の厚み
  iconRadius: 120,          // 落下するアイコンの半径
  iconRestitution: 0,       // 反発係数
  iconFriction: 1,          // 摩擦係数
  iconSpriteScale: 0.35,    // アイコン画像の表示スケール
  dropXRange: { min: 200, max: 1200 }, // 落下開始X座標のランダム範囲
  dropY: 100                 // 落下開始Y座標
};
