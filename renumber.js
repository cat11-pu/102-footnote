// renumber.js：编辑事件与重编号
import { marksOf, numbering } from "./notes.js";

function unknownNoteError(detail) {
  const error = new Error(detail);
  error.code = "E_UNKNOWN_NOTE";
  return error;
}

// 标记身份：同一段内同一脚注的同一次出现，跨事件保持已发出的编号。
function keyOf(mark) {
  return mark[0] + " " + mark[1] + " " + mark[2];
}

function applyEvent(current, event) {
  if (event.op === "replace") {
    const target = current.find((p) => p.id === event.paragraph);
    if (!target) throw unknownNoteError("unknown paragraph: " + event.paragraph);
    target.text = event.text || "";
  } else if (event.op === "remove") {
    const index = current.findIndex((p) => p.id === event.paragraph);
    if (index < 0) throw unknownNoteError("unknown paragraph: " + event.paragraph);
    current.splice(index, 1);
  } else if (event.op === "insert") {
    const fresh = typeof event.paragraph === "object" && event.paragraph !== null
      ? { id: event.paragraph.id, text: event.paragraph.text || "" }
      : { id: event.paragraph, text: event.text || "" };
    if (event.before === undefined || event.before === null || event.before === "") {
      current.push(fresh);
    } else {
      const index = current.findIndex((p) => p.id === event.before);
      if (index < 0) throw unknownNoteError("unknown paragraph: " + event.before);
      current.splice(index, 0, fresh);
    }
  } else {
    return false;
  }
  return true;
}

export function applyEvents(paragraphs, notes, events, applied, budget) {
  const noteList = notes || [];
  const done = new Set(applied || []);
  const limit = typeof budget === "number" && budget > 0 ? Math.floor(budget) : 0;

  const current = (paragraphs || []).map((p) => ({ id: p.id, text: p.text }));

  // 先按检查点内容编号：numbers 是脚注级已发编号，issued 是标记级已发编号。
  let marks = marksOf(current, noteList);
  const numbers = numbering(marks);
  const issued = {};
  for (const mark of marks) {
    issued[keyOf(mark)] = numbers[mark[1]];
  }

  let skipped = 0;
  let firstRebuilt = 0;
  let firstStale = 0;
  let rounds = 0;
  let stale = 0;

  for (const event of events || []) {
    if (!event) continue;
    if (done.has(event.event_id)) { skipped += 1; continue; }
    if (!applyEvent(current, event)) continue;

    // 事件后重算编号，逐标记与已发出的编号比。
    marks = marksOf(current, noteList);
    const fresh = numbering(marks);
    for (const mark of marks) {
      const key = keyOf(mark);
      if (!(key in issued)) {
        const held = numbers[mark[1]];
        issued[key] = held === undefined ? null : held;
      }
    }
    const changed = marks.filter((mark) => issued[keyOf(mark)] !== fresh[mark[1]]);
    let rebuilt = 0;
    for (const mark of changed) {
      if (rebuilt >= limit) break;
      issued[keyOf(mark)] = fresh[mark[1]];
      numbers[mark[1]] = fresh[mark[1]];
      rebuilt += 1;
    }
    stale = marks.filter((mark) => issued[keyOf(mark)] !== fresh[mark[1]]).length;
    rounds += 1;
    if (rounds === 1) {
      firstRebuilt = rebuilt;
      firstStale = stale;
    }
  }

  // 收尾：仍有陈旧标记则一次刷新（不受预算），最终陈旧数必须为 0。
  let closing = 0;
  if (stale > 0) {
    const fresh = numbering(marks);
    for (const mark of marks) {
      const key = keyOf(mark);
      if (issued[key] !== fresh[mark[1]]) {
        issued[key] = fresh[mark[1]];
        numbers[mark[1]] = fresh[mark[1]];
        closing += 1;
      }
    }
    stale = 0;
  }

  const order = [];
  const finalNumbers = {};
  for (const mark of marks) {
    const noteId = mark[1];
    if (!(noteId in finalNumbers)) {
      order.push(noteId);
      finalNumbers[noteId] = issued[keyOf(mark)];
    }
  }
  const used = new Set(order);
  const unused = noteList.map((note) => note.id).filter((id) => !used.has(id));

  return {
    paragraphs: current,
    marks: marks.map((mark) => [mark[0], mark[1], mark[2], issued[keyOf(mark)]]),
    order: order,
    unused: unused,
    numbers: finalNumbers,
    firstRebuilt: firstRebuilt,
    firstStale: firstStale,
    closing: closing,
    pending: stale,
    skipped: skipped
  };
}
