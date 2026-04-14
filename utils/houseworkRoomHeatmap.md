---
tags:
modified_at: 2026-01-29
---
```dataviewjs
// ========== HOUSEHOLD TASKS HEATMAP BY ROOM ==========
console.log("=== STARTING HOUSEHOLD TASKS HEATMAP ===");

// Configuration - Room categories based on your task structure
const availableRooms = [
    "所有房间",
    "地面清洁", 
    "卧室",
    "衣物",
    "浴室",
    "厨房",
    "猫猫"
];

// Map rooms to their corresponding frontmatter properties and task values
const roomTasks = {
    "所有房间": {}, // Empty means all tasks
    "地面清洁": {
        "hw_floor": ["吸尘", "拖地"]
    },
    "卧室": {
        "hw_bedroom": ["换床单", "换被套"],
        "hw_renew": ["替换/空气净化器filter", "替换/空调滤网"]
    },
    "衣物": {
        "hw_laundry": ["洗衣服", "叠衣服", "整理/卖Mercari"]
    },
    "浴室": {
        "hw_bathroom": ["刷马桶", "洗手台", "浴室地面"]
    },
    "厨房": {
        "hw_kitchen": ["厨房水池", "整理/厨房台面"]
    },
    "猫猫": {
        "hw_renew": ["替换/猫砂盆liner"]
    }
};

// All frontmatter properties to check
const allFrontmatterProps = ["hw_floor", "hw_bedroom", "hw_laundry", "hw_bathroom", "hw_kitchen", "hw_renew"];

// Color schemes for each room
const roomColorSchemes = {
    "所有房间": {
        none: 'var(--background-primary)',
        light: '#C8E6C9',
        medium: '#81C784',
        heavy: '#4CAF50',
        veryHeavy: '#2E7D32',
        textLight: '#1B5E20',
        textDark: 'white'
    },
    "地面清洁": {
        none: 'var(--background-primary)',
        light: '#FFE4B5',
        medium: '#FFD700',
        heavy: '#FFA500',
        veryHeavy: '#FF8C00',
        textLight: '#8B4513',
        textDark: 'white'
    },
    "卧室": {
        none: 'var(--background-primary)',
        light: '#FFE4E1',
        medium: '#FFB6C1',
        heavy: '#FFA8D8',
        veryHeavy: '#FF69B4',
        textLight: '#8B008B',
        textDark: 'white'
    },
    "衣物": {
        none: 'var(--background-primary)',
        light: '#E6E6FA',
        medium: '#DDA0DD',
        heavy: '#DA70D6',
        veryHeavy: '#BA55D3',
        textLight: '#4B0082',
        textDark: 'white'
    },
    "浴室": {
        none: 'var(--background-primary)',
        light: '#E0FFFF',
        medium: '#87CEEB',
        heavy: '#6B9DC2',
        veryHeavy: '#4682B4',
        textLight: '#191970',
        textDark: 'white'
    },
    "厨房": {
        none: 'var(--background-primary)',
        light: '#FFE4B5',
        medium: '#FF8C69',
        heavy: '#E67E22',
        veryHeavy: '#D35400',
        textLight: '#8B4513',
        textDark: 'white'
    },
    "猫猫": {
        none: 'var(--background-primary)',
        light: '#E6E6FA',
        medium: '#DDA0DD',
        heavy: '#DA70D6',
        veryHeavy: '#BA55D3',
        textLight: '#4B0082',
        textDark: 'white'
    }
};

// Emojis for each room
const roomEmojis = {
    "所有房间": "🏠",
    "地面清洁": "🧹",
    "卧室": "🛏️",
    "衣物": "👕",
    "浴室": "🚿",
    "厨房": "🍳",
    "猫猫": "🐱"
};

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', 
                    '七月', '八月', '九月', '十月', '十一月', '十二月'];

// Main container
const mainContainer = dv.el('div', '');
mainContainer.style.padding = '8px';
mainContainer.style.backgroundColor = 'var(--background-secondary)';
mainContainer.style.borderRadius = '8px';

// Dropdown menu
const controlsContainer = dv.el('div', '', { container: mainContainer });
controlsContainer.style.marginBottom = '15px';
controlsContainer.style.textAlign = 'center';

const dropdownLabel = dv.el('label', '选择房间: ', { container: controlsContainer });
dropdownLabel.style.marginRight = '10px';
dropdownLabel.style.fontSize = '0.9em';
dropdownLabel.style.color = 'var(--text-normal)';
dropdownLabel.style.fontWeight = '600';

const dropdown = dv.el('select', '', { container: controlsContainer });
dropdown.style.padding = '8px 15px';
dropdown.style.borderRadius = '6px';
dropdown.style.border = '2px solid var(--background-modifier-border)';
dropdown.style.backgroundColor = 'var(--background-primary)';
dropdown.style.color = 'var(--text-normal)';
dropdown.style.fontSize = '0.9em';
dropdown.style.cursor = 'pointer';
dropdown.style.fontWeight = '500';

for (const room of availableRooms) {
    const option = dv.el('option', `${roomEmojis[room]} ${room}`, { container: dropdown });
    option.value = room;
}

// Content container
const contentContainer = dv.el('div', '', { container: mainContainer });

// Helper function to get Monday of a given date
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

// Helper function to get week key (Monday's date string)
function getWeekKey(date) {
    const monday = getMonday(date);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

// Helper function to count tasks from frontmatter for a specific room
function countTasksForRoom(page, targetRoom) {
    let count = 0;
    
    if (targetRoom === "所有房间") {
        // Count all tasks from all frontmatter properties
        for (const prop of allFrontmatterProps) {
            const propValue = page[prop];
            if (propValue && Array.isArray(propValue)) {
                count += propValue.length;
            }
        }
    } else {
        // Count only tasks for the specific room
        const roomConfig = roomTasks[targetRoom];
        for (const [prop, allowedTasks] of Object.entries(roomConfig)) {
            const propValue = page[prop];
            if (propValue && Array.isArray(propValue)) {
                // Count only tasks that are in the allowed list for this room
                const matchingTasks = propValue.filter(task => allowedTasks.includes(task));
                count += matchingTasks.length;
            }
        }
    }
    
    return count;
}

// Render function
function renderHeatmap(targetRoom) {
    contentContainer.innerHTML = '';
    
    const colorScheme = roomColorSchemes[targetRoom];
    const currentYear = new Date().getFullYear();
    const dailyNotesPath = `日记/${currentYear}`;
    
    // Date range: last 6 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    
    // Collect data by week
    const weekData = {};
    const pages = dv.pages(`"${dailyNotesPath}"`);
    
    for (const page of pages) {
        try {
            let pageDate;
            const fileName = page.file.name;
            const dateMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
            
            if (dateMatch) {
                pageDate = new Date(dateMatch[0]);
            } else if (page.file.day) {
                pageDate = page.file.day.toJSDate ? page.file.day.toJSDate() : new Date(page.file.day);
            } else {
                continue;
            }
            
            if (isNaN(pageDate.getTime())) {
                continue;
            }
            
            if (pageDate >= startDate && pageDate <= endDate) {
                const weekKey = getWeekKey(pageDate);
                
                // Count tasks from frontmatter
                const taskCount = countTasksForRoom(page, targetRoom);
                
                if (taskCount > 0) {
                    if (!weekData[weekKey]) {
                        weekData[weekKey] = { 
                            count: 0, 
                            dates: [],
                            monday: getMonday(pageDate)
                        };
                    }
                    weekData[weekKey].count += taskCount;
                    weekData[weekKey].dates.push(pageDate);
                }
            }
        } catch (e) {
            console.log(`❌ Error parsing ${page.file.name}:`, e);
        }
    }
    
    // Generate months data structure
    const monthsData = {};
    let currentWeekStart = getMonday(startDate);
    const endWeekStart = getMonday(endDate);
    
    while (currentWeekStart <= endWeekStart) {
        const weekKey = `${currentWeekStart.getFullYear()}-${String(currentWeekStart.getMonth() + 1).padStart(2, '0')}-${String(currentWeekStart.getDate()).padStart(2, '0')}`;
        const monthKey = `${currentWeekStart.getFullYear()}-${String(currentWeekStart.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthsData[monthKey]) {
            monthsData[monthKey] = {
                year: currentWeekStart.getFullYear(),
                month: currentWeekStart.getMonth(),
                weeks: []
            };
        }
        
        monthsData[monthKey].weeks.push({
            key: weekKey,
            monday: new Date(currentWeekStart),
            count: weekData[weekKey]?.count || 0
        });
        
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    // Calculate max for color intensity
    const allWeeks = Object.values(monthsData).flatMap(m => m.weeks);
    const maxWeekTasks = Math.max(...allWeeks.map(w => w.count), 1);
    const currentWeekKey = getWeekKey(new Date());
    const maxWeeksInMonth = Math.max(...Object.values(monthsData).map(m => m.weeks.length));
    const sortedMonthKeys = Object.keys(monthsData).sort();
    
    // Title
    const title = dv.el('h4', `${roomEmojis[targetRoom]} ${targetRoom} - 最近6个月任务热图`, { container: contentContainer });
    title.style.textAlign = 'center';
    title.style.marginBottom = '15px';
    title.style.color = 'var(--text-normal)';
    title.style.fontSize = '1.1em';
    
    // Create table-style layout
    const tableContainer = dv.el('div', '', { container: contentContainer });
    tableContainer.style.display = 'table';
    tableContainer.style.margin = '0 auto';
    tableContainer.style.borderSpacing = '4px';
    
    // Month headers row
    const headerRow = dv.el('div', '', { container: tableContainer });
    headerRow.style.display = 'table-row';
    
    const emptyCell = dv.el('div', '', { container: headerRow });
    emptyCell.style.display = 'table-cell';
    emptyCell.style.width = '30px';
    
    for (const monthKey of sortedMonthKeys) {
        const monthData = monthsData[monthKey];
        const monthLabel = dv.el('div', monthNames[monthData.month], { container: headerRow });
        monthLabel.style.display = 'table-cell';
        monthLabel.style.textAlign = 'center';
        monthLabel.style.fontSize = '0.8em';
        monthLabel.style.fontWeight = 'bold';
        monthLabel.style.color = 'var(--text-muted)';
        monthLabel.style.paddingBottom = '8px';
        monthLabel.style.verticalAlign = 'bottom';
        monthLabel.style.minWidth = '40px';
    }
    
    // Week rows
    for (let weekIndex = 0; weekIndex < maxWeeksInMonth; weekIndex++) {
        const weekRow = dv.el('div', '', { container: tableContainer });
        weekRow.style.display = 'table-row';
        
        const weekLabel = dv.el('div', `W${weekIndex + 1}`, { container: weekRow });
        weekLabel.style.display = 'table-cell';
        weekLabel.style.width = '30px';
        weekLabel.style.fontSize = '0.65em';
        weekLabel.style.color = 'var(--text-muted)';
        weekLabel.style.textAlign = 'right';
        weekLabel.style.paddingRight = '8px';
        weekLabel.style.verticalAlign = 'middle';
        
        for (const monthKey of sortedMonthKeys) {
            const monthData = monthsData[monthKey];
            const week = monthData.weeks[weekIndex];
            
            const cellContainer = dv.el('div', '', { container: weekRow });
            cellContainer.style.display = 'table-cell';
            cellContainer.style.textAlign = 'center';
            cellContainer.style.verticalAlign = 'middle';
            cellContainer.style.padding = '2px';
            
            if (week) {
                const intensity = maxWeekTasks > 0 ? week.count / maxWeekTasks : 0;
                
                const cell = dv.el('div', '', { container: cellContainer });
                cell.style.width = '32px';
                cell.style.height = '32px';
                cell.style.margin = '0 auto';
                cell.style.borderRadius = '4px';
                cell.style.cursor = 'pointer';
                cell.style.transition = 'all 0.2s ease';
                cell.style.border = week.key === currentWeekKey 
                    ? '2px solid var(--text-accent)' 
                    : '1px solid var(--background-modifier-border)';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.fontSize = '0.7em';
                cell.style.fontWeight = 'bold';
                
                const weekEnd = new Date(week.monday);
                weekEnd.setDate(weekEnd.getDate() + 6);
                const dateRange = `${week.monday.getMonth() + 1}/${week.monday.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
                cell.title = `${dateRange}\n${week.count} 个任务`;
                
                // Determine colors based on intensity
                let backgroundColor, textColor;
                if (week.count === 0) {
                    backgroundColor = colorScheme.none;
                    textColor = 'var(--text-muted)';
                } else if (intensity <= 0.25) {
                    backgroundColor = colorScheme.light;
                    textColor = colorScheme.textLight;
                } else if (intensity <= 0.5) {
                    backgroundColor = colorScheme.medium;
                    textColor = colorScheme.textLight;
                } else if (intensity <= 0.75) {
                    backgroundColor = colorScheme.heavy;
                    textColor = colorScheme.textDark;
                } else {
                    backgroundColor = colorScheme.veryHeavy;
                    textColor = colorScheme.textDark;
                }
                
                cell.style.backgroundColor = backgroundColor;
                cell.style.color = textColor;
                
                if (week.count > 0) {
                    cell.textContent = week.count.toString();
                }
                
                // Hover effects
                cell.onmouseenter = () => {
                    cell.style.transform = 'scale(1.2)';
                    cell.style.zIndex = '10';
                    cell.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                };
                cell.onmouseleave = () => {
                    cell.style.transform = 'scale(1)';
                    cell.style.zIndex = '1';
                    cell.style.boxShadow = 'none';
                };
                
                // Click to open daily note (first day of week)
                cell.onclick = () => {
                    const mondayStr = `${week.monday.getFullYear()}-${String(week.monday.getMonth() + 1).padStart(2, '0')}-${String(week.monday.getDate()).padStart(2, '0')}`;
                    app.workspace.openLinkText(`${dailyNotesPath}/${mondayStr}.md`, '', false);
                };
            }
        }
    }
    
    // Legend
    const legend = dv.el('div', '', { container: contentContainer });
    legend.style.display = 'flex';
    legend.style.justifyContent = 'center';
    legend.style.alignItems = 'center';
    legend.style.gap = '15px';
    legend.style.marginTop = '20px';
    legend.style.fontSize = '0.8em';
    legend.style.color = 'var(--text-muted)';
    
    const legendItems = [
        { label: '无', color: colorScheme.none },
        { label: '少', color: colorScheme.light },
        { label: '中', color: colorScheme.medium },
        { label: '多', color: colorScheme.heavy },
        { label: '很多', color: colorScheme.veryHeavy }
    ];
    
    for (const item of legendItems) {
        const legendItem = dv.el('div', '', { container: legend });
        legendItem.style.display = 'flex';
        legendItem.style.alignItems = 'center';
        legendItem.style.gap = '6px';
        
        const colorBox = dv.el('div', '', { container: legendItem });
        colorBox.style.width = '18px';
        colorBox.style.height = '18px';
        colorBox.style.borderRadius = '3px';
        colorBox.style.backgroundColor = item.color;
        colorBox.style.border = '1px solid var(--background-modifier-border)';
        
        dv.el('span', item.label, { container: legendItem });
    }
    
    // Statistics summary
    const stats = dv.el('div', '', { container: contentContainer });
    stats.style.marginTop = '15px';
    stats.style.padding = '12px';
    stats.style.backgroundColor = 'var(--background-primary)';
    stats.style.borderRadius = '6px';
    stats.style.textAlign = 'center';
    stats.style.fontSize = '0.85em';
    
    const totalWeekTasks = allWeeks.reduce((sum, week) => sum + week.count, 0);
    const activeWeeks = allWeeks.filter(week => week.count > 0).length;
    const avgPerWeek = activeWeeks > 0 ? (totalWeekTasks / activeWeeks).toFixed(1) : 0;
    
    dv.el('p', `📊 ${allWeeks.length} 周统计 | ${totalWeekTasks} 个任务 | ${activeWeeks} 个活跃周 | 平均 ${avgPerWeek} 个/周`, { 
        container: stats 
    });
}

// Event handler for dropdown change
dropdown.onchange = () => {
    renderHeatmap(dropdown.value);
};

// Initial render with default room
renderHeatmap("所有房间");

console.log("=== HOUSEHOLD TASKS HEATMAP COMPLETE ===");
```
