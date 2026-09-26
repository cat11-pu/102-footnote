import fs from "node:fs";
import { render } from "./app.js";
import { applyEvents } from "./renumber.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/doc.json", "utf8"));
const view = render(spec);

emit("标记编号 =", JSON.stringify(view.marks));
emit("文末脚注顺序 =", JSON.stringify(view.footnotes));
emit("未引用脚注 =", JSON.stringify(view.unused));
emit("首轮重编号数 =", view.first_rebuilt);
emit("首轮陈旧数 =", view.first_stale);
emit("收尾重编号数 =", view.closing);
emit("最终陈旧数 =", view.pending);
emit("全量差异 =", view.full_diff);
emit("跳过事件数 =", view.skipped);


// ---- 异常路径探针：真调用实现，看它报出什么码（不是从样例里抄）----
try {
  const bad = applyEvents([{ id: "p1", text: "[note:ghost]" }], [{ id: "a", text: "first" }], [], [], 1);
  emit("引用未知脚注错误码 =", bad && bad.code ? bad.code : "no-error");
} catch (error) {
  emit("引用未知脚注错误码 =", error.code || error.message);
}


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "标记编号": [
    [
      "b",
      1
    ],
    [
      "c",
      2
    ],
    [
      "a",
      3
    ]
  ],
  "文末脚注顺序": [
    "b",
    "c",
    "a"
  ],
  "未引用脚注": [
    "d"
  ],
  "首轮重编号数": 1,
  "首轮陈旧数": 2,
  "收尾重编号数": 3,
  "最终陈旧数": 0,
  "全量差异": 0,
  "跳过事件数": 1,
  "引用未知脚注错误码": "E_UNKNOWN_NOTE"
};
// 有的值在收进来之前已经 stringify 过，比较前先试着解析回来，避免类型错配把正确实现判成不过。
function __same(got, want) {
  if (typeof got === "string") {
    try { const parsed = JSON.parse(got); if (JSON.stringify(parsed) === JSON.stringify(want)) return true; } catch (error) { /* 不是 JSON 就按原文比 */ }
  }
  return JSON.stringify(got) === JSON.stringify(want);
}
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (__same(got, want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
