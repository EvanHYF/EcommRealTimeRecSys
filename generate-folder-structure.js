const fs = require('fs');
const path = require('path');

// Folder list that needs to be skipped
const IGNORED_FOLDERS = new Set(['node_modules', 'dist', '.git']);

function generateFolderStructure(dir, level = 0) {
    if (!fs.existsSync(dir)) {
        console.error(`Error: Directory "${dir}" does not exist.`);
        return '';
    }

    const files = fs.readdirSync(dir);
    let structure = '';

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && IGNORED_FOLDERS.has(file)) {
            console.log(`Skipping directory: ${filePath}`);
            return;
        }

        if (stat.isDirectory()) {
            structure += `${' '.repeat(level * 2)}├── ${file}/\n`;
            structure += generateFolderStructure(filePath, level + 1);
        } else {
            structure += `${' '.repeat(level * 2)}├── ${file}\n`;
        }
    });

    return structure;
}

// 直接使用当前脚本所在目录
const projectRoot = __dirname;

console.log(`Scanning directory: ${projectRoot}`);
const structure = generateFolderStructure(projectRoot);

// 写入到文件
fs.writeFileSync('project-structure.txt', structure);
console.log('Project structure has been written to project-structure.txt');
