// renumber.js：编辑事件与重编号（基线：不应用事件、不重编号）
import { marksOf, numbering } from "./notes.js";

export function applyEvents(paragraphs, notes, events, applied, budget) {
  return {
    paragraphs: paragraphs, marks: [], order: [], unused: [], numbers: {},
    firstRebuilt: 0, firstStale: 0, closing: 0, pending: 0, skipped: 0
  };
}
