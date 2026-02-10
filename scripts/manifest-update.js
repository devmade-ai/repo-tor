#!/usr/bin/env node
/**
 * Manifest Update Script
 *
 * Updates the manifest file after processing a batch of commits.
 * This tracks which commits have been processed so incremental
 * processing ("feed the chicken") can skip them.
 *
 * Usage: node manifest-update.js <repo-id> <batch-file>
 *
 * Example:
 *   node manifest-update.js social-ad-creator processed/social-ad-creator/batches/batch-009.json
 */

import fs from 'fs';
import path from 'path';
import { readManifest, writeManifest } from './lib/manifest.js';

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node manifest-update.js <repo-id> <batch-file>');
    console.log('Example: node manifest-update.js social-ad-creator processed/social-ad-creator/batches/batch-009.json');
    process.exit(1);
  }

  const [repoId, batchFile] = args;

  if (!fs.existsSync(batchFile)) {
    console.error(`Batch file not found: ${batchFile}`);
    process.exit(1);
  }

  // Read the batch file
  const batch = JSON.parse(fs.readFileSync(batchFile, 'utf-8'));
  const newShas = batch.commits.map(c => c.sha);

  // Update manifest
  const manifest = readManifest(repoId);
  const existingSet = new Set(manifest.processedShas);

  let added = 0;
  for (const sha of newShas) {
    if (!existingSet.has(sha)) {
      manifest.processedShas.push(sha);
      added++;
    }
  }

  manifest.lastUpdated = new Date().toISOString();

  writeManifest(repoId, manifest);

  console.log(`Updated ${repoId} manifest: +${added} SHAs (total: ${manifest.processedShas.length})`);
}

main();
