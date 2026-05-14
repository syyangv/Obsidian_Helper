---
modified_at: 2026-05-14
---

```dataviewjs
(async () => {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) { dv.paragraph('⚠️ No active file detected.'); return; }

    const dateMatch = activeFile.basename.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
        dv.paragraph('⚠️ Day mentions expects a daily note named YYYY-MM-DD.');
        return;
    }

    const targetDate = activeFile.basename;
    const targetPath = activeFile.path;
    const targetYear = dateMatch[1];
    const helperPath = dv.current()?.file?.path;
    const cacheKey = `dayMentions_${targetPath}`;
    const cacheVersion = '5';

    if (window[cacheKey] &&
        window[cacheKey].version === cacheVersion &&
        window[cacheKey].timestamp > Date.now() - 60000) {
        render(window[cacheKey].data);
        return;
    }

    function isDailyOrMonthly(file) {
        const path = file.path;
        const basename = file.basename;

        // Daily notes live under 日记/<year>/YYYY-MM-DD.md in this vault.
        if (path.startsWith('日记/')) return true;

        // Monthly notes live under 年度记录/<year>/月计划/YYYY-MM.md in this vault.
        if (path.includes('/月计划/')) return true;

        // Ignore helper/template/utility notes.
        if (path.startsWith('Helper/')) return true;

        // Ignore process/instructions notes, including nested 流程说明 folders.
        if (path.startsWith('流程说明/') || path.includes('/流程说明/')) return true;

        // Extra safety for any date-named daily/monthly notes elsewhere.
        if (/^\d{4}-\d{2}-\d{2}$/.test(basename)) return true;
        if (/^\d{4}-\d{2}$/.test(basename)) return true;

        return false;
    }

    function escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function snippetAround(content, index, length) {
        const start = Math.max(0, index - 25);
        const end = Math.min(content.length, index + length + 45);
        const snippet = content
            .slice(start, end)
            .replace(/\s+/g, ' ')
            .trim();

        return snippet.length > 90 ? `${snippet.slice(0, 87)}…` : snippet;
    }

    function isTaskLine(line) {
        // Ignore date mentions inside Markdown task lines, including nested tasks.
        return /^\s*[-*+]\s+\[[^\]]\]\s+/.test(line);
    }

    function frontmatterLabelForMention(content) {
        if (!content.startsWith('---\n')) return null;

        const end = content.indexOf('\n---', 4);
        if (end === -1) return null;

        const frontmatter = content.slice(4, end);
        let currentLabel = null;

        for (const line of frontmatter.split(/\n/)) {
            const keyMatch = line.match(/^([A-Za-z0-9_\-\u4e00-\u9fff ]+)\s*:\s*(.*)$/);
            if (keyMatch) currentLabel = keyMatch[1].trim();

            if ((linkPattern.test(line) || plainDatePattern.test(line)) && currentLabel) {
                if (keyMatch) {
                    return `${currentLabel}: ${keyMatch[2].trim()}`;
                }

                return `${currentLabel}: ${line.trim().replace(/^\s*-\s*/, '')}`;
            }
        }

        return null;
    }

    function findNonTaskMention(content) {
        const frontmatterLabel = frontmatterLabelForMention(content);
        if (frontmatterLabel) {
            return { reason: 'frontmatter', label: frontmatterLabel };
        }

        let offset = 0;
        for (const line of content.split(/\n/)) {
            if (!isTaskLine(line)) {
                const linkMatch = line.match(linkPattern);
                if (linkMatch) {
                    return { reason: 'linked', index: offset + (linkMatch.index ?? 0), length: linkMatch[0].length };
                }

                const dateMatch = line.match(plainDatePattern);
                if (dateMatch) {
                    return { reason: 'text', index: offset + (dateMatch.index ?? 0), length: dateMatch[0].length };
                }
            }

            // +1 accounts for the newline removed by split().
            offset += line.length + 1;
        }

        return null;
    }

    const allMarkdownFiles = app.vault.getMarkdownFiles();
    const results = [];

    // Match linked mentions and plain text mentions of this day.
    const linkTargets = [
        targetDate,
        `${targetDate}.md`,
        targetPath,
        targetPath.replace(/\.md$/, ''),
        `日记/${targetYear}/${targetDate}`,
        `日记/${targetYear}/${targetDate}.md`
    ];
    const linkPattern = new RegExp(`\\[\\[\\s*(?:${linkTargets.map(escapeRegex).join('|')})(?:#[^\\]|]*)?(?:\\|[^\\]]*)?\\s*\\]\\]`, 'i');
    const plainDatePattern = new RegExp(`(^|[^0-9])${escapeRegex(targetDate)}([^0-9]|$)`);

    for (const file of allMarkdownFiles) {
        if (file.path === targetPath) continue;
        if (helperPath && file.path === helperPath) continue;
        if (isDailyOrMonthly(file)) continue;

        let content = '';
        try {
            content = await app.vault.cachedRead(file);
        } catch (error) {
            console.warn(`Failed to read ${file.path}:`, error);
            continue;
        }

        const mention = findNonTaskMention(content);
        if (!mention) continue;

        results.push({
            file,
            reason: mention.reason,
            snippet: mention.label || snippetAround(content, mention.index, mention.length)
        });
    }

    results.sort((a, b) => a.file.basename.localeCompare(b.file.basename));

    window[cacheKey] = {
        version: cacheVersion,
        timestamp: Date.now(),
        data: results
    };

    render(results);

    function ensureHideStyle() {
        const styleId = 'day-mentions-hide-empty-style';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .markdown-embed:has(.day-mentions-empty),
            .internal-embed:has(.day-mentions-empty),
            .markdown-embed:has(.day-mentions-empty) + .markdown-embed-link,
            .internal-embed:has(.day-mentions-empty) + .markdown-embed-link {
                display: none !important;
                height: 0 !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 0 !important;
                overflow: hidden !important;
            }
        `;
        document.head.appendChild(style);
    }

    function setEmbedVisible(visible) {
        ensureHideStyle();

        dv.container.querySelectorAll('.day-mentions-empty').forEach(el => el.remove());

        if (!visible) {
            dv.container.createSpan({ cls: 'day-mentions-empty', attr: { style: 'display:none;' } });
        }

        // When embedded, hide the whole embed frame if this helper has no output.
        // Keep a direct style fallback because some themes/plugins wrap embeds differently.
        const embed = dv.container.closest('.markdown-embed, .internal-embed');
        const target = embed || dv.container;
        const apply = () => {
            target.style.display = visible ? '' : 'none';
            target.style.height = visible ? '' : '0';
            target.style.minHeight = visible ? '' : '0';
            target.style.margin = visible ? '' : '0';
            target.style.padding = visible ? '' : '0';
            target.style.border = visible ? '' : '0';
            target.style.overflow = visible ? '' : 'hidden';
        };

        apply();
        requestAnimationFrame(apply);
        setTimeout(apply, 100);
    }

    function render(items) {
        if (!items.length) {
            setEmbedVisible(false);
            return;
        }

        setEmbedVisible(true);

        const wrap = dv.container.createEl('div', {
            attr: { style: 'margin:0.4em 0; line-height:1.55;' }
        });

        wrap.createEl('div', {
            text: 'Mentioned in',
            attr: { style: 'font-weight:700; color:var(--text-muted); margin-bottom:0.25em;' }
        });

        const list = wrap.createEl('ul', {
            attr: { style: 'margin-top:0.2em; padding-left:1.35em;' }
        });

        for (const item of items) {
            const li = list.createEl('li');
            const link = li.createEl('a', {
                text: item.file.basename,
                cls: 'internal-link',
                attr: { href: item.file.path }
            });
            link.addEventListener('click', e => {
                e.preventDefault();
                app.workspace.openLinkText(item.file.path.replace(/\.md$/, ''), activeFile.path);
            });

            li.createEl('span', {
                text: ` · ${item.file.parent?.path || '/'}` ,
                attr: { style: 'color:var(--text-faint); font-size:0.9em;' }
            });

            li.createEl('span', {
                text: ` · ${item.reason}`,
                attr: { style: 'color:var(--text-faint); font-size:0.9em;' }
            });

            if (item.snippet) {
                li.createEl('div', {
                    text: item.snippet,
                    attr: { style: 'color:var(--text-muted); font-size:0.9em; margin-top:0.1em;' }
                });
            }
        }
    }
})();
```
