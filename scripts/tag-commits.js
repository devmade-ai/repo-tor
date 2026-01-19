#!/usr/bin/env node
/**
 * AI Tagging Script
 *
 * Applies tagging rules from EXTRACTION_PLAYBOOK.md to commits.
 * This codifies the AI analysis guidelines for consistent, repeatable tagging.
 */

const fs = require('fs');
const path = require('path');

// Tag mapping from conventional commit prefixes
const CONVENTIONAL_TO_TAG = {
  'feat': 'feature',
  'fix': 'bugfix',
  'docs': 'docs',
  'style': 'style',
  'refactor': 'refactor',
  'perf': 'performance',
  'test': 'test',
  'build': 'config',
  'ci': 'config',
  'chore': 'config',  // chore is usually config/maintenance
  'revert': 'cleanup',
  'security': 'security'
};

// Keyword patterns for non-conventional commits
const KEYWORD_PATTERNS = [
  { pattern: /\b(security|secure|vulnerability|cve|xss|csrf|injection|auth(?:entication)?)\b/i, tag: 'security' },
  { pattern: /\b(fix|bug|patch|resolve|crash|error|issue)\b/i, tag: 'bugfix' },
  { pattern: /\b(add|new|create|implement|feature)\b/i, tag: 'feature' },
  { pattern: /\b(perf|performance|optimize|speed|faster)\b/i, tag: 'performance' },
  { pattern: /\b(refactor|restructure|reorganize|rename)\b/i, tag: 'refactor' },
  { pattern: /\b(test|spec|coverage)\b/i, tag: 'test' },
  { pattern: /\b(doc|docs|documentation|readme|guide)\b/i, tag: 'docs' },
  { pattern: /\b(ci|cd|pipeline|workflow|deploy|build|webpack|config)\b/i, tag: 'config' },
  { pattern: /\b(dependency|dependencies|npm|yarn|upgrade|bump)\b/i, tag: 'dependency' },
  { pattern: /\b(format|prettier|lint|style)\b/i, tag: 'style' },
  { pattern: /\b(remove|delete|clean|unused)\b/i, tag: 'cleanup' },
];

// Calculate complexity based on files changed and tag count
function calculateComplexity(filesChanged, tagCount) {
  if (filesChanged >= 10 && tagCount >= 3) return 5;
  if (filesChanged >= 7 && tagCount >= 2) return 4;
  if (filesChanged >= 4 || tagCount >= 3) return 3;
  if (filesChanged >= 2 || tagCount >= 2) return 2;
  return 1;
}

// Analyze a commit and assign tags
function analyzeCommit(commit) {
  const subject = commit.subject || '';
  const body = commit.body || '';
  const fullText = subject + ' ' + body;
  const tags = [];

  // Check for merge commit - tag as cleanup and skip further analysis
  if (subject.startsWith('Merge pull request') || subject.startsWith('Merge branch')) {
    return { tags: ['cleanup'], complexity: 1 };
  }

  // Check for initial commit
  if (subject.toLowerCase() === 'initial commit') {
    return { tags: ['feature'], complexity: 1 };
  }

  // Try conventional commit format first
  const conventionalMatch = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  if (conventionalMatch) {
    const [, type] = conventionalMatch;
    const lowerType = type.toLowerCase();
    if (CONVENTIONAL_TO_TAG[lowerType]) {
      tags.push(CONVENTIONAL_TO_TAG[lowerType]);
    }
  }

  // If no conventional tag found, try keyword detection
  if (tags.length === 0) {
    for (const { pattern, tag } of KEYWORD_PATTERNS) {
      if (pattern.test(subject)) {
        tags.push(tag);
        break; // Only first match for primary tag
      }
    }
  }

  // Check for additional tags in full text (security, test)
  if (!tags.includes('security') && /\b(security|cve|vulnerability|xss|csrf)\b/i.test(fullText)) {
    tags.push('security');
  }
  if (!tags.includes('test') && /\b(add.*test|test.*add|with.*test)\b/i.test(fullText)) {
    tags.push('test');
  }

  // Default to cleanup if no tags found
  if (tags.length === 0) {
    tags.push('cleanup');
  }

  // Sort tags by priority order
  const priorityOrder = ['security', 'bugfix', 'feature', 'performance', 'refactor', 'test', 'docs', 'config', 'dependency', 'style', 'cleanup'];
  tags.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));

  // Calculate complexity
  const filesChanged = commit.stats?.filesChanged || commit.filesChanged || 0;
  const complexity = calculateComplexity(filesChanged, tags.length);

  return { tags, complexity };
}

// Main function
function main() {
  const inputPath = process.argv[2] || 'dashboard/commits.json';
  const outputPath = process.argv[3] || inputPath;

  console.log(`\nAI Tagging Script`);
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outputPath}\n`);

  // Read commits
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const commits = data.commits || data;

  console.log(`Processing ${commits.length} commits...\n`);

  let tagged = 0;
  const tagCounts = {};

  // Process each commit
  for (const commit of commits) {
    const result = analyzeCommit(commit);
    commit.tags = result.tags;
    commit.complexity = result.complexity;
    tagged++;

    // Count tags
    for (const tag of result.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  // Write output
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`Tagged ${tagged} commits\n`);
  console.log('Tag breakdown:');
  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
      console.log(`  ${tag}: ${count}`);
    });

  console.log(`\nOutput written to: ${outputPath}`);
}

main();
