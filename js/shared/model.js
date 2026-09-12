export const BUILTIN_IMAGES = [
  "cat.png",
  "cat2.png",
  "cat3.png",
  "back.png",
].map((name, i) => ({
  ref: "assets/images/" + name,
  name: ["猫１", "猫２", "猫３", "カード裏面"][i],
}));
export const SOUND_NAMES = {
  flip: "めくる",
  correct: "正解",
  miss: "不正解",
  drop: "落下",
  start: "開始",
};
export const DEFAULTS = {
  schema: 1,
  revision: 0,
  pairCount: 3,
  background: "transparent",
  volume: 70,
  back: "assets/images/back.png",
  sounds: Object.fromEntries(
    Object.keys(SOUND_NAMES).map((k) => [k, "assets/audio/" + k + ".mp3"]),
  ),
  types: [1, 2, 3].map((n) => ({
    id: "cat" + n,
    name: "猫" + n,
    enabled: true,
    drop: "assets/images/cat" + (n === 1 ? "" : n) + ".png",
    poses: [
      { image: "assets/images/cat" + (n === 1 ? "" : n) + ".png", weight: 1 },
    ],
  })),
};
export function imageRef(ref) {
  return (
    typeof ref === "string" &&
    (/^assets\/images\/[\w-]+\.(png|webp|jpg)$/.test(ref) ||
      /^upload:slot([0-9]|[1-4][0-9]):[a-zA-Z0-9-]+$/.test(ref))
  );
}
export function validate(c) {
  if (
    !c ||
    c.schema !== 1 ||
    ![3, 6, 10].includes(c.pairCount) ||
    !["transparent", "green", "white", "black"].includes(c.background) ||
    !Number.isFinite(c.volume) ||
    c.volume < 0 ||
    c.volume > 100 ||
    !imageRef(c.back)
  )
    throw Error("基本設定を確認してください。");
  if (
    !Array.isArray(c.types) ||
    !c.types.length ||
    c.types.length > 10 ||
    !c.types.some((t) => t.enabled)
  )
    throw Error("猫を1〜10種類登録し、少なくとも1種類を使用してください。");
  if (new Set(c.types.map((t) => t.id)).size !== c.types.length)
    throw Error("猫の識別番号が重複しています。");
  for (const t of c.types) {
    if (
      !t.id ||
      !t.name?.trim() ||
      t.name.length > 40 ||
      typeof t.enabled !== "boolean" ||
      !imageRef(t.drop) ||
      !Array.isArray(t.poses) ||
      !t.poses.length ||
      t.poses.length > 10 ||
      !t.poses.some((p) => p.weight > 0)
    )
      throw Error("猫の名前・画像・絵柄の出やすさを確認してください。");
    for (const p of t.poses)
      if (
        !imageRef(p.image) ||
        !Number.isFinite(p.weight) ||
        p.weight < 0 ||
        p.weight > 100
      )
        throw Error("絵柄の出やすさは0〜100で指定してください。");
  }
  for (const k of Object.keys(SOUND_NAMES))
    if (
      !Object.keys(SOUND_NAMES).some(
        (n) => c.sounds?.[k] === "assets/audio/" + n + ".mp3",
      )
    )
      throw Error("効果音を選び直してください。");
  return c;
}
export function weightedPose(poses, random = Math.random) {
  let value = random() * poses.reduce((s, p) => s + p.weight, 0);
  for (const p of poses) {
    value -= p.weight;
    if (value < 0) return p.image;
  }
  return poses.findLast((p) => p.weight > 0).image;
}
export function buildDeck(config, random = Math.random) {
  const types = config.types.filter((t) => t.enabled),
    cards = [];
  // Shuffle type order so an extra pair is not always assigned to the first cat.
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  shuffle(types);
  for (let i = 0; i < config.pairCount; i++) {
    const t = types[i % types.length];
    for (let j = 0; j < 2; j++)
      cards.push({
        type: t.id,
        image: weightedPose(t.poses, random),
        drop: t.drop,
      });
  }
  return shuffle(cards);
}
