import fs from 'fs';
import path from 'path';

export const PROCESSED_DIR = 'processed';

export function getManifestPath(repoId) {
    return path.join(PROCESSED_DIR, repoId, 'manifest.json');
}

export function readManifest(repoId) {
    const manifestPath = getManifestPath(repoId);
    if (fs.existsSync(manifestPath)) {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }
    return { processedShas: [], lastUpdated: null };
}

export function writeManifest(repoId, manifest) {
    const manifestPath = getManifestPath(repoId);
    const dir = path.dirname(manifestPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}
