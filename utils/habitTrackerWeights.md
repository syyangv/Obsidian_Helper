---
modified_at: 2026-03-03
---
```dataviewjs
// ========================================
// 🛡️ 防崩溃版 - 举铁/健身房练习热力图
// Crash-Proof Weightlifting Practice Heatmap
// ========================================

try {
    // ========================================
    // 配置区 Configuration
    // ========================================
    const CONFIG = {
        title: "🏋️ 健身房记录",
        dailyNotesFolder: "日记",
        // Tags to track (matches if tag contains any of these)
        trackTags: ["举铁", "健身房"],
        cacheTTLMinutes: 240,
        colors: {
            practiced: ["#90c695", "#5da663", "#228b22"],
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

    // Check if a tag matches any of our tracked tags
    const matchesTrackedTag = (tag) => {
        if (!tag) return false;

        let tagStr = '';
        if (typeof tag === 'string') {
            tagStr = tag;
        } else if (typeof tag === 'object' && tag.path) {
            tagStr = tag.path;
        } else {
            return false;
        }

        return CONFIG.trackTags.some(tracked => tagStr.includes(tracked));
    };

    // Check if weightlifting/gym was practiced on a given page
    const hasWeightliftingPractice = (page) => {
        try {
            if (!page) return false;

            // Check tags for 举铁 or 健身房
            const tags = safeGetProperty(page, 'tags');
            if (tags) {
                const tagArray = Array.isArray(tags) ? tags : [tags];
                for (let tag of tagArray) {
                    try {
                        if (matchesTrackedTag(tag)) {
                            return true;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            // Check activity_tags for 举铁 or 健身房
            const activityTags = safeGetProperty(page, 'activity_tags');
            if (activityTags) {
                const activityTagArray = Array.isArray(activityTags) ? activityTags : [activityTags];
                for (let tag of activityTagArray) {
                    try {
                        if (matchesTrackedTag(tag)) {
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
    // 缓存工具函数 Cache Utility Functions
    // ========================================
    const CACHE_KEY = 'weightlifting-heatmap-data-v1';

    const loadFromCache = () => {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            const ageMinutes = (Date.now() - data.timestamp) / 60000;
            if (ageMinutes > CONFIG.cacheTTLMinutes) return null;
            return {
                weightliftingDates: new Set(data.weightliftingDates),
                yearsWithEvents: new Set(data.yearsWithEvents),
                cachedAt: new Date(data.timestamp)
            };
        } catch (e) { return null; }
    };

    const saveToCache = (sets) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                weightliftingDates: [...sets.weightliftingDates],
                yearsWithEvents: [...sets.yearsWithEvents]
            }));
        } catch (e) {}
    };

    const clearCache = () => {
        try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
    };

    // ========================================
    // 收集所有年份和日记数据
    // ========================================

    let weightliftingDates, yearsWithEvents;
    let cachedAt = null;

    const cached = loadFromCache();
    if (cached) {
        ({ weightliftingDates, yearsWithEvents, cachedAt } = cached);
    } else {
        weightliftingDates = new Set();
        yearsWithEvents = new Set();

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

                    if (hasWeightliftingPractice(page)) {
                        weightliftingDates.add(fileName);
                        yearsWithEvents.add(year);
                    }
                } catch (e) {
                    continue;
                }
            }
        } catch (e) {
            console.error("Error fetching daily notes:", e);
        }

        saveToCache({ weightliftingDates, yearsWithEvents });
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

    const uid = 'weightlifting-hm-' + Math.random().toString(36).substr(2, 9);

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
            border: 2px solid rgba(93, 166, 99, 0.5);
            background: transparent;
            color: var(--text-normal);
            cursor: pointer;
            border-radius: 5px;
            font-size: 14px;
            transition: all 0.2s;
        }
        .${uid}-btn:hover {
            background: rgba(93, 166, 99, 0.2);
            border-color: rgba(93, 166, 99, 0.8);
        }
        .${uid}-btn.active {
            background: rgba(93, 166, 99, 0.4);
            border-color: rgba(93, 166, 99, 1);
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

    // Create title with Sims squircle icon (barbell — plumbob green)
    const titleRow = wrapper.createEl('div', { attr: { style: 'display:flex;align-items:center;gap:10px;margin-bottom:10px;' } });
    const iconEl = titleRow.createEl('span', { attr: { style: 'display:inline-flex;width:32px;height:32px;flex-shrink:0;background-image:url(\'data:image/png;base64,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\');background-size:contain;background-repeat:no-repeat;background-position:center;' } });
    const titleDiv = titleRow.createEl('div', { cls: `${uid}-title`, attr: { style: 'margin-bottom:0;' } });
    titleDiv.textContent = '健身房记录';

    // Cache status and refresh button
    const cacheBar = wrapper.createEl('div', {
        attr: { style: 'display:flex; align-items:center; gap:12px; margin-bottom:10px; font-size:0.85em; color:var(--text-muted);' }
    });
    if (cachedAt) {
        const ageMinutes = Math.round((Date.now() - cachedAt.getTime()) / 60000);
        const ageText = ageMinutes < 60 ? `${ageMinutes}分钟前` : `${Math.round(ageMinutes / 60)}小时前`;
        cacheBar.createEl('span', { text: `📦 缓存于${ageText}` });
    }
    const refreshBtn = cacheBar.createEl('button', { text: '↺ 刷新数据' });
    refreshBtn.style.cssText = 'padding:2px 10px; border-radius:4px; cursor:pointer; border:1px solid var(--background-modifier-border); background:var(--background-secondary); color:var(--text-normal); font-size:0.85em;';
    refreshBtn.addEventListener('click', async () => {
        clearCache();
        const file = app.workspace.getActiveFile();
        await app.workspace.activeLeaf.openFile(file, { active: true });
    });

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

                    if (weightliftingDates.has(dateStr)) {
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
        console.error("举铁练习热力图错误:", error);
        dv.paragraph(`<div style="padding: 20px; border: 1px solid rgba(220, 150, 150, 0.5); border-radius: 8px; background: rgba(220, 150, 150, 0.1);">
            <p style="margin: 0; color: var(--text-muted);">⚠️ 发生错误: ${error.message || '未知错误'}</p>
        </div>`);
    }
}
```
