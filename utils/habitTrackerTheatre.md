---
modified_at: 2026-01-20
---
```dataviewjs
// ========================================
// 🛡️ 防崩溃版 - 看戏记录热力图
// Crash-Proof Theater Watching Heatmap
// ========================================

try {
    // ========================================
    // 配置区 Configuration
    // ========================================
    const CONFIG = {
        title: "🎭 看戏记录",
        dailyNotesFolder: "日记",
        colors: {
            practiced: ["#e693c9", "#d459a8", "#b5179e"],
            notPracticed: ["#2d2d2d", "#2d2d2d", "#2d2d2d"]
        }
    };

    // ========================================
    // 注入 CSS 使方块变成正方形
    // ========================================
    // Plugin renders <ul class="heatmap-calendar-boxes"><li> — NOT SVG rects.
    const staleStyle = document.getElementById('heatmap-square-fix');
    if (staleStyle) staleStyle.remove();
    const fixStyle = document.createElement('style');
    fixStyle.id = 'heatmap-square-fix';
    fixStyle.textContent = `
        .heatmap-calendar-graph {
            width: 100% !important;
            grid-template-columns: auto 1fr !important;
            margin-top: 0 !important;
            margin-bottom: 3px !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
        }
        .heatmap-calendar-boxes {
            display: grid !important;
            grid-template-columns: repeat(54, 1fr) !important;
            row-gap: 1.5px !important;
            column-gap: 1.5px !important;
        }
        .heatmap-calendar-boxes li { aspect-ratio: 1 !important; border-radius: 2px !important; }
    `;
    document.head.appendChild(fixStyle);

    // ========================================
    // 安全工具函数 Safe Utility Functions
    // ========================================
    
    const safeParseDate = (dateStr) => {
        try {
            if (!dateStr || typeof dateStr !== 'string') return null;
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date;
        } catch (e) {
            return null;
        }
    };

    const safeGetProperty = (page, prop) => {
        try {
            if (!page || !prop) return undefined;
            return page[prop];
        } catch (e) {
            return undefined;
        }
    };

    // Check if theater watching occurred on a given page
    const hasTheaterWatching = (page) => {
        try {
            if (!page) return false;

            // Check tags for 看戏
            const tags = safeGetProperty(page, 'tags');
            if (tags) {
                const tagArray = Array.isArray(tags) ? tags : [tags];
                for (let tag of tagArray) {
                    try {
                        if (tag && typeof tag === 'string' && tag.includes('看戏')) {
                            return true;
                        }
                        if (tag && typeof tag === 'object' && tag.path && tag.path.includes('看戏')) {
                            return true;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            // Check activity_tags for 看戏
            const activityTags = safeGetProperty(page, 'activity_tags');
            if (activityTags) {
                const activityTagArray = Array.isArray(activityTags) ? activityTags : [activityTags];
                for (let tag of activityTagArray) {
                    try {
                        if (tag && typeof tag === 'string' && tag.includes('看戏')) {
                            return true;
                        }
                        if (tag && typeof tag === 'object' && tag.path && tag.path.includes('看戏')) {
                            return true;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            return false;
        } catch (e) {
            return false;
        }
    };

    // ========================================
    // 收集所有年份和日记数据
    // ========================================

    const availableYears = new Set();
    const theaterDates = new Set();
    const yearsWithEvents = new Set();

    try {
        const allNotes = dv.pages(`"${CONFIG.dailyNotesFolder}"`);
        let notesList = [];

        if (allNotes && allNotes.values) {
            notesList = allNotes.values;
        } else if (allNotes && typeof allNotes[Symbol.iterator] === 'function') {
            notesList = Array.from(allNotes);
        }

        for (let page of notesList) {
            try {
                const fileName = page?.file?.name;
                if (!fileName) continue;

                const dateMatch = fileName.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (!dateMatch) continue;

                const year = dateMatch[1];
                availableYears.add(year);

                if (hasTheaterWatching(page)) {
                    theaterDates.add(fileName);
                    yearsWithEvents.add(year);
                }
            } catch (e) {
                continue;
            }
        }
    } catch (e) {
        console.error("Error fetching daily notes:", e);
    }

    const yearsList = Array.from(yearsWithEvents).sort().reverse();

    if (yearsList.length === 0) {
        dv.paragraph("No daily notes found in 日记 folder.");
        throw new Error("EXIT_EARLY");
    }

    // ========================================
    // 检查热力图插件是否可用
    // ========================================
    if (typeof renderHeatmapCalendar !== 'function') {
        dv.span("⚠️ 热力图插件未加载。请确保已安装 Heatmap Calendar 插件。");
        throw new Error("Heatmap Calendar plugin not available");
    }

    // ========================================
    // 计算统计数据
    // ========================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear().toString();

    // ========================================
    // 生成并渲染每年的热力图
    // ========================================
    
    const uid = 'theater-hm-' + Math.random().toString(36).substr(2, 9);

    const container = dv.container;
    if (!container) {
        throw new Error("Container not available");
    }

    const wrapper = container.createEl('div');

    const style = wrapper.createEl('style');
    style.textContent = `
        .${uid}-btn {
            padding: 8px 16px;
            margin: 5px;
            border: 2px solid rgba(212, 89, 168, 0.5);
            background: transparent;
            color: var(--text-normal);
            cursor: pointer;
            border-radius: 5px;
            font-size: 14px;
            transition: all 0.2s;
        }
        .${uid}-btn:hover {
            background: rgba(212, 89, 168, 0.2);
            border-color: rgba(212, 89, 168, 0.8);
        }
        .${uid}-btn.active {
            background: rgba(212, 89, 168, 0.4);
            border-color: rgba(212, 89, 168, 1);
            font-weight: bold;
        }
        .${uid}-title {
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 10px;
        }
        .${uid}-count {
            font-size: 1.1em;
            margin-bottom: 15px;
        }
    `;

    // Create title with Sims squircle icon (star — magenta)
    const titleRow = wrapper.createEl('div', { attr: { style: 'display:flex;align-items:center;gap:10px;margin-bottom:10px;' } });
    const iconEl = titleRow.createEl('span', { attr: { style: 'display:inline-flex;width:32px;height:32px;flex-shrink:0;background-image:url('data:image/png;base64,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');background-size:contain;background-repeat:no-repeat;background-position:center;' } });
    const titleDiv = titleRow.createEl('div', { cls: `${uid}-title`, attr: { style: 'margin-bottom:0;' } });
    titleDiv.textContent = '看戏记录';

    // Create count display (will be updated when switching years)
    const countDiv = wrapper.createEl('div', { cls: `${uid}-count` });

    const tabsContainer = wrapper.createEl('div');
    tabsContainer.style.display = 'flex';
    tabsContainer.style.flexWrap = 'wrap';
    tabsContainer.style.gap = '5px';
    tabsContainer.style.marginBottom = '20px';

    const contentContainer = wrapper.createEl('div');

    const buttons = {};

    // Pre-generate entries for each year
    const yearEntries = {};
    const yearStats = {};

    for (let year of yearsList) {
        try {
            const entries = [];
            let practicedCount = 0;

            for (let month = 0; month < 12; month++) {
                const daysInMonth = new Date(parseInt(year), month + 1, 0).getDate();
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dateObj = safeParseDate(dateStr);
                    
                    if (!dateObj) continue;
                    if (dateObj > today) continue;
                    
                    if (theaterDates.has(dateStr)) {
                        entries.push({
                            date: dateStr,
                            intensity: 3,
                            color: "practiced"
                        });
                        practicedCount++;
                    }
                }
            }

            yearEntries[year] = entries;
            yearStats[year] = { practiced: practicedCount };
        } catch (e) {
            console.error(`Error processing year ${year}:`, e);
            yearEntries[year] = [];
            yearStats[year] = { practiced: 0 };
        }
    }

    function renderYearHeatmap(year) {
        try {
            contentContainer.innerHTML = '';

            const stats = yearStats[year] || { practiced: 0 };
            const entries = yearEntries[year] || [];

            // Update the count display
            countDiv.innerHTML = `${year}年: <strong>${stats.practiced}</strong> 天`;

            const heatmapDiv = contentContainer.createEl('div');

            const calendarData = {
                year: parseInt(year),
                colors: {
                    practiced: CONFIG.colors.practiced,
                    notPracticed: CONFIG.colors.notPracticed
                },
                showCurrentDayBorder: true,
                defaultEntryIntensity: 1,
                entries: entries
            };

            renderHeatmapCalendar(heatmapDiv, calendarData);
        } catch (e) {
            console.error(`Error rendering heatmap for year ${year}:`, e);
            contentContainer.innerHTML = `<p style="color: var(--text-muted);">⚠️ 渲染${year}年热力图时出错</p>`;
        }
    }

    function switchToYear(year) {
        try {
            for (let y of yearsList) {
                if (buttons[y]) {
                    buttons[y].classList.remove('active');
                }
            }
            if (buttons[year]) {
                buttons[year].classList.add('active');
            }

            renderYearHeatmap(year);
        } catch (e) {
            console.error("Error switching year:", e);
            contentContainer.innerHTML = `<p style="color: var(--text-muted);">Error switching years.</p>`;
        }
    }

    const defaultYear = yearsList.includes(currentYear) ? currentYear : yearsList[0];

    for (let year of yearsList) {
        try {
            const btn = tabsContainer.createEl('button', {
                text: year,
                cls: `${uid}-btn` + (year === defaultYear ? ' active' : '')
            });

            buttons[year] = btn;

            btn.addEventListener('click', () => {
                switchToYear(year);
            });
        } catch (btnError) {
            continue;
        }
    }

    renderYearHeatmap(defaultYear);

} catch (error) {
    if (error.message !== "EXIT_EARLY") {
        console.error("看戏记录热力图错误:", error);
        dv.paragraph(`<div style="padding: 20px; border: 1px solid rgba(220, 150, 150, 0.5); border-radius: 8px; background: rgba(220, 150, 150, 0.1);">
            <p style="margin: 0; color: var(--text-muted);">⚠️ 发生错误: ${error.message || '未知错误'}</p>
        </div>`);
    }
}
```