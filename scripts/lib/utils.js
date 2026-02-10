import fs from 'fs';
import path from 'path';

export function toKebabCase(str) {
    return str.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export function writeJson(filePath, data) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`  Written: ${filePath}`);
}
