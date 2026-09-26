// notes.js：标记扫描与编号
const MARK_PATTERN = /\[note:([^\]]*)\]/g;

function unknownNoteError() {
  const error = new Error("unknown footnote referenced by mark");
  error.code = "E_UNKNOWN_NOTE";
  return error;
}

// 按段序加段内位置扫出全部标记，返回 [段编号, 脚注编号, 本段第几次, 占位号]
export function marksOf(paragraphs, notes) {
  const known = new Set((notes || []).map((note) => note.id));
  const marks = [];
  (paragraphs || []).forEach((paragraph) => {
    const seen = new Map();
    let match;
    MARK_PATTERN.lastIndex = 0;
    while ((match = MARK_PATTERN.exec(paragraph.text || "")) !== null) {
      const noteId = match[1];
      if (!known.has(noteId)) throw unknownNoteError();
      const occurrence = (seen.get(noteId) || 0) + 1;
      seen.set(noteId, occurrence);
      marks.push([paragraph.id, noteId, occurrence, null]);
    }
  });
  return marks;
}

// 按首次出现顺序编号，重复引用复用首号；返回 脚注编号 -> 序号
export function numbering(marks) {
  const numbers = {};
  let next = 0;
  for (const mark of marks || []) {
    const noteId = mark[1];
    if (!Object.prototype.hasOwnProperty.call(numbers, noteId)) {
      next += 1;
      numbers[noteId] = next;
    }
  }
  return numbers;
}
