module.exports = async (params) => {
    const { app } = params;

    function findBakFiles(folder) {
        const bakFiles = [];
        for (const child of folder.children) {
            if (child.children !== undefined) {
                // TFolder — recurse, skip hidden folders
                if (!child.name.startsWith('.')) {
                    bakFiles.push(...findBakFiles(child));
                }
            } else {
                // TFile
                if (child.name.endsWith('.bak')) {
                    bakFiles.push(child);
                }
            }
        }
        return bakFiles;
    }

    const root = app.vault.getRoot();
    const bakFiles = findBakFiles(root);

    if (bakFiles.length === 0) {
        new Notice('No .bak files found');
        return;
    }

    for (const file of bakFiles) {
        await app.vault.delete(file);
    }

    new Notice(`Deleted ${bakFiles.length} .bak file${bakFiles.length !== 1 ? 's' : ''}`);
};
