// renumber.js：编辑事件与预算化重编号
import { marksOf, numbering } from "./notes.js";

function failUnknownNote() {
  const error = new Error("unknown footnote or paragraph reference");
  error.code = "E_UNKNOWN_NOTE";
  throw error;
}

function scan(paragraphs, notes) {
  return marksOf(paragraphs, notes).map((mark) => mark.slice());
}

export function applyEvents(paragraphs, notes, events, applied, budget) {
  const appliedSet = new Set(applied || []);
  const allowance = Number.isFinite(budget) ? budget : Infinity;

  let current = (paragraphs || []).map((paragraph) => ({ id: paragraph.id, text: paragraph.text }));
  let marks = scan(current, notes);
  let held = numbering(marks);

  let skipped = 0;
  let firstRebuilt = 0;
  let firstStale = 0;
  let firstRoundTaken = false;

  for (const event of events || []) {
    if (appliedSet.has(event.event_id)) {
      skipped += 1;
      continue;
    }

    if (event.op === "replace") {
      const index = current.findIndex((paragraph) => paragraph.id === event.paragraph);
      if (index < 0) failUnknownNote();
      current[index] = { id: event.paragraph, text: event.text };
    } else if (event.op === "remove") {
      const index = current.findIndex((paragraph) => paragraph.id === event.paragraph);
      if (index < 0) failUnknownNote();
      current.splice(index, 1);
    } else if (event.op === "insert") {
      const index = event.before
        ? current.findIndex((paragraph) => paragraph.id === event.before)
        : current.length;
      if (event.before && index < 0) failUnknownNote();
      current.splice(index, 0, {
        id: event.paragraph_id || event.paragraph || "p" + (event.event_id || current.length),
        text: event.text || ""
      });
    }

    marks = scan(current, notes);
    const wanted = numbering(marks);

    const changed = [];
    const staleNow = new Set();
    for (const mark of marks) {
      const key = mark[0] + "\u0000" + mark[1] + "\u0000" + mark[2];
      const oldNumber = held[key];
      const newNumber = wanted[mark[1]];
      if (oldNumber === undefined || oldNumber !== newNumber) {
        changed.push([key, mark, newNumber]);
        staleNow.add(key);
      }
    }

    const rebuilt = Math.min(changed.length, allowance);
    for (let i = 0; i < rebuilt; i += 1) {
      held[changed[i][0]] = changed[i][2];
      staleNow.delete(changed[i][0]);
    }
    if (!firstRoundTaken) {
      firstRoundTaken = true;
      firstRebuilt = rebuilt;
      firstStale = staleNow.size;
    }
  }

  // 收尾：不受预算地把全部陈旧标记刷到最终编号
  marks = scan(current, notes);
  const finalNumbers = numbering(marks);
  let closing = 0;
  for (const mark of marks) {
    const key = mark[0] + "\u0000" + mark[1] + "\u0000" + mark[2];
    if (held[key] !== finalNumbers[mark[1]]) {
      held[key] = finalNumbers[mark[1]];
      closing += 1;
    }
    mark[3] = finalNumbers[mark[1]];
  }

  const order = Object.keys(finalNumbers);
  const referenced = new Set(marks.map((mark) => mark[1]));
  const unused = (notes || []).map((note) => note.id).filter((id) => !referenced.has(id));

  return {
    paragraphs: current,
    marks,
    order,
    unused,
    numbers: finalNumbers,
    firstRebuilt,
    firstStale,
    closing,
    pending: 0,
    skipped
  };
}
