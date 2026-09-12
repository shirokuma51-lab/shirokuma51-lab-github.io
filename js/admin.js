import { auth, ADMIN_UID } from "./shared/firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  watchSettings,
  saveSettings,
  saveLive,
  listImages,
  uploadImage,
  removeImage,
} from "./shared/store.js";
import { DEFAULTS, BUILTIN_IMAGES, SOUND_NAMES } from "./shared/model.js";
const $ = (id) => document.getElementById(id);
let draft = null,
  latest = null,
  images = [],
  dirty = false,
  unsubscribe = null,
  busy = false,
  conflict = false;
const message = (text) => ($("status").textContent = text);
function changed() {
  dirty = true;
  $("saveState").textContent = "未保存の変更があります";
}
function node(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function label(text, input) {
  const e = node("label", text);
  e.append(input);
  return e;
}
function button(text, fn, cls = "secondary") {
  const b = node("button", text, cls);
  b.type = "button";
  b.onclick = fn;
  return b;
}
function imageOptions(select, value) {
  select.replaceChildren();
  for (const a of [...BUILTIN_IMAGES, ...images]) {
    const o = node("option", a.name);
    o.value = a.ref;
    select.append(o);
  }
  if (value && !Array.from(select.options).some((o) => o.value === value)) {
    const o = node("option", "保存済み画像（再選択してください）");
    o.value = value;
    select.append(o);
  }
  select.value = value;
}
function imageSelect(value, change) {
  const e = node("select");
  imageOptions(e, value);
  e.onchange = () => {
    change(e.value);
    changed();
  };
  return e;
}
function renderTypes() {
  $("types").replaceChildren();
  for (const t of draft.types) {
    const details = node("details"),
      summary = node("summary", t.name),
      body = node("div", undefined, "type-body");
    details.append(summary, body);
    const name = node("input");
    name.value = t.name;
    name.maxLength = 40;
    name.oninput = () => {
      t.name = name.value;
      summary.textContent = name.value || "名前未入力";
      changed();
    };
    const enabled = node("input");
    enabled.type = "checkbox";
    enabled.checked = t.enabled;
    enabled.onchange = () => {
      t.enabled = enabled.checked;
      changed();
    };
    body.append(
      label("この猫を使用する ", enabled),
      label("猫の名前", name),
      label(
        "落ちる画像",
        imageSelect(t.drop, (v) => (t.drop = v)),
      ),
      node(
        "p",
        "絵柄の出やすさ：数が大きいほど出やすく、0は出ません。",
        "help",
      ),
    );
    const poses = node("div");
    body.append(poses);
    const renderPoses = () => {
      poses.replaceChildren();
      for (const [i, p] of t.poses.entries()) {
        const row = node("div", undefined, "pose"),
          weight = node("input");
        weight.type = "number";
        weight.min = 0;
        weight.max = 100;
        weight.step = 1;
        weight.value = p.weight;
        weight.setAttribute("aria-label", "絵柄" + (i + 1) + "の出やすさ");
        weight.oninput = () => {
          p.weight = Number(weight.value);
          changed();
          updateProb();
        };
        row.append(
          label(
            "絵柄 " + (i + 1),
            imageSelect(p.image, (v) => (p.image = v)),
          ),
          label("出やすさ", weight),
          button(
            "削除",
            () => {
              if (t.poses.length === 1) {
                message("絵柄は1枚以上必要です。");
                return;
              }
              t.poses.splice(i, 1);
              changed();
              renderPoses();
            },
            "danger",
          ),
          node("span", "", "pose-prob"),
        );
        poses.append(row);
      }
      updateProb();
    };
    const updateProb = () => {
      const total = t.poses.reduce(
        (s, p) => s + (Number.isFinite(p.weight) ? p.weight : 0),
        0,
      );
      poses
        .querySelectorAll(".pose-prob")
        .forEach(
          (e, i) =>
            (e.textContent =
              "約 " +
              (total > 0
                ? ((t.poses[i].weight / total) * 100).toFixed(1)
                : "0") +
              "%"),
        );
    };
    renderPoses();
    const actions = node("div", undefined, "type-actions");
    actions.append(
      button("＋ 絵柄を追加", () => {
        if (t.poses.length >= 10) {
          message("絵柄は1種類につき10枚までです。");
          return;
        }
        t.poses.push({ image: t.poses[0].image, weight: 1 });
        changed();
        renderPoses();
      }),
      button(
        "この猫の種類を削除",
        () => {
          if (
            !confirm(
              t.name + "を設定から削除しますか？画像は保管庫に残ります。",
            )
          )
            return;
          draft.types = draft.types.filter((x) => x !== t);
          changed();
          renderTypes();
        },
        "danger",
      ),
    );
    body.append(actions);
    $("types").append(details);
  }
}
function renderGallery() {
  $("imageCount").textContent = images.length + " / 50枚";
  $("gallery").replaceChildren();
  for (const a of [...BUILTIN_IMAGES, ...images]) {
    const box = node("div", undefined, "asset"),
      img = node("img");
    img.src = a.data || a.ref;
    img.alt = a.name;
    box.append(img, node("p", a.name));
    if (a.id)
      box.append(
        button(
          "削除",
          async () => {
            if (JSON.stringify(draft).includes(a.ref)) {
              message(
                "編集中の設定で使われています。先に選択を変更してください。",
              );
              return;
            }
            if (!confirm(a.name + "を保管庫から削除しますか？")) return;
            await action(async () => {
              await removeImage(a);
              images = images.filter((x) => x.id !== a.id);
              renderGallery();
              renderTypes();
              imageOptions($("back"), draft.back);
              message("画像を削除しました。");
            });
          },
          "danger",
        ),
      );
    else box.append(node("p", "標準の画像"));
    $("gallery").append(box);
  }
}
function render() {
  $("pairs").value = draft.pairCount;
  $("background").value = draft.background;
  $("volume").value = draft.volume;
  $("volumeValue").value = draft.volume + "%";
  imageOptions($("back"), draft.back);
  renderTypes();
  $("sounds").replaceChildren();
  for (const [key, title] of Object.entries(SOUND_NAMES)) {
    const s = node("select");
    for (const [name, caption] of Object.entries(SOUND_NAMES)) {
      const o = node("option", caption + "の音");
      o.value = "assets/audio/" + name + ".mp3";
      s.append(o);
    }
    s.value = draft.sounds[key];
    s.onchange = () => {
      draft.sounds[key] = s.value;
      changed();
    };
    const wrap = node("div");
    wrap.append(
      label(title, s),
      button("試聴", () => {
        const audio = new Audio(s.value);
        audio.volume = draft.volume / 100;
        audio.play().catch(() => message("音声を再生できませんでした。"));
      }),
    );
    $("sounds").append(wrap);
  }
}
async function action(fn) {
  if (busy) return;
  busy = true;
  $("editor").inert = true;
  $("save").disabled = true;
  try {
    await fn();
  } catch (e) {
    message(
      e.code === "permission-denied"
        ? "保存権限がありません。管理者アカウントを確認してください。"
        : e.message || "処理に失敗しました。",
    );
  } finally {
    busy = false;
    $("editor").inert = false;
    $("save").disabled = false;
  }
}
$("loginForm").onsubmit = async (e) => {
  e.preventDefault();
  const b = e.target.querySelector("button");
  b.disabled = true;
  try {
    await signInWithEmailAndPassword(
      auth,
      $("email").value,
      $("password").value,
    );
    $("password").value = "";
  } catch {
    message(
      "ログインできません。メールアドレスとパスワードを確認してください。",
    );
  } finally {
    b.disabled = false;
  }
};
$("logout").onclick = () => {
  if (dirty && !confirm("未保存の変更を破棄してログアウトしますか？")) return;
  signOut(auth);
};
onAuthStateChanged(auth, async (user) => {
  unsubscribe?.();
  unsubscribe = null;
  $("editor").hidden = true;
  $("loginPanel").hidden = false;
  if (!user) {
    draft = null;
    latest = null;
    dirty = false;
    conflict = false;
    return;
  }
  if (user.uid !== ADMIN_UID) {
    message("このアカウントには管理者権限がありません。");
    await signOut(auth);
    return;
  }
  message("設定を読み込んでいます…");
  try {
    images = await listImages();
    if (auth.currentUser?.uid !== ADMIN_UID) return;
    unsubscribe = watchSettings(
      (c) => {
        latest = c;
        if (!draft || !dirty) {
          draft = structuredClone(c);
          dirty = false;
          conflict = false;
          render();
          $("saveState").textContent = "保存済み";
        } else {
          if (c.revision !== draft.revision) {
            conflict = true;
            $("saveState").textContent =
              "他の更新があります。保存前に再読み込みしてください。";
          }
          draft.background = c.background;
          draft.volume = c.volume;
          $("background").value = c.background;
          $("volume").value = c.volume;
          $("volumeValue").value = c.volume + "%";
        }
        $("editor").hidden = false;
        $("loginPanel").hidden = true;
        renderGallery();
        message("");
      },
      (e) => message("設定を取得できません。" + e.message),
    );
  } catch (e) {
    message("画像を読み込めません。" + e.message);
  }
});
$("pairs").onchange = () => {
  draft.pairCount = Number($("pairs").value);
  changed();
};
$("back").onchange = () => {
  draft.back = $("back").value;
  changed();
};
async function live(key, value) {
  await action(async () => {
    if (conflict)
      throw Error("別の更新があります。ページを再読み込みしてください。");
    const result = await saveLive(key, value, draft.revision);
    if (draft) {
      draft[key] = value;
      draft.revision = result.revision;
      conflict = false;
      $("saveState").textContent = dirty
        ? "未保存の変更があります"
        : "保存済み";
    }
    message("配信表示に反映しました。");
  });
}
$("background").onchange = () => live("background", $("background").value);
$("volume").oninput = () => {
  $("volumeValue").value = $("volume").value + "%";
};
$("volume").onchange = () => live("volume", Number($("volume").value));
$("addType").onclick = () => {
  if (draft.types.length >= 10) {
    message("猫は10種類までです。");
    return;
  }
  draft.types.push({
    id: crypto.randomUUID(),
    name: "新しい猫",
    enabled: true,
    drop: BUILTIN_IMAGES[0].ref,
    poses: [{ image: BUILTIN_IMAGES[0].ref, weight: 1 }],
  });
  changed();
  renderTypes();
  $("types").lastElementChild.open = true;
};
$("save").onclick = () =>
  action(async () => {
    if (conflict)
      throw Error(
        "別の更新があります。ページを再読み込みしてから編集してください。",
      );
    const saved = await saveSettings(draft, draft.revision);
    draft = structuredClone(saved);
    dirty = false;
    conflict = false;
    $("saveState").textContent = "保存済み";
    message("保存しました。カードの変更は配信表示の「開始」で反映されます。");
  });
async function upload(files) {
  await action(async () => {
    for (const file of files) {
      message(file.name + "を圧縮・保存しています…");
      images.push(await uploadImage(file, images));
      renderGallery();
      renderTypes();
      imageOptions($("back"), draft.back);
    }
    renderGallery();
    renderTypes();
    imageOptions($("back"), draft.back);
    message("画像を保存しました。猫やカードの設定で選べます。");
  });
  $("files").value = "";
}
$("files").onchange = () => upload([...$("files").files]);
for (const event of ["dragenter", "dragover"])
  $("dropZone").addEventListener(event, (e) => {
    e.preventDefault();
    $("dropZone").classList.add("over");
  });
$("dropZone").ondragleave = () => $("dropZone").classList.remove("over");
$("dropZone").ondrop = (e) => {
  e.preventDefault();
  $("dropZone").classList.remove("over");
  upload([...e.dataTransfer.files]);
};
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
