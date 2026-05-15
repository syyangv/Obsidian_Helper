---
modified_at: 2026-03-03
---
```dataviewjs
// ========================================
// 🛡️ 防崩溃版 - 游泳练习热力图
// Crash-Proof Swimming Practice Heatmap
// ========================================

try {
    // ========================================
    // 配置区 Configuration
    // ========================================
    const CONFIG = {
        title: "🏊 游泳练习追踪",
        dailyNotesFolder: "日记",
        cacheTTLMinutes: 240,
        colors: {
            class: ["#6699ff", "#3366ff", "#002fa7"], // Days with 游泳课 entries (Klein blue)
            activityOnly: ["#b8e3f5", "#8dd4ed", "#5fc4e8"], // Days with only swimming activity (bright light blue)
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

    // Check if swimming was practiced on a given page
    const hasSwimmingPractice = (page) => {
        try {
            if (!page) return false;

            // Check activity_swimming property
            const activitySwimming = safeGetProperty(page, 'activity_swimming');
            if (activitySwimming === true || activitySwimming === "true" || activitySwimming === 1) {
                return true;
            }

            return false;
        } catch (e) {
            return false;
        }
    };

    // Check if page has 游泳课 entries (async)
    const hasSwimmingClass = async (page) => {
        try {
            if (!page?.file?.path) return false;

            const file = app.vault.getAbstractFileByPath(page.file.path);
            if (!file) return false;

            const content = await app.vault.cachedRead(file);
            if (!content || typeof content !== 'string') return false;

            // Check if content contains 游泳课 heading
            const hasClassHeading = /^#+\s*(\d+\.?)?\s*游泳课/im.test(content);
            return hasClassHeading;
        } catch (e) {
            return false;
        }
    };

    // ========================================
    // 缓存工具函数 Cache Utility Functions
    // ========================================
    const CACHE_KEY = 'swimming-heatmap-data-v1';

    const loadFromCache = () => {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            const ageMinutes = (Date.now() - data.timestamp) / 60000;
            if (ageMinutes > CONFIG.cacheTTLMinutes) return null;
            return {
                classDates: new Set(data.classDates),
                activityOnlyDates: new Set(data.activityOnlyDates),
                yearsWithEvents: new Set(data.yearsWithEvents),
                cachedAt: new Date(data.timestamp)
            };
        } catch (e) { return null; }
    };

    const saveToCache = (sets) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                classDates: [...sets.classDates],
                activityOnlyDates: [...sets.activityOnlyDates],
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

    let classDates, activityOnlyDates, yearsWithEvents;
    let cachedAt = null;

    const cached = loadFromCache();
    if (cached) {
        ({ classDates, activityOnlyDates, yearsWithEvents, cachedAt } = cached);
    } else {
        classDates = new Set(); // Days with 游泳课 entries
        activityOnlyDates = new Set(); // Days with only activity_swimming
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

                    // Check if has 游泳课 entry
                    const hasClass = await hasSwimmingClass(page);

                    if (hasClass) {
                        classDates.add(fileName);
                        yearsWithEvents.add(year);
                    } else if (hasSwimmingPractice(page)) {
                        // Only activity_swimming, no class entry
                        activityOnlyDates.add(fileName);
                        yearsWithEvents.add(year);
                    }
                } catch (e) {
                    continue;
                }
            }
        } catch (e) {
            console.error("Error fetching daily notes:", e);
        }

        saveToCache({ classDates, activityOnlyDates, yearsWithEvents });
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
    
    const uid = 'swimming-hm-' + Math.random().toString(36).substr(2, 9);

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
            border: 2px solid rgba(100, 180, 220, 0.5);
            background: transparent;
            color: var(--text-normal);
            cursor: pointer;
            border-radius: 5px;
            font-size: 14px;
            transition: all 0.2s;
        }
        .${uid}-btn:hover {
            background: rgba(100, 180, 220, 0.2);
            border-color: rgba(100, 180, 220, 0.8);
        }
        .${uid}-btn.active {
            background: rgba(100, 180, 220, 0.4);
            border-color: rgba(100, 180, 220, 1);
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

    // Create title with Sims squircle icon (swimmer — ocean blue)
    const titleRow = wrapper.createEl('div', { attr: { style: 'display:flex;align-items:center;gap:10px;margin-bottom:10px;' } });
    const iconEl = titleRow.createEl('span', { attr: { style: 'display:inline-flex;width:32px;height:32px;flex-shrink:0;background-image:url('data:image/png;base64,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');background-size:contain;background-repeat:no-repeat;background-position:center;' } });
    const titleDiv = titleRow.createEl('div', { cls: `${uid}-title`, attr: { style: 'margin-bottom:0;' } });
    titleDiv.textContent = '游泳练习追踪';

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
            let classCount = 0;
            let activityOnlyCount = 0;

            for (let month = 0; month < 12; month++) {
                const daysInMonth = new Date(parseInt(year), month + 1, 0).getDate();
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dateObj = safeParseDate(dateStr);

                    if (!dateObj) continue;
                    if (dateObj > today) continue;

                    if (classDates.has(dateStr)) {
                        entries.push({
                            date: dateStr,
                            intensity: 3,
                            color: "class"
                        });
                        classCount++;
                    } else if (activityOnlyDates.has(dateStr)) {
                        entries.push({
                            date: dateStr,
                            intensity: 3,
                            color: "activityOnly"
                        });
                        activityOnlyCount++;
                    }
                }
            }

            yearEntries[year] = entries;
            yearStats[year] = { class: classCount, activityOnly: activityOnlyCount };
        } catch (e) {
            console.error(`Error processing year ${year}:`, e);
            yearEntries[year] = [];
            yearStats[year] = { class: 0, activityOnly: 0 };
        }
    }

    function renderYearHeatmap(year) {
        try {
            contentContainer.innerHTML = '';

            const stats = yearStats[year] || { class: 0, activityOnly: 0 };
            const entries = yearEntries[year] || [];

            // Update the count display with both types
            const total = stats.class + stats.activityOnly;
            countDiv.innerHTML = `${year}年: <strong>${total}</strong> 天 (课程: ${stats.class}, 练习: ${stats.activityOnly})`;

            const heatmapDiv = contentContainer.createEl('div');

            const calendarData = {
                year: parseInt(year),
                colors: {
                    class: CONFIG.colors.class,
                    activityOnly: CONFIG.colors.activityOnly,
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
        console.error("游泳练习热力图错误:", error);
        dv.paragraph(`<div style="padding: 20px; border: 1px solid rgba(220, 150, 150, 0.5); border-radius: 8px; background: rgba(220, 150, 150, 0.1);">
            <p style="margin: 0; color: var(--text-muted);">⚠️ 发生错误: ${error.message || '未知错误'}</p>
        </div>`);
    }
}
```