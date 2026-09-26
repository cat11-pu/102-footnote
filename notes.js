// notes.js：标记扫描与编号
const MARK_PATTERN = /\[note:([^\[\]]+)\]/g;

function unknownNoteError(detail) {
  const error = new Error(detail);
  error.code = "E_UNKNOWN_NOTE";
  return error;
}

// 按文档顺序（段序加段内位置）扫出全部标记。
// 返回三元组 [段编号, 脚注编号, 该脚注在这一段里的第几次出现（1 起）]。
// 标记引用不存在的脚注时抛 E_UNKNOWN_NOTE。
export function marksOf(paragraphs, notes) {
  const known = new Set((notes || []).map((note) => note.id));
  const marks = [];
  for (const paragraph of paragraphs || []) {
    const counts = {};
    const text = paragraph.text || "";
    MARK_PATTERN.lastIndex = 0;
    let match;
    while ((match = MARK_PATTERN.exec(text)) !== null) {
      const noteId = match[1];
      if (!known.has(noteId)) {
        throw unknownNoteError("unknown note: " + noteId);
      }
      counts[noteId] = (counts[noteId] || 0) + 1;
      marks.push([paragraph.id, noteId, counts[noteId]]);
    }
  }
  return marks;
}

// 按首次出现顺序编号（重复引用复用首号），返回 { 脚注编号: 序号 }。
export function numbering(marks) {
  const numbers = {};
  let next = 1;
  for (const mark of marks || []) {
    const noteId = mark[1];
    if (!(noteId in numbers)) {
      numbers[noteId] = next;
      next += 1;
    }
  }
  return numbers;
}
