---
aliases:
tags:
  - 手帐/周记
开始日期（周日）: <% window.moment(tp.file.title, "GGGG-[W]WW").day(0).format("YYYY-MM-DD") %>
结束日期（周六）: <% window.moment(tp.file.title, "GGGG-[W]WW").day(6).format("YYYY-MM-DD") %>
cssclasses:
  - hide-frontmatter
modified_at: 2026-03-22
---

![[weeklyNavigation]]

[[信息intake]]
![[genTOC]]
![[Helper/utils/taskAgeBadges]]
# 1 Tasks
## 1.1 Upcoming
````columns
id: upcoming-<% tp.file.title %>

===
### Regular
```tasks
not done
filter by function task.status.symbol !== '>'
path does not include 播客
path does not include 周计划
path does not include Logistics/库存/Pantry
happens after <% window.moment(tp.file.title, "GGGG-[W]WW").day(0).subtract(1, 'day').format("YYYY-MM-DD") %>
happens before <% window.moment(tp.file.title, "GGGG-[W]WW").day(6).add(1, 'day').format("YYYY-MM-DD") %>
sort by due
```

===
### Pantry older than 3 days
```tasks
not done
filter by function task.status.symbol !== '>'
path includes Logistics/库存/Pantry
filter by function ['冰箱', '冷藏', '水果', '冷藏饮料', '冷冻', '冷冻肉&海鲜', '冷冻蔬果', '冷冻主食&点心', '冷冻甜品'].some(h => (task.heading ?? task.precedingHeader ?? '').includes(h))
created before 3 days ago
sort by function task.heading ?? task.precedingHeader ?? ''
sort by created
hide backlink
```

````

## 1.2 Done this week
````columns
id: done-this-week-<% tp.file.title %>

===
### Regular
```tasks
done after <% window.moment(tp.file.title, "GGGG-[W]WW").day(0).subtract(1, 'day').format("YYYY-MM-DD") %>
done before <% window.moment(tp.file.title, "GGGG-[W]WW").day(6).add(1, 'day').format("YYYY-MM-DD") %>
path does not include 播客
path does not include 周计划
path does not include Logistics/库存/Pantry
```

===
### Pantry
```tasks
done after <% window.moment(tp.file.title, "GGGG-[W]WW").day(0).subtract(1, 'day').format("YYYY-MM-DD") %>
done before <% window.moment(tp.file.title, "GGGG-[W]WW").day(6).add(1, 'day').format("YYYY-MM-DD") %>
path includes Logistics/库存/Pantry
hide backlink
```

````

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
