---
modified_at: 2026-04-14
---
```dataviewjs
// ========================================
// 🎯 贡献图 - Tabbed Contribution Graphs
// Reads year from parent note's frontmatter calYear
// ========================================

(async () => {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        dv.span('⚠️ Cannot detect file');
        return;
    }

    const containerId = 'contribution-tabs-' + activeFile.path;

    // Prevent multiple simultaneous executions
    if (window[containerId + '_running']) {
        return;
    }

    if (window[containerId + '_timeout']) {
        clearTimeout(window[containerId + '_timeout']);
    }

    await new Promise(resolve => {
        window[containerId + '_timeout'] = setTimeout(resolve, 500);
    });

    window[containerId + '_running'] = true;

try {
    // Get year from the active file's frontmatter
    const activeFilePage = dv.page(activeFile.path);
    const calYear = activeFilePage?.calYear;
    const targetYear = calYear ? Number(String(calYear).slice(0, 4)) : new Date().getFullYear();

    const CONFIG = {
        year: targetYear,
        dailyNotesFolder: "日记",
        // Green gradient (9 levels)
        colors: [
            "#ebedf0", "#d4e8c7", "#c6e48b", "#a8db70",
            "#7bc96f", "#5fb860", "#49af5d", "#389148", "#27713a"
        ],
        thresholds: [0, 1, 2, 3, 4, 5, 7, 9, 12]
    };

    // ========================================
    // 注入 CSS
    // ========================================
    const styleId = 'contribution-tabs-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .heatmap-calendar-graph rect.day {
                width: 10px !important;
                height: 10px !important;
            }
            .heatmap-calendar-graph {
                --cell-size: 10px;
            }
            .contrib-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }
            .contrib-tab {
                padding: 6px 16px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                background: var(--background-secondary);
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            }
            .contrib-tab:hover {
                background: var(--background-modifier-hover);
            }
            .contrib-tab.active {
                background: var(--interactive-accent);
                color: var(--text-on-accent);
                border-color: var(--interactive-accent);
            }
            .contrib-content {
                display: none;
            }
            .contrib-content.active {
                display: block;
            }
        `;
        document.head.appendChild(style);
    }

    // ========================================
    // 工具函数
    // ========================================
    const getIntensity = (count) => {
        for (let i = CONFIG.thresholds.length - 1; i >= 0; i--) {
            if (count >= CONFIG.thresholds[i]) return i;
        }
        return 0;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ========================================
    // 获取任务完成数据
    // ========================================
    const taskMap = new Map();
    const pages = dv.pages(`"${CONFIG.dailyNotesFolder}/${CONFIG.year}"`);

    for (const page of pages) {
        const fileName = page?.file?.name;
        if (!fileName) continue;
        const dateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})$/);
        if (!dateMatch) continue;
        const dateStr = dateMatch[1];

        const tasks = page.file.tasks;
        if (tasks) {
            let completedCount = 0;
            for (const task of tasks) {
                if (task.completed) {
                    const completionDate = task.completion;
                    if (completionDate) {
                        const compDateStr = window.moment(completionDate.toString()).format("YYYY-MM-DD");
                        if (compDateStr === dateStr) completedCount++;
                    } else {
                        completedCount++;
                    }
                }
            }
            if (completedCount > 0) taskMap.set(dateStr, completedCount);
        }
    }

    // 查询所有文件中在该年完成的任务
    const allPages = dv.pages();
    for (const page of allPages) {
        const tasks = page.file.tasks;
        if (!tasks) continue;
        for (const task of tasks) {
            if (task.completed && task.completion) {
                const compDateStr = window.moment(task.completion.toString()).format("YYYY-MM-DD");
                if (compDateStr.startsWith(String(CONFIG.year))) {
                    const current = taskMap.get(compDateStr) || 0;
                    taskMap.set(compDateStr, current + 1);
                }
            }
        }
    }

    // ========================================
    // 获取笔记创建数据
    // ========================================
    const noteMap = new Map();
    const allNotes = dv.pages();
    for (const page of allNotes) {
        const ctime = page.file.ctime;
        if (!ctime) continue;
        const createDate = window.moment(ctime.toString()).format("YYYY-MM-DD");
        if (createDate.startsWith(String(CONFIG.year))) {
            const current = noteMap.get(createDate) || 0;
            noteMap.set(createDate, current + 1);
        }
    }

    // ========================================
    // 获取笔记编辑数据
    // ========================================
    const editMap = new Map();
    for (const page of allNotes) {
        const mtime = page.modified_at || page.file.mtime;
        if (!mtime) continue;
        const editDate = window.moment(mtime.toString()).format("YYYY-MM-DD");
        if (editDate.startsWith(String(CONFIG.year))) {
            const current = editMap.get(editDate) || 0;
            editMap.set(editDate, current + 1);
        }
    }

    // ========================================
    // 统计数据
    // ========================================
    let totalTasks = 0, maxTasks = 0, daysWithTasks = 0;
    for (const [, count] of taskMap) {
        totalTasks += count;
        daysWithTasks++;
        if (count > maxTasks) maxTasks = count;
    }
    const avgTasks = daysWithTasks > 0 ? (totalTasks / daysWithTasks).toFixed(1) : 0;

    let totalNotes = 0, maxNotes = 0, daysWithNotes = 0;
    for (const [, count] of noteMap) {
        totalNotes += count;
        daysWithNotes++;
        if (count > maxNotes) maxNotes = count;
    }
    const avgNotes = daysWithNotes > 0 ? (totalNotes / daysWithNotes).toFixed(1) : 0;

    let totalEdits = 0, maxEdits = 0, daysWithEdits = 0;
    for (const [, count] of editMap) {
        totalEdits += count;
        daysWithEdits++;
        if (count > maxEdits) maxEdits = count;
    }
    const avgEdits = daysWithEdits > 0 ? (totalEdits / daysWithEdits).toFixed(1) : 0;

    // ========================================
    // 生成热力图条目
    // ========================================
    const generateEntries = (dataMap) => {
        const entries = [];
        for (let month = 0; month < 12; month++) {
            const daysInMonth = new Date(CONFIG.year, month + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${CONFIG.year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dateObj = new Date(CONFIG.year, month, day);
                const count = dataMap.get(dateStr) || 0;
                const intensity = getIntensity(count);
                if (dateObj <= today || count > 0) {
                    entries.push({ date: dateStr, intensity: intensity, color: "data" });
                }
            }
        }
        return entries;
    };

    // ========================================
    // 检查热力图插件
    // ========================================
    if (typeof renderHeatmapCalendar !== 'function') {
        dv.span("⚠️ 热力图插件未加载。请确保已安装 Heatmap Calendar 插件。");
        throw new Error("Heatmap Calendar plugin not available");
    }

    // ========================================
    // 创建 UI
    // ========================================
    const container = dv.container;
    container.innerHTML = '';

    // Tabs
    const tabsDiv = container.createEl('div', { cls: 'contrib-tabs' });
    const tab1 = tabsDiv.createEl('button', { cls: 'contrib-tab active', text: '✅ 任务完成' });
    const tab2 = tabsDiv.createEl('button', { cls: 'contrib-tab', text: '📝 笔记创建' });
    const tab3 = tabsDiv.createEl('button', { cls: 'contrib-tab', text: '✏️ 笔记编辑' });

    // Content 1: Tasks
    const content1 = container.createEl('div', { cls: 'contrib-content active' });
    content1.createEl('div').innerHTML = `<b>📊 统计:</b> 总完成: ${totalTasks} | 日均: ${avgTasks} | 单日最高: ${maxTasks}`;
    content1.createEl('br');
    const heatmap1 = content1.createEl('div');

    // Content 2: Notes Created
    const content2 = container.createEl('div', { cls: 'contrib-content' });
    content2.createEl('div').innerHTML = `<b>📊 统计:</b> 总创建: ${totalNotes} | 日均: ${avgNotes} | 单日最高: ${maxNotes}`;
    content2.createEl('br');
    const heatmap2 = content2.createEl('div');

    // Content 3: Notes Edited
    const content3 = container.createEl('div', { cls: 'contrib-content' });
    content3.createEl('div').innerHTML = `<b>📊 统计:</b> 总编辑: ${totalEdits} | 日均: ${avgEdits} | 单日最高: ${maxEdits}`;
    content3.createEl('br');
    const heatmap3 = content3.createEl('div');

    // Tab switching
    const tabs = [tab1, tab2, tab3];
    const contents = [content1, content2, content3];

    const switchTab = (activeIndex) => {
        tabs.forEach((tab, i) => {
            tab.classList.toggle('active', i === activeIndex);
        });
        contents.forEach((content, i) => {
            content.classList.toggle('active', i === activeIndex);
        });
    };

    tab1.addEventListener('click', () => switchTab(0));
    tab2.addEventListener('click', () => switchTab(1));
    tab3.addEventListener('click', () => switchTab(2));

    // Render heatmaps
    const calendarConfig = {
        year: CONFIG.year,
        colors: { data: CONFIG.colors },
        showCurrentDayBorder: true,
        defaultEntryIntensity: 0
    };

    renderHeatmapCalendar(heatmap1, { ...calendarConfig, entries: generateEntries(taskMap) });
    renderHeatmapCalendar(heatmap2, { ...calendarConfig, entries: generateEntries(noteMap) });
    renderHeatmapCalendar(heatmap3, { ...calendarConfig, entries: generateEntries(editMap) });

} catch (error) {
    console.error("贡献图错误:", error);
    dv.span(`⚠️ 发生错误: ${error.message || '未知错误'}`);
} finally {
    window[containerId + '_running'] = false;
}
})();
```
