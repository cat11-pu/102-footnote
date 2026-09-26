// app.js：渲染结果
import { marksOf, numbering } from "./notes.js";
import { applyEvents } from "./renumber.js";

export function render(spec) {
  const result = applyEvents(spec.paragraphs || [], spec.notes || [], spec.events || [],
    spec.applied || [], spec.budget);
  const fresh = numbering(marksOf(result.paragraphs || [], spec.notes || []));
  let diff = 0;
  for (const item of result.marks || []) {
    if (fresh[item[1]] !== item[3]) diff += 1;
  }
  return {
    marks: (result.order || []).map(function (noteId) { return [noteId, (result.numbers || {})[noteId]]; }),
    footnotes: result.order || [],
    unused: result.unused || [],
    first_rebuilt: result.firstRebuilt,
    first_stale: result.firstStale,
    closing: result.closing,
    pending: result.pending,
    full_diff: diff,
    skipped: result.skipped
  };
}
