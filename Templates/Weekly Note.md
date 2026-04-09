---
aliases:
tags:
  - 手帐/周记
开始日期（周日）: <% window.moment(tp.file.title, "GGGG-[W]WW").day(0).format("YYYY-MM-DD") %>
结束日期（周六）: <% window.moment(tp.file.title, "GGGG-[W]WW").day(6).format("YYYY-MM-DD") %>
cssclasses:
  - hide-frontmatter
---

![[weeklyNavigation]]

[[信息intake]]
![[genTOC]]
# 1 Tasks
# 2 信息feed
## 2.1 本周更新
```dataviewjs
const p      = dv.current();
const start  = window.moment(String(p["开始日期（周日）"]).slice(0,10), "YYYY-MM-DD");
const end    = window.moment(String(p["结束日期（周六）"]).slice(0,10), "YYYY-MM-DD");

const tasks = dv.pages("#RSS")
    .file.tasks
    .where(t => !t.completed && t.created)
    .where(t => {
        const created = window.moment(String(t.created).slice(0, 10), "YYYY-MM-DD");
        return created.isSameOrAfter(start, 'day') && created.isSameOrBefore(end, 'day');
    });

dv.taskList(tasks);
```

## 2.2 本周已处理
```dataviewjs
const p      = dv.current();
const start  = window.moment(String(p["开始日期（周日）"]).slice(0,10), "YYYY-MM-DD");
const end    = window.moment(String(p["结束日期（周六）"]).slice(0,10), "YYYY-MM-DD");

const tasks = dv.pages("#RSS")
    .file.tasks
    .where(t => ['x', '-', '>'].includes(t.status))
    .where(t => {
        const date = t.completion ?? t.cancelled;
        if (!date) return false;
        const d = window.moment(String(date).slice(0, 10), "YYYY-MM-DD");
        return d.isSameOrAfter(start, 'day') && d.isSameOrBefore(end, 'day');
    });

dv.taskList(tasks);
```

# 3 本周书影音
![[weeklyMedia]]
