# Templater Tick Grid Usage Examples

## 📁 Setup Instructions

1. **Create the script file:**
    
    - Create a folder called `Scripts` in your vault root
    - Save the JavaScript code as `Scripts/tickGrid.js`
2. **Configure Templater:**
    
    - Go to Templater settings
    - Set "Script files folder location" to `Scripts`
    - Enable "Enable System Commands"
3. **Use in your templates or notes:**
    

## 🎯 Basic Usage

### Simple 5-box grid:

```templater
<%* tR += await tp.user.tickGrid(5) %>
```

### 10-box grid:

```templater
<%* tR += await tp.user.tickGrid(10) %>
```

### 20-box grid:

```templater
<%* tR += await tp.user.tickGrid(20) %>
```

## 🎨 Advanced Usage with Options

### Success theme (green when checked):

```templater
<%* tR += await tp.user.tickGrid(8, {theme: 'success'}) %>
```

### Warning theme (orange when checked):

```templater
<%* tR += await tp.user.tickGrid(12, {theme: 'warning'}) %>
```

### Danger theme (red when checked):

```templater
<%* tR += await tp.user.tickGrid(6, {theme: 'danger'}) %>
```

### Compact size:

```templater
<%* tR += await tp.user.tickGrid(15, {size: 'compact'}) %>
```

### Large size:

```templater
<%* tR += await tp.user.tickGrid(8, {size: 'large'}) %>
```

### Start from a different number:

```templater
<%* tR += await tp.user.tickGrid(5, {startNumber: 10}) %>
```

_This creates boxes numbered 10, 11, 12, 13, 14_

### Combined options:

```templater
<%* tR += await tp.user.tickGrid(10, {
    theme: 'success',
    size: 'large',
    startNumber: 1
}) %>
```

## 📋 Template Examples

### Daily Habit Tracker:

```templater
# Daily Habits - <% tp.date.now("YYYY-MM-DD") %>

## Morning Routine (7 steps)
<%* tR += await tp.user.tickGrid(7, {theme: 'success'}) %>

## Work Tasks (10 items)
<%* tR += await tp.user.tickGrid(10, {theme: 'warning'}) %>

## Evening Routine (5 steps)
<%* tR += await tp.user.tickGrid(5, {theme: 'success', size: 'compact'}) %>
```

### Study Session Tracker:

```templater
# Study Session - <% tp.date.now("YYYY-MM-DD HH:mm") %>

## Pomodoro Sessions (8 x 25min)
<%* tR += await tp.user.tickGrid(8, {theme: 'danger'}) %>

## Review Topics (12 items)
<%* tR += await tp.user.tickGrid(12, {size: 'compact'}) %>
```

### Project Checklist:

```templater
# <% tp.file.title %> Progress

## Phase 1 Tasks
<%* tR += await tp.user.tickGrid(<%tp.system.prompt("How many Phase 1 tasks?")%>, {theme: 'warning'}) %>

## Phase 2 Tasks  
<%* tR += await tp.user.tickGrid(<%tp.system.prompt("How many Phase 2 tasks?")%>, {theme: 'success'}) %>
```

## 🔧 Customization Options

The `options` object supports:

|Option|Values|Description|
|---|---|---|
|`theme`|`''`, `'success'`, `'warning'`, `'danger'`|Color when checked|
|`size`|`''`, `'compact'`, `'large'`|Box size|
|`startNumber`|Any integer|Starting number for boxes|

## 💡 Pro Tips

1. **Save as template:** Create template files with pre-configured grids
2. **Dynamic counts:** Use `tp.system.prompt()` to ask for the number of boxes
3. **Date-based:** Use `tp.date` functions to create daily/weekly trackers
4. **Combine themes:** Use different themes for different types of tasks

## 🚀 Quick Commands

Add these to your Templater hotkeys:

- **5 boxes:** `<%* tR += await tp.user.tickGrid(5) %>`
- **10 boxes:** `<%* tR += await tp.user.tickGrid(10) %>`
- **Custom:** `<%* tR += await tp.user.tickGrid(<%tp.system.prompt("How many boxes?")%>) %>`