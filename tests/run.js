import assert from "node:assert";
import { marksOf, numbering } from "../notes.js";
import { applyEvents } from "../renumber.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const paragraphs = [{ id: "p1", text: "alpha [note:a]" }];
const notes = [{ id: "a", text: "first note" }];
const events = [{ event_id: "e1", op: "replace", paragraph: "p1", text: "alpha [note:a] beta" }];

check("marksOf returns a list", () => {
  assert.ok(Array.isArray(marksOf(paragraphs, notes)));
});

check("numbering returns an object", () => {
  assert.strictEqual(typeof numbering([["p1", "a", 1]]), "object");
});

check("applyEvents returns paragraphs", () => {
  assert.ok(Array.isArray(applyEvents(paragraphs, notes, events, [], 1).paragraphs));
});

check("applyEvents reports pending", () => {
  assert.strictEqual(typeof applyEvents(paragraphs, notes, events, [], 1).pending, "number");
});

check("applyEvents reports closing", () => {
  assert.strictEqual(typeof applyEvents(paragraphs, notes, events, [], 1).closing, "number");
});

check("render exposes full_diff", () => {
  const spec = { paragraphs: paragraphs, notes: notes, events: events, applied: [], budget: 1 };
  assert.strictEqual(typeof render(spec).full_diff, "number");
});

console.log("6 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
