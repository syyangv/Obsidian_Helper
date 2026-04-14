---
modified_at: 2026-03-03
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
    const styleId = 'singing-heatmap-lightbulb-fix';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .heatmap-calendar-graph rect.day {
                width: 10px !important;
                height: 10px !important;
            }
            /* Red outline only (no background fill) */
            .heatmap-calendar-graph {
                --cell-size: 10px;
            }
            /* White text for all labels in heatmap */
            .heatmap-calendar-graph text,
            .heatmap-calendar-graph .month,
            .heatmap-calendar-graph .day-label,
            .heatmap-calendar-graph svg text {
                fill: #ffffff !important;
                color: #ffffff !important;
            }
            /* Force white on all text descendants */
            .heatmap-calendar-graph * text {
                fill: #ffffff !important;
            }
            /* Company purple for ALL days that are NOT bright neon blue (non-tracked days) */
            .heatmap-calendar-graph rect.day:not([fill="#66d9ff"]):not([fill="#4dc9ff"]):not([fill="#33b9ff"]) {
                fill: #6E27C1 !important;
            }
            /* Bright neon blue sign effect for tracked days only */
            .heatmap-calendar-graph rect.day[fill="#66d9ff"],
            .heatmap-calendar-graph rect.day[fill="#4dc9ff"],
            .heatmap-calendar-graph rect.day[fill="#33b9ff"] {
                rx: 50% !important;
                ry: 50% !important;
                filter: drop-shadow(0 0 4px rgba(102, 217, 255, 1))
                        drop-shadow(0 0 8px rgba(77, 201, 255, 0.8))
                        drop-shadow(0 0 12px rgba(51, 185, 255, 0.6));
            }
        `;
        document.head.appendChild(style);
    }

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

    // Create title
    const titleDiv = wrapper.createEl('div', { cls: `${uid}-title` });
    titleDiv.textContent = CONFIG.title;

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

            // Add red frame styling directly to heatmap container
            heatmapDiv.style.border = '3px solid #ff1744';
            heatmapDiv.style.padding = '10px';
            heatmapDiv.style.boxShadow = '0 0 15px rgba(255, 23, 68, 0.5)';

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

            // Add ultra-specific style tag BEFORE rendering
            const localStyle = document.createElement('style');
            localStyle.textContent = `
                #${heatmapId} text,
                #${heatmapId} svg text,
                #${heatmapId} * text {
                    fill: #ffffff !important;
                    color: #ffffff !important;
                }
            `;
            document.head.appendChild(localStyle);

            renderHeatmapCalendar(heatmapDiv, calendarData);

            // Ultra aggressive: force white text repeatedly with inline style override
            const forceWhiteText = () => {
                const allTexts = heatmapDiv.querySelectorAll('text');
                allTexts.forEach(text => {
                    text.setAttribute('fill', '#ffffff');
                    // Override any existing style attribute
                    const currentStyle = text.getAttribute('style') || '';
                    const newStyle = currentStyle.replace(/fill:[^;]*/gi, '') + ' fill: #ffffff !important; color: #ffffff !important;';
                    text.setAttribute('style', newStyle);
                });
            };

            // Execute multiple times
            setTimeout(forceWhiteText, 0);
            setTimeout(forceWhiteText, 50);
            setTimeout(forceWhiteText, 100);
            setTimeout(forceWhiteText, 200);
            setTimeout(forceWhiteText, 500);
            setTimeout(forceWhiteText, 1000);

            // Keep watching
            const observer = new MutationObserver(forceWhiteText);
            observer.observe(heatmapDiv, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'fill']
            });

            // Apply Company purple background to non-tracked days after rendering
            setTimeout(() => {
                const allDays = heatmapDiv.querySelectorAll('rect.day');
                allDays.forEach(rect => {
                    const fill = rect.getAttribute('fill');
                    // If not bright neon blue (tracked), make it match background purple
                    if (fill !== '#66d9ff' && fill !== '#4dc9ff' && fill !== '#33b9ff') {
                        rect.setAttribute('fill', '#6E27C1');
                    }
                });

                // Make all text elements white - comprehensive approach
                const allTexts = heatmapDiv.querySelectorAll('text, .month-label, .day-label');
                allTexts.forEach(text => {
                    text.setAttribute('fill', '#ffffff');
                    text.style.fill = '#ffffff';
                    text.style.color = '#ffffff';
                });

                // Also target any SVG text elements
                const svgs = heatmapDiv.querySelectorAll('svg');
                svgs.forEach(svg => {
                    const texts = svg.querySelectorAll('text');
                    texts.forEach(text => {
                        text.setAttribute('fill', '#ffffff');
                        text.style.fill = '#ffffff';
                    });
                });
            }, 200);
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
