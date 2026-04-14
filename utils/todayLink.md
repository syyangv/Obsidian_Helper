---
tags: []
modified_at: 2026-03-29
---
```dataviewjs
const now = new Date();
const year = now.getFullYear();
const month = (now.getMonth() + 1).toString().padStart(2, '0');
const day = now.getDate().toString().padStart(2, '0');
const today = year + "-" + month + "-" + day;
const filePath = "日记/" + year + "/" + today;
const file = dv.page(filePath);

if (file) {
    dv.paragraph("[[" + filePath + "|今日记录]]");
} else {
    const a = dv.container.createEl('a', {
        text: '创建今日记录', cls: 'internal-link',
        attr: { style: 'cursor:pointer;' }
    });
    a.addEventListener('click', async e => {
        e.preventDefault();
        const qapi = app.plugins.plugins['quickadd']?.api;
        if (qapi) await qapi.executeChoice('createDailyNoteByDate', { date: today });
    });
}
```