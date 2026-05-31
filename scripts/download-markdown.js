{
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getCtrlClickEvent = () => new MouseEvent('click', { ctrlKey: true, bubbles: true });

const waitForHeading = async (expectedName, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const heading = document.querySelector('h1.ve-stats__h-name');
        if (heading?.textContent?.trim().toLowerCase() === expectedName.toLowerCase()) return true;
        await sleep(100);
    }
    console.warn(`Heading timeout — expected "${expectedName}", got "${document.querySelector('h1.ve-stats__h-name')?.textContent?.trim()}"`);
    return false;
};

const waitForMarkdownPre = async (timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const pre = document.querySelector('pre.ve-h-100.ve-w-100');
        if (pre?.textContent?.trim().length > 0) return pre;
        await sleep(100);
    }
    return null;
};

const downloadMarkdown = (content) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'items-export.md';
    a.click();
    URL.revokeObjectURL(url);
};

const processItem = async (child, index) => {
    const link = child.querySelector('a.ve-lst__row-inner');
    if (!link) {
        console.warn(`Item ${index}: no row link, skipping.`);
        return null;
    }

    const itemName = child.querySelector('.ve-bold')?.textContent?.trim() ?? `item-${index}`;
    link.click();

    const loaded = await waitForHeading(itemName);
    if (!loaded) {
        console.warn(`Item ${index} (${itemName}): panel did not update, skipping.`);
        return null;
    }

    await sleep(200);

    const popoutBtn = document.querySelector('[title="Popout Window (SHIFT for Source Data; CTRL for Markdown Render)"]');
    if (!popoutBtn) {
        console.warn(`Item ${index} (${itemName}): popout button not found.`);
        return null;
    }

    popoutBtn.dispatchEvent(getCtrlClickEvent());

    const pre = await waitForMarkdownPre();
    if (!pre) {
        console.warn(`Item ${index} (${itemName}): markdown pre not found.`);
        return null;
    }

    const markdown = pre.textContent.trim();

    const closeBtn = document.querySelector('[title="Close (CTRL to Close All)"]');
    closeBtn?.dispatchEvent(getCtrlClickEvent());
    await sleep(300);

    console.log(`Item ${index} (${itemName}): ✅ ${markdown.length} chars`);
    return markdown;
};

const processAllItems = async () => {
    // Collect all list--stats containers on the page
    const lists = Array.from(document.querySelectorAll('list.list--stats, ul.list--stats, div.list--stats, [id].list--stats'));

    // Fallback: if the selector above yields nothing, try the original single-list selector
    const resolvedLists = lists.length > 0
        ? lists
        : (() => {
            const single = document.querySelector('#list.list--stats');
            return single ? [single] : [];
        })();

    if (resolvedLists.length === 0) {
        console.error('No list--stats containers found.');
        return;
    }

    console.log(`Found ${resolvedLists.length} list(s).`);

    const sections = [];
    let globalIndex = 1;

    for (const [listIdx, list] of resolvedLists.entries()) {
        const children = Array.from(list.children);
        console.log(`List ${listIdx + 1}: processing ${children.length} items...`);

        for (const child of children) {
            const markdown = await processItem(child, globalIndex++);
            if (markdown) sections.push(markdown);
            await sleep(300);
        }
    }

    if (sections.length === 0) {
        console.error('No markdown collected.');
        return;
    }

    downloadMarkdown(sections.join('\n\n---\n\n'));
    console.log(`Done. Downloaded ${sections.length} section(s).`);
};

processAllItems();
}