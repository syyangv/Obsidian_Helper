```dataviewjs
(async () => {
    // ===== PREVENT MULTIPLE SIMULTANEOUS EXECUTIONS =====
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        dv.paragraph('⚠️ Cannot detect file');
        return;
    }

    const containerId = 'monthly-calendar-' + activeFile.path;

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
    // ===== GET EMBEDDING FILE =====
    
    const pageName = activeFile.basename;
    const match = pageName.match(/^(\d{4})-(\d{2})$/);
    
    if (!match) {
        dv.paragraph('⚠️ Filename must be YYYY-MM format, got: ' + pageName);
        return;
    }
    
    const MONTH_YEAR = match[1] + '-' + match[2];
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const MONTH_NAME = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const DIARY_FOLDER = "日记/" + year;
    
    // ===== THEME CONFIG (from embedding file) =====
    const activeFilePage = dv.page(activeFile.path);
    const THEME = (activeFilePage?.theme?.toString().toLowerCase()) || 'moonrise';

    const THEMES = {
        moonrise: { prefix: 'moonrise', icon: 'dot' },
        budapest: { prefix: 'budapest', icon: 'ornament' },
        asteroid: { prefix: 'asteroid', icon: 'star' },
        chevalier: { prefix: 'chevalier', icon: 'cigarette' },
        darjeeling: { prefix: 'darjeeling', icon: 'stripe' }
    };

    const t = THEMES[THEME];
    if (!t) {
        dv.paragraph('**Error:** Unknown theme "' + THEME + '". Available: ' + Object.keys(THEMES).join(', '));
        return;
    }

    const css = {
        container: t.prefix + '-calendar',
        title: t.prefix + '-title',
        summary: t.prefix + '-summary',
        card: t.prefix + '-summary-card',
        cardHeader: t.prefix + '-card-header',
        cardIcon: t.prefix + '-card-' + t.icon,
        cardLabel: t.prefix + '-card-label',
        cardCount: t.prefix + '-card-count',
        grid: t.prefix + '-calendar-grid',
        dayHeader: t.prefix + '-day-header',
        dayCell: t.prefix + '-day-cell',
        dayNumber: t.prefix + '-day-number',
        activities: t.prefix + '-activities',
        activityIcon: t.prefix + '-activity-' + t.icon
    };

    const TRACKED_TAGS = [
        'therapy', '健身房', '学习',
        { name: '🎾', frontmatters: ['activity_tennis', 'activity_squash'] },
        { name: '🎤', frontmatter: 'activity_singing' },
        { name: '🏊', frontmatter: 'activity_swimming' },
        '下厨', '看戏', '出去玩',
        { name: '看医生', medical_tags: ['Dermatologist', 'Psychiatrist', 'Gastroenterologist', 'Dentist', 'Ophthalmologist', 'PCP', 'UrgentCare', 'OBGYN', 'Allergist', 'Urologist'] }
    ];

    // ===== DATA COLLECTION =====
    let files = [];
    try {
        files = dv.pages('"' + DIARY_FOLDER + '"')
            .where(p => p?.file?.day?.toFormat?.('yyyy-MM') === MONTH_YEAR);
    } catch (e) {
        console.error('DataviewJS: Error querying pages:', e);
    }

    const tagCounts = {};
    const dailyData = {};

    TRACKED_TAGS.forEach(item => {
        const key = typeof item === 'string' ? item : item.name;
        tagCounts[key] = 0;
    });

    for (let file of files) {
        if (!file?.file?.day) continue;
        
        const date = file.file.day.toFormat('yyyy-MM-dd');
        dailyData[date] = {};
        
        for (let item of TRACKED_TAGS) {
            const key = typeof item === 'string' ? item : item.name;
            let hasActivity = false;
            
            try {
                if (typeof item === 'string') {
                    const actTags = file.activity_tags;
                    hasActivity = actTags && (Array.isArray(actTags) 
                        ? actTags.some(t => t?.includes?.(item))
                        : String(actTags).includes(item));
                } else if (item.frontmatters) {
                    hasActivity = item.frontmatters.some(fm => file[fm] === true);
                } else if (item.frontmatter) {
                    hasActivity = file[item.frontmatter] === true;
                } else if (item.medical_tags) {
                    const medTags = file.medical_tags;
                    hasActivity = medTags && (Array.isArray(medTags)
                        ? item.medical_tags.some(tag => medTags.some(t => t?.includes?.(tag)))
                        : item.medical_tags.some(tag => String(medTags).includes(tag)));
                }
            } catch (e) {
                console.warn('Activity check error:', key, e);
            }
            
            if (hasActivity) {
                tagCounts[key]++;
                dailyData[date][key] = true;
            }
        }
    }

    // ===== HTML GENERATION =====
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDayOfWeek = new Date(year, month - 1, 1).getDay();
    const dayHeaders = THEME === 'budapest' 
        ? ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
        : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    // Progress calculation
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    let daysPassed, daysRemaining, progressPercent;
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
        daysPassed = daysInMonth;
        daysRemaining = 0;
        progressPercent = 100;
    } else if (year === currentYear && month === currentMonth) {
        daysPassed = currentDay;
        daysRemaining = daysInMonth - currentDay;
        progressPercent = (daysPassed / daysInMonth) * 100;
    } else {
        daysPassed = 0;
        daysRemaining = daysInMonth;
        progressPercent = 0;
    }

    const h = [];
    h.push('<div class="' + css.container + '">');
    h.push('<h3 class="' + css.title + '">' + MONTH_NAME + '</h3>');
    
    // Progress bar
    h.push('<div style="width: 60%; margin: 10px 0 20px 0;">');
    h.push('<div style="display: flex; align-items: center; gap: 8px;">');
    h.push('<div style="min-width: 30px; text-align: right; font-size: 11px; font-weight: 500;">' + daysPassed + '天</div>');
    h.push('<div style="flex: 1; background: #E8D5B7; height: 10px; border-radius: 5px; overflow: hidden;">');
    if (progressPercent > 0) {
        h.push('<div style="background: #D4A574; height: 100%; width: ' + progressPercent.toFixed(1) + '%;"></div>');
    }
    h.push('</div>');
    h.push('<div style="min-width: 30px; text-align: left; font-size: 11px; font-weight: 500;">剩余' + daysRemaining + '天</div>');
    h.push('</div></div>');
    
    // Summary cards
    h.push('<div class="' + css.summary + '">');
    for (let item of TRACKED_TAGS) {
        const key = typeof item === 'string' ? item : item.name;
        const name = key.charAt(0).toUpperCase() + key.slice(1);
        const isSwimming = key === '🏊';
        const isGoingOut = key === '出去玩';
        let inlineStyle = '';
        if (isSwimming) {
            inlineStyle = ' style="background-color: #4da6ff !important; opacity: 1 !important;"';
        } else if (isGoingOut) {
            inlineStyle = ' style="background-color: #ffb6c1 !important; opacity: 1 !important;"';
        }
        h.push('<div class="' + css.card + ' ' + key + '">');
        h.push('<div class="' + css.cardHeader + '">');
        h.push('<div class="' + css.cardIcon + ' ' + key + '"' + inlineStyle + '></div>');
        h.push('<div class="' + css.cardLabel + '">' + name + '</div>');
        h.push('</div>');
        h.push('<div class="' + css.cardCount + '">' + (tagCounts[key] || 0) + '</div>');
        h.push('</div>');
    }
    h.push('</div>');

    // Calendar grid
    h.push('<div class="' + css.grid + '">');

    for (let i = 0; i < dayHeaders.length; i++) {
        const isWeekend = i === 0 || i === 6;
        h.push('<div class="' + css.dayHeader + ' ' + (isWeekend ? 'weekend' : 'weekday') + '">' + dayHeaders[i] + '</div>');
    }

    for (let i = 0; i < startDayOfWeek; i++) {
        h.push('<div class="' + css.dayCell + ' empty"></div>');
    }

    const vaultName = app.vault.getName();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        const dayData = dailyData[date] || {};
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const isToday = date === todayStr;
        const dailyNoteExists = files.some(f => f?.file?.name === date);
        
        const cellClass = css.dayCell + (isWeekend ? ' weekend' : ' weekday') + (isToday ? ' today' : '');
        const numClass = css.dayNumber + (isToday ? ' today' : isWeekend ? ' weekend' : ' weekday');
        
        h.push('<div class="' + cellClass + '">');
        
        if (dailyNoteExists) {
            h.push('<a href="obsidian://open?vault=' + encodeURIComponent(vaultName) + '&file=' + encodeURIComponent(date) + '" class="' + numClass + '" style="text-decoration: none; color: inherit;">' + day + '</a>');
        } else {
            h.push('<span class="' + numClass + '">' + day + '</span>');
        }
        
        const activities = TRACKED_TAGS.filter(item => dayData[typeof item === 'string' ? item : item.name]);
        
        if (activities.length > 0) {
            h.push('<div class="' + css.activities + '">');
            for (let item of activities) {
                const key = typeof item === 'string' ? item : item.name;
                const isSwimming = key === '🏊';
                const isGoingOut = key === '出去玩';
                let inlineStyle = '';
                if (isSwimming) {
                    inlineStyle = ' style="background-color: #4da6ff !important; opacity: 1 !important;"';
                } else if (isGoingOut) {
                    inlineStyle = ' style="background-color: #ffb6c1 !important; opacity: 1 !important;"';
                }
                h.push('<div class="' + css.activityIcon + ' ' + key + '" title="' + key + '"' + inlineStyle + '></div>');
            }
            h.push('</div>');
        }
        
        h.push('</div>');
    }

    const remainingCells = (7 - ((startDayOfWeek + daysInMonth) % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
        h.push('<div class="' + css.dayCell + ' empty"></div>');
    }

    h.push('</div></div>');
    dv.el('div', h.join(''));

} catch (error) {
    console.error('Calendar Error:', error);
    dv.paragraph('⚠️ Calendar error: ' + error.message);
} finally {
    // Always clear running flag
    window[containerId + '_running'] = false;
}
})();
```