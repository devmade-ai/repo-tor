#!/usr/bin/env node
/**
 * Migrate Batches to Individual Commits
 *
 * One-time migration script to convert from batch files to individual commit files.
 * Reads all batch files from processed/<repo>/batches/ and writes each commit
 * as a separate file in processed/<repo>/commits/.
 *
 * Usage:
 *   node migrate-batches-to-commits.js [--dry-run] [--keep-batches]
 *
 * Options:
 *   --dry-run       Show what would be migrated without making changes
 *   --keep-batches  Keep the batches/ directory after migration (default: delete)
 */

const fs = require('fs');
const path = require('path');

const PROCESSED_DIR = path.join(__dirname, '..', 'processed');

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const keepBatches = args.includes('--keep-batches');

function loadBatchesFromRepo(repoName) {
  const batchDir = path.join(PROCESSED_DIR, repoName, 'batches');

  if (!fs.existsSync(batchDir)) {
    return { commits: [], batchCount: 0 };
  }

  const batchFiles = fs.readdirSync(batchDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (batchFiles.length === 0) {
    return { commits: [], batchCount: 0 };
  }

  const commits = [];

  for (const file of batchFiles) {
    try {
      const content = fs.readFileSync(path.join(batchDir, file), 'utf-8');
      const batch = JSON.parse(content);

      if (batch.commits && Array.isArray(batch.commits)) {
        commits.push(...batch.commits);
      }
    } catch (err) {
      console.error(`  Error reading ${file}: ${err.message}`);
    }
  }

  return { commits, batchCount: batchFiles.length };
}

function migrateRepo(repoName) {
  console.log(`\nMigrating ${repoName}...`);

  const { commits, batchCount } = loadBatchesFromRepo(repoName);

  if (batchCount === 0) {
    console.log(`  No batches found, skipping`);
    return { migrated: 0, batches: 0 };
  }

  console.log(`  Found ${commits.length} commits in ${batchCount} batches`);

  if (dryRun) {
    console.log(`  [DRY RUN] Would write ${commits.length} commit files`);
    console.log(`  [DRY RUN] Would delete batches/ directory`);
    return { migrated: commits.length, batches: batchCount };
  }

  // Create commits directory
  const commitsDir = path.join(PROCESSED_DIR, repoName, 'commits');
  fs.mkdirSync(commitsDir, { recursive: true });

  // Write each commit as individual file
  let written = 0;
  for (const commit of commits) {
    const commitPath = path.join(commitsDir, `${commit.sha}.json`);
    fs.writeFileSync(commitPath, JSON.stringify(commit, null, 2));
    written++;
  }

  console.log(`  Wrote ${written} commit files to commits/`);

  // Delete batches directory
  if (!keepBatches) {
    const batchDir = path.join(PROCESSED_DIR, repoName, 'batches');
    fs.rmSync(batchDir, { recursive: true, force: true });
    console.log(`  Deleted batches/ directory`);
  } else {
    console.log(`  Kept batches/ directory (--keep-batches)`);
  }

  return { migrated: written, batches: batchCount };
}

function main() {
  console.log('Migrate Batches to Individual Commits');
  console.log('=====================================');

  if (dryRun) {
    console.log('\n[DRY RUN MODE - No changes will be made]\n');
  }

  if (!fs.existsSync(PROCESSED_DIR)) {
    console.error(`\nProcessed directory not found: ${PROCESSED_DIR}`);
    process.exit(1);
  }

  const repoDirs = fs.readdirSync(PROCESSED_DIR)
    .filter(d => fs.statSync(path.join(PROCESSED_DIR, d)).isDirectory());

  if (repoDirs.length === 0) {
    console.log('\nNo repositories found in processed/');
    process.exit(0);
  }

  console.log(`\nFound ${repoDirs.length} repositories: ${repoDirs.join(', ')}`);

  let totalMigrated = 0;
  let totalBatches = 0;

  for (const repoName of repoDirs) {
    const { migrated, batches } = migrateRepo(repoName);
    totalMigrated += migrated;
    totalBatches += batches;
  }

  console.log('\n=====================================');
  console.log('Migration complete!');
  console.log(`  Repositories: ${repoDirs.length}`);
  console.log(`  Batches processed: ${totalBatches}`);
  console.log(`  Commits migrated: ${totalMigrated}`);

  if (dryRun) {
    console.log('\n[DRY RUN - Run without --dry-run to apply changes]');
  }
}

main();
