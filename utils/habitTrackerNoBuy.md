---
modified_at: 2026-03-03
---


```dataviewjs
// ========================================
// 🛡️ 防崩溃版 - 100天不买挑战热力图
// Crash-Proof Version with Dynamic Extension
// ========================================

(async () => {
    // ===== PREVENT MULTIPLE SIMULTANEOUS EXECUTIONS =====
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        dv.span('⚠️ Cannot detect file');
        return;
    }

    const containerId = 'habit-tracker-nobuy-' + activeFile.path;

    // If already running, skip this execution
    if (window[containerId + '_running']) {
        return;
    }

    // Set debounce timeout - only execute after 500ms of inactivity
    if (window[containerId + '_timeout']) {
        clearTimeout(window[containerId + '_timeout']);
    }

    await new Promise(resolve => {
        window[containerId + '_timeout'] = setTimeout(resolve, 500);
    });

    window[containerId + '_running'] = true;

try {
    // ========================================
    // 配置区 Configuration
    // ========================================
    const CONFIG = {
        habitProperty: "noBuy",
        startDate: "2025-12-02",
        baseDaysToTrack: 100,  // 基础目标天数
        dailyNotesFolder: "日记",
        title: "🚫💸 100天不买挑战",
        completedEmoji: "",
        missedEmoji: "",
        cacheTTLMinutes: 240,
        colors: {
            completed: ["#c6e48b", "#7bc96f", "#49af5d"],
            missed: ["#6b6b6b", "#555555", "#404040"],  // 深灰色表示未完成
            blocked: ["#cfc4c4", "#cfc4c4", "#cfc4c4", "#cfc4c4", "#cfc4c4"]
        }
    };

    // ========================================
    // 注入 CSS 使方块变成正方形
    // ========================================
    const styleId = 'heatmap-square-fix';
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

    const formatDate = (date) => {
        try {
            if (!date || !(date instanceof Date) || isNaN(date.getTime())) return null;
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } catch (e) {
            return null;
        }
    };

    const isDateInRange = (date, start, end) => {
        try {
            if (!date || !start || !end) return false;
            return date >= start && date <= end;
        } catch (e) {
            return false;
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

    const isHabitCompleted = (value) => {
        try {
            return value === true || 
                   value === "true" || 
                   value === 1 || 
                   value === "1" ||
                   value === "yes" ||
                   value === "是";
        } catch (e) {
            return false;
        }
    };

    // ========================================
    // 计算基础日期范围
    // ========================================
    const startDate = safeParseDate(CONFIG.startDate);
    if (!startDate) {
        dv.span("❌ 错误：无效的开始日期配置");
        throw new Error("Invalid start date");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ========================================
    // 缓存工具函数 Cache Utility Functions
    // ========================================
    const CACHE_KEY = 'nobuy-challenge-data-v1';

    const loadFromCache = () => {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            const ageMinutes = (Date.now() - data.timestamp) / 60000;
            if (ageMinutes > CONFIG.cacheTTLMinutes) return null;
            return {
                dailyNotesMap: new Map(data.dailyNotesMap),
                cachedAt: new Date(data.timestamp)
            };
        } catch (e) { return null; }
    };

    const saveToCache = (map) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                dailyNotesMap: [...map.entries()]
            }));
        } catch (e) {}
    };

    const clearCache = () => {
        try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
    };

    // ========================================
    // 第一遍：收集所有日记数据，计算未完成天数
    // ========================================

    // 获取从开始日期到今天的所有日期
    const getAllDatesInRange = (start, end) => {
        const dates = [];
        const current = new Date(start);
        while (current <= end) {
            dates.push(formatDate(current));
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    // 安全获取日记页面（获取所有可能的年份）
    let dailyNotesMap;
    let cachedAt = null;

    const cached = loadFromCache();
    if (cached) {
        ({ dailyNotesMap, cachedAt } = cached);
    } else {
        dailyNotesMap = new Map(); // dateStr -> habitValue
        try {
            const currentYear = today.getFullYear();
            const years = [];
            for (let y = startDate.getFullYear(); y <= currentYear + 1; y++) {
                years.push(`"${CONFIG.dailyNotesFolder}/${y}"`);
            }
            const query = years.join(" or ");

            const allNotes = dv.pages(query);
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
                    const dateMatch = fileName.match(/^\d{4}-\d{2}-\d{2}$/);
                    if (!dateMatch) continue;

                    const habitValue = safeGetProperty(page, CONFIG.habitProperty);
                    dailyNotesMap.set(fileName, habitValue);
                } catch (e) {
                    continue;
                }
            }
        } catch (e) {
            console.error("Error fetching daily notes:", e);
        }

        saveToCache(dailyNotesMap);
    }

    // ========================================
    // 计算已过去的天数和未完成天数
    // ========================================
    
    // 确定统计截止日期（今天或开始日期，取较晚者）
    const statsEndDate = today >= startDate ? today : startDate;
    const pastDates = today >= startDate ? getAllDatesInRange(startDate, statsEndDate) : [];
    
    let completedCount = 0;
    let missedCount = 0;
    const completedDates = new Set();
    const missedDates = new Set();

    for (const dateStr of pastDates) {
        const habitValue = dailyNotesMap.get(dateStr);
        if (isHabitCompleted(habitValue)) {
            completedCount++;
            completedDates.add(dateStr);
        } else {
            missedCount++;
            missedDates.add(dateStr);
        }
    }

    // ========================================
    // 计算动态结束日期
    // ========================================
    
    // 总需要天数 = 基础天数 + 未完成天数
    const totalDaysNeeded = CONFIG.baseDaysToTrack + missedCount;
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + totalDaysNeeded - 1);

    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    // ========================================
    // 显示标题和进度
    // ========================================
    // Title with Sims squircle icon (lock — gold)
    const titleRow = dv.container.createEl('div', { attr: { style: 'display:flex;align-items:center;gap:10px;margin-bottom:10px;' } });
    const iconEl = titleRow.createEl('span', { attr: { style: 'display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:28%;background:linear-gradient(145deg,#f4c842,#8a6010);box-shadow:inset 0 2px 0 rgba(255,255,255,.45),inset 0 -1px 0 rgba(0,0,0,.3),0 2px 5px rgba(0,0,0,.4);flex-shrink:0;' } });
    iconEl.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11L8 7Q8 3 12 3Q16 3 16 7L16 11"/><circle cx="12" cy="16" r="1.5" fill="white" stroke="none"/></svg>`;
    titleRow.createEl('strong', { text: '100天不买挑战', attr: { style: 'font-size:1.2em;' } });
    dv.span(`<br>📅 开始: ${CONFIG.startDate}`);
    
    if (missedCount > 0) {
        dv.span(`<br>⏳ 原目标: ${CONFIG.baseDaysToTrack}天 → 现目标: <span style="color: #e74c3c; font-weight: bold;">${totalDaysNeeded}天</span> (+${missedCount}天)`);
    } else {
        dv.span(`<br>🎯 目标: ${CONFIG.baseDaysToTrack}天`);
    }
    
    dv.span(`<br>📆 预计结束: ${formatDate(endDate) || 'N/A'}`);

    // 计算进度
    const expectedDays = pastDates.length;
    const completionRate = expectedDays > 0 ? Math.round((completedCount / expectedDays) * 100) : 0;
    const remainingDays = Math.max(0, CONFIG.baseDaysToTrack - completedCount);

    dv.span(`<br><br>📊 **进度统计:**`);
    dv.span(`<br>✅ 已完成: ${completedCount}天`);
    dv.span(`<br>❌ 未完成: ${missedCount}天`);
    dv.span(`<br>📈 完成率: ${completionRate}%`);
    dv.span(`<br>🏁 还需完成: ${remainingDays}天<br><br>`);

    // Cache status and refresh button
    const cacheInfoEl = dv.container.createEl('div', {
        attr: { style: 'display:flex; align-items:center; gap:12px; margin-bottom:10px; font-size:0.85em; color:var(--text-muted);' }
    });
    if (cachedAt) {
        const ageMinutes = Math.round((Date.now() - cachedAt.getTime()) / 60000);
        const ageText = ageMinutes < 60 ? `${ageMinutes}分钟前` : `${Math.round(ageMinutes / 60)}小时前`;
        cacheInfoEl.createEl('span', { text: `📦 缓存于${ageText}` });
    }
    const refreshBtn = cacheInfoEl.createEl('button', { text: '↺ 刷新数据' });
    refreshBtn.style.cssText = 'padding:2px 10px; border-radius:4px; cursor:pointer; border:1px solid var(--background-modifier-border); background:var(--background-secondary); color:var(--text-normal); font-size:0.85em;';
    refreshBtn.addEventListener('click', async () => {
        clearCache();
        const file = app.workspace.getActiveFile();
        await app.workspace.activeLeaf.openFile(file, { active: true });
    });

    // ========================================
    // 检查热力图插件是否可用
    // ========================================
    if (typeof renderHeatmapCalendar !== 'function') {
        dv.span("⚠️ 热力图插件未加载。请确保已安装 Heatmap Calendar 插件。");
        throw new Error("Heatmap Calendar plugin not available");
    }

    // ========================================
    // 生成热力图条目
    // ========================================
    const entries = [];
    const blockedEntries = [];

    try {
        for (let year = startYear; year <= endYear; year++) {
            for (let month = 0; month < 12; month++) {
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dateObj = safeParseDate(dateStr);
                    
                    if (!dateObj) continue;
                    
                    if (dateObj < startDate || dateObj > endDate) {
                        // 范围外 - blocked
                        blockedEntries.push({
                            date: dateStr,
                            intensity: 1,
                            color: "blocked"
                        });
                    } else if (completedDates.has(dateStr)) {
                        // 已完成 - 绿色
                        entries.push({
                            date: dateStr,
                            intensity: 1,
                            content: CONFIG.completedEmoji,
                            color: "completed"
                        });
                    } else if (missedDates.has(dateStr)) {
                        // 未完成 - 深灰色
                        entries.push({
                            date: dateStr,
                            intensity: 1,
                            content: CONFIG.missedEmoji,
                            color: "missed"
                        });
                    }
                    // 未来日期不添加任何颜色，保持默认
                }
            }
        }
    } catch (e) {
        console.error("Error generating entries:", e);
    }

    // ========================================
    // 渲染热力图
    // ========================================
    const allEntries = [...entries, ...blockedEntries];
    
    const calendarData = {
        year: startYear,
        colors: {
            completed: CONFIG.colors.completed,
            missed: CONFIG.colors.missed,
            blocked: CONFIG.colors.blocked
        },
        showCurrentDayBorder: true,
        defaultEntryIntensity: 2,
        entries: allEntries
    };

    try {
        renderHeatmapCalendar(this.container, calendarData);
    } catch (e) {
        console.error("Error rendering first calendar:", e);
        dv.span("⚠️ 渲染热力图时出错");
    }

    // 如果跨年，显示后续年份
    if (endYear > startYear) {
        for (let year = startYear + 1; year <= endYear; year++) {
            dv.span("<br>");
            
            const calendarDataYear = {
                year: year,
                colors: {
                    completed: CONFIG.colors.completed,
                    missed: CONFIG.colors.missed,
                    blocked: CONFIG.colors.blocked
                },
                showCurrentDayBorder: true,
                defaultEntryIntensity: 2,
                entries: allEntries
            };
            
            try {
                renderHeatmapCalendar(this.container, calendarDataYear);
            } catch (e) {
                console.error(`Error rendering calendar for year ${year}:`, e);
                dv.span(`⚠️ 渲染${year}年热力图时出错`);
            }
        }
    }

} catch (error) {
    console.error("100天挑战热力图错误:", error);
    dv.span(`<br>⚠️ 发生错误: ${error.message || '未知错误'}`);
} finally {
    // Always clear running flag
    window[containerId + '_running'] = false;
}
})();
```
