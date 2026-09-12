import { db } from "./firebase.js";
import {
  doc,
  onSnapshot,
  getDoc,
  setDoc,
  runTransaction,
  collection,
  getDocs,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { DEFAULTS, validate } from "./model.js";
const settingsDoc = doc(db, "memorySettings/current");
export function watchSettings(next, error) {
  return onSnapshot(
    settingsDoc,
    (s) => {
      try {
        next(validate(s.exists() ? s.data() : structuredClone(DEFAULTS)));
      } catch (e) {
        error(e);
      }
    },
    error,
  );
}
export async function saveSettings(value, expectedRevision) {
  validate(value);
  return runTransaction(db, async (tx) => {
    const s = await tx.get(settingsDoc);
    const revision = s.exists() ? s.data().revision || 0 : 0;
    if (revision !== expectedRevision)
      throw Error(
        "別の画面で設定が変更されました。再読み込みしてから編集してください。",
      );
    const refs = [
      ...new Set([
        value.back,
        ...value.types.flatMap((t) => [t.drop, ...t.poses.map((p) => p.image)]),
      ]),
    ].filter((r) => r.startsWith("upload:"));
    for (const ref of refs) {
      const [, slot, version] = ref.split(":");
      const image = await tx.get(doc(db, "memoryImages/" + slot));
      if (!image.exists() || image.data().version !== version)
        throw Error(
          "選択した画像が削除されています。保管庫を再読み込みして選び直してください。",
        );
    }
    const next = { ...value, revision: revision + 1 };
    tx.set(settingsDoc, next);
    return next;
  });
}
export async function saveLive(key, value, expectedRevision) {
  if (!["volume", "background"].includes(key)) throw Error("設定が不正です。");
  return runTransaction(db, async (tx) => {
    const s = await tx.get(settingsDoc);
    const c = s.exists() ? s.data() : structuredClone(DEFAULTS);
    if (c.revision !== expectedRevision)
      throw Error("別の画面で更新されています。再読み込みしてください。");
    const next = validate({
      ...c,
      [key]: value,
      revision: (c.revision || 0) + 1,
    });
    tx.set(settingsDoc, next);
    return next;
  });
}
const cache = new Map();
export function resolveImage(ref) {
  if (!ref.startsWith("upload:")) return Promise.resolve(ref);
  if (!cache.has(ref)) {
    const [, slot, version] = ref.split(":");
    const p = getDoc(doc(db, "memoryImages/" + slot))
      .then((s) => {
        if (!s.exists() || s.data().version !== version)
          throw Error(
            "保存画像が見つかりません。管理画面で選び直してください。",
          );
        return s.data().data;
      })
      .catch((e) => {
        cache.delete(ref);
        throw e;
      });
    cache.set(ref, p);
  }
  return cache.get(ref);
}
export async function resolveConfig(c) {
  const result = structuredClone(c);
  result.types = result.types.filter((t) => t.enabled);
  result.back = await resolveImage(c.back);
  await Promise.all(
    result.types.map(async (t) => {
      t.drop = await resolveImage(t.drop);
      await Promise.all(
        t.poses.map(async (p) => {
          p.image = await resolveImage(p.image);
        }),
      );
    }),
  );
  return result;
}
export async function listImages() {
  const s = await getDocs(collection(db, "memoryImages"));
  return s.docs.map((d) => ({
    ...d.data(),
    id: d.id,
    ref: "upload:" + d.id + ":" + d.data().version,
  }));
}
export async function uploadImage(file, existingImages) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 15 * 1024 * 1024
  )
    throw Error("15MB以下のPNG・JPEG・WebPを選んでください。");
  const bitmap = await createImageBitmap(file);
  let data;
  try {
    for (const limit of [512, 384, 256]) {
      const scale = Math.min(1, limit / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext("2d")
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      data = canvas.toDataURL("image/webp", 0.85);
      if (data.startsWith("data:image/webp;base64,") && data.length <= 350000)
        break;
    }
  } finally {
    bitmap.close();
  }
  if (!data?.startsWith("data:image/webp;base64,") || data.length > 350000)
    throw Error(
      "画像を十分に圧縮できませんでした。小さい画像を選んでください。",
    );
  const images = existingImages || (await listImages());
  const slot = Array.from({ length: 50 }, (_, i) => "slot" + i).find(
    (id) => !images.some((x) => x.id === id),
  );
  if (!slot)
    throw Error("保存画像は50枚までです。未使用の画像を削除してください。");
  const entry = {
    name: file.name.slice(0, 80),
    version: crypto.randomUUID(),
    data,
  };
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "memoryImages/" + slot);
    if ((await tx.get(ref)).exists())
      throw Error("別の画像が追加されました。もう一度お試しください。");
    tx.set(ref, entry);
  });
  return { ...entry, id: slot, ref: "upload:" + slot + ":" + entry.version };
}
export async function removeImage(image) {
  await runTransaction(db, async (tx) => {
    const s = await tx.get(settingsDoc);
    const c = s.exists() ? s.data() : DEFAULTS;
    if (JSON.stringify(c).includes(image.ref))
      throw Error(
        "設定で使用中の画像です。先に別の画像を選び、保存してください。",
      );
    tx.delete(doc(db, "memoryImages/" + image.id));
  });
  cache.delete(image.ref);
}
