---
tags: []
---
```dataviewjs
const now = new Date();
const d = new Date(now);
d.setHours(0, 0, 0, 0);
if (d.getDay() === 0) d.setDate(d.getDate() + 1); // Sunday → treat as Monday of next week
d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
const yearStart = new Date(d.getFullYear(), 0, 4);
const week = 1 + Math.round(((d.getTime() - yearStart.getTime()) / 86400000 - 3 + (yearStart.getDay() + 6) % 7) / 7);
const year = d.getFullYear();
const weekStr = year + "-W" + week;
const filePath = "周计划/" + year + "/" + weekStr;
const file = dv.page(filePath);

if (file) {
    dv.paragraph("[[" + filePath + "|本周内容]]");
} else {
    dv.paragraph("[[" + filePath + "|创建本周内容]]");
}
```
