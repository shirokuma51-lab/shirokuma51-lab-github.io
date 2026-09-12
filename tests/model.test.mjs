import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULTS,
  validate,
  buildDeck,
  weightedPose,
} from "../js/shared/model.js";
test("all pair counts keep even type counts and balanced pairs", () => {
  for (const pairCount of [3, 6, 10])
    for (let i = 0; i < 100; i++) {
      const deck = buildDeck({ ...DEFAULTS, pairCount });
      assert.equal(deck.length, pairCount * 2);
      const counts = Object.values(
        deck.reduce((s, c) => ((s[c.type] = (s[c.type] || 0) + 1), s), {}),
      );
      assert(counts.every((n) => n % 2 === 0));
      assert(Math.max(...counts) - Math.min(...counts) <= 2);
    }
});
test("pose weights select within the type, zero never selected", () => {
  const poses = [
    { image: "zero", weight: 0 },
    { image: "one", weight: 1 },
    { image: "three", weight: 3 },
  ];
  assert.equal(
    weightedPose(poses, () => 0),
    "one",
  );
  assert.equal(
    weightedPose(poses, () => 0.249),
    "one",
  );
  assert.equal(
    weightedPose(poses, () => 0.25),
    "three",
  );
  assert.equal(
    weightedPose(poses, () => 0.999),
    "three",
  );
});
test("invalid input and empty active configuration are rejected", () => {
  assert.doesNotThrow(() => validate(DEFAULTS));
  for (const patch of [
    { pairCount: 7 },
    { volume: 101 },
    { back: "javascript:alert(1)" },
    { types: [] },
    { types: DEFAULTS.types.map((t) => ({ ...t, enabled: false })) },
    {
      types: [
        {
          ...DEFAULTS.types[0],
          poses: [{ image: "assets/images/cat.png", weight: 0 }],
        },
      ],
    },
    {
      types: [
        {
          ...DEFAULTS.types[0],
          poses: [{ image: "https://unknown.example/a.png", weight: 1 }],
        },
      ],
    },
  ])
    assert.throws(() => validate({ ...DEFAULTS, ...patch }));
});
