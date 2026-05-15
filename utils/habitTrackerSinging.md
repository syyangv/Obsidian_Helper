---
modified_at: 2026-03-03
cssclasses:
  - no-embed-padding
---
```dataviewjs
// ========================================
// 🛡️ 防崩溃版 - 唱歌练习热力图
// Crash-Proof Singing Practice Heatmap
// ========================================

try {
    // ========================================
    // 配置区 Configuration
    // ========================================
    const CONFIG = {
        title: "🎤 唱歌练习追踪",
        dailyNotesFolder: "日记",
        cacheTTLMinutes: 240,
        colors: {
            practiced: ["#66d9ff", "#4dc9ff", "#33b9ff"], // Bright neon blue sign (Company revival style)
            notPracticed: ["#6E27C1", "#6E27C1", "#6E27C1"] // Company revival purple (Company revival style)
        }
    };

    // ========================================
    // 注入 CSS - Broadway lightbulb style
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
        .heatmap-calendar-months span,
        .heatmap-calendar-days span { color: #ffffff !important; }
        .singing-tracked {
            border-radius: 50% !important;
            box-shadow: 0 0 4px rgba(102, 217, 255, 1),
                        0 0 8px rgba(77, 201, 255, 0.8),
                        0 0 12px rgba(51, 185, 255, 0.6) !important;
        }
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

    // Check if singing was practiced on a given page
    const hasSingingPractice = (page) => {
        try {
            if (!page) return false;

            // Check activity_singing property
            const activitySinging = safeGetProperty(page, 'activity_singing');
            if (activitySinging === true || activitySinging === "true" || activitySinging === 1) {
                return true;
            }

            // Check tags for 🎤
            const tags = safeGetProperty(page, 'tags');
            if (tags) {
                const tagArray = Array.isArray(tags) ? tags : [tags];
                for (let tag of tagArray) {
                    try {
                        if (tag && typeof tag === 'string' && tag.includes('🎤')) {
                            return true;
                        }
                        if (tag && typeof tag === 'object' && tag.path && tag.path.includes('🎤')) {
                            return true;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            // Check activity_tags for 🎤
            const activityTags = safeGetProperty(page, 'activity_tags');
            if (activityTags) {
                const activityTagArray = Array.isArray(activityTags) ? activityTags : [activityTags];
                for (let tag of activityTagArray) {
                    try {
                        if (tag && typeof tag === 'string' && tag.includes('🎤')) {
                            return true;
                        }
                        if (tag && typeof tag === 'object' && tag.path && tag.path.includes('🎤')) {
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
    const CACHE_KEY = 'singing-heatmap-data-v1';

    const loadFromCache = () => {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            const ageMinutes = (Date.now() - data.timestamp) / 60000;
            if (ageMinutes > CONFIG.cacheTTLMinutes) return null;
            return {
                singingDates: new Set(data.singingDates),
                yearsWithEvents: new Set(data.yearsWithEvents),
                cachedAt: new Date(data.timestamp)
            };
        } catch (e) { return null; }
    };

    const saveToCache = (sets) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                singingDates: [...sets.singingDates],
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

    let singingDates, yearsWithEvents;
    let cachedAt = null;

    const cached = loadFromCache();
    if (cached) {
        ({ singingDates, yearsWithEvents, cachedAt } = cached);
    } else {
        singingDates = new Set();
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

                    if (hasSingingPractice(page)) {
                        singingDates.add(fileName);
                        yearsWithEvents.add(year);
                    }
                } catch (e) {
                    continue;
                }
            }
        } catch (e) {
            console.error("Error fetching daily notes:", e);
        }

        saveToCache({ singingDates, yearsWithEvents });
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
    
    const uid = 'singing-hm-' + Math.random().toString(36).substr(2, 9);

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
            border: 2px solid rgba(110, 39, 193, 0.6);
            background: transparent;
            color: var(--text-normal);
            cursor: pointer;
            border-radius: 5px;
            font-size: 14px;
            transition: all 0.3s;
        }
        .${uid}-btn:hover {
            background: rgba(110, 39, 193, 0.2);
            border-color: rgba(102, 217, 255, 0.8);
            box-shadow: 0 0 8px rgba(102, 217, 255, 0.4);
        }
        .${uid}-btn.active {
            background: rgba(102, 217, 255, 0.2);
            border: 2px solid #66d9ff;
            outline: 1px solid #ff1744;
            color: #66d9ff;
            font-weight: bold;
            box-shadow: 0 0 12px rgba(102, 217, 255, 0.6);
        }
        .${uid}-title {
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 10px;
            color: #66d9ff;
            text-shadow: 0 0 10px rgba(102, 217, 255, 0.5),
                         0 0 2px rgba(255, 23, 68, 0.3);
        }
        .${uid}-count {
            font-size: 1.1em;
            margin-bottom: 15px;
            color: var(--text-normal);
        }
    `;

    // Create title with Sims squircle icon (microphone — lavender)
    const titleRow = wrapper.createEl('div', { attr: { style: 'display:flex;align-items:center;gap:10px;margin-bottom:10px;' } });
    const iconEl = titleRow.createEl('span', { attr: { style: 'display:inline-flex;width:32px;height:32px;flex-shrink:0;background-image:url(\'data:image/png;base64,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\');background-size:contain;background-repeat:no-repeat;background-position:center;' } });
    const titleDiv = titleRow.createEl('div', { cls: `${uid}-title`, attr: { style: 'margin-bottom:0;' } });
    titleDiv.textContent = '唱歌练习追踪';

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

                    if (singingDates.has(dateStr)) {
                        entries.push({
                            date: dateStr,
                            intensity: 3,
                            color: "practiced"
                        });
                        practicedCount++;
                    } else {
                        // Add entry for non-tracked days with dark red color
                        entries.push({
                            date: dateStr,
                            intensity: 3,
                            color: "notPracticed"
                        });
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
            const heatmapId = `${uid}-heatmap-${year}`;
            heatmapDiv.id = heatmapId;

            // inset box-shadow renders inside the element so it can't be clipped by embed overflow:hidden
            heatmapDiv.style.padding = '10px';
            heatmapDiv.style.boxShadow = 'inset 0 0 0 3px #ff1744, 0 0 15px rgba(255, 23, 68, 0.5)';

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

            // Tag tracked cells so CSS (.singing-tracked) can apply circle + glow.
            // getComputedStyle always returns rgb(), regardless of how the plugin set the color.
            const trackedBgs = new Set(['rgb(102, 217, 255)', 'rgb(77, 201, 255)', 'rgb(51, 185, 255)']);
            heatmapDiv.querySelectorAll('.heatmap-calendar-boxes li').forEach(li => {
                if (trackedBgs.has(getComputedStyle(li).backgroundColor)) {
                    li.classList.add('singing-tracked');
                }
            });
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
        console.error("唱歌练习热力图错误:", error);
        dv.paragraph(`<div style="padding: 20px; border: 1px solid rgba(220, 150, 150, 0.5); border-radius: 8px; background: rgba(220, 150, 150, 0.1);">
            <p style="margin: 0; color: var(--text-muted);">⚠️ 发生错误: ${error.message || '未知错误'}</p>
        </div>`);
    }
}
```
