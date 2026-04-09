```dataviewjs
(async () => {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) { dv.paragraph('⚠️ No active file'); return; }

    const containerId = 'monthly-nav-' + activeFile.path;
    if (window[containerId + '_running']) return;
    if (window[containerId + '_timeout']) clearTimeout(window[containerId + '_timeout']);
    await new Promise(resolve => { window[containerId + '_timeout'] = setTimeout(resolve, 500); });
    window[containerId + '_running'] = true;

    try {
        const noteTitle = activeFile.basename;
        const dateMatch = noteTitle.match(/^(\d{4})-(\d{2})$/);
        if (!dateMatch) { dv.paragraph('⚠️ Filename must be YYYY-MM format, got: ' + noteTitle); return; }

        const currentYear = parseInt(dateMatch[1]);
        const currentMonth = parseInt(dateMatch[2]);

        // Previous month
        let prevYear = currentYear, prevMonth = currentMonth - 1;
        if (prevMonth < 1) { prevMonth = 12; prevYear = currentYear - 1; }
        const prevMonthString = prevYear + '-' + prevMonth.toString().padStart(2, '0');

        // Next month
        let nextYear = currentYear, nextMonth = currentMonth + 1;
        if (nextMonth > 12) { nextMonth = 1; nextYear = currentYear + 1; }
        const nextMonthString = nextYear + '-' + nextMonth.toString().padStart(2, '0');

        // Styling — matches dailyNavigation palette
        const P = { text: '#8B7E9B', muted: '#C9B8D4' };
        const past    = { bg: '#E2EEF8', fg: '#6A8AAA' };
        const current = { bg: '#D8F4E4', fg: '#4A8A62' };
        const future  = { bg: '#FFFAE0', fg: '#9A8A40' };

        const wrap = dv.container.createEl('div', {
            attr: { style: `color:${P.text}; line-height:1.8; text-align:center;` }
        });

        function pill(parent, label, path, scheme) {
            const a = parent.createEl('a', {
                text: label, cls: 'internal-link',
                attr: { style: `color:${scheme.fg}; background:${scheme.bg}; text-decoration:none; font-weight:600; cursor:pointer; padding:2px 10px; border-radius:4px;` }
            });
            a.addEventListener('click', e => { e.preventDefault(); app.workspace.openLinkText(path, activeFile.path); });
        }

        function sep(parent) {
            parent.createEl('span', { text: '·', attr: { style: `color:${P.muted};` } });
        }

        // Row: ← prev month · year · next month →
        const navRow = wrap.createEl('div', {
            attr: { style: 'display:flex; gap:8px; align-items:center; justify-content:center;' }
        });
        pill(navRow, '←', `年度记录/${prevYear}/月计划/${prevMonthString}`, past);
        navRow.createEl('span', { text: prevMonthString, attr: { style: `color:${P.muted};` } });
        sep(navRow);
        pill(navRow, `${currentYear}年`, `年度记录/${currentYear}/${currentYear}`, current);
        sep(navRow);
        navRow.createEl('span', { text: nextMonthString, attr: { style: `color:${P.muted};` } });
        pill(navRow, '→', `年度记录/${nextYear}/月计划/${nextMonthString}`, future);

    } catch (err) {
        dv.paragraph('⚠️ ' + err.message);
    } finally {
        window[containerId + '_running'] = false;
    }
})();
```