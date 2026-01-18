#!/usr/bin/env node
/**
 * Git Analytics Extraction Script
 *
 * Extracts commit data from a git repository and outputs structured JSON
 * for the analytics dashboard.
 *
 * Usage: node extract.js [repo-path] [--output=reports/]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// === Configuration ===
const CONVENTIONAL_TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor',
  'perf', 'test', 'build', 'ci', 'chore', 'revert', 'security'
];

const KEYWORD_PATTERNS = {
  feat: /\b(add|adds|added|adding|new|create|creates|created|implement|implements|implemented)\b/i,
  fix: /\b(fix|fixes|fixed|fixing|bug|bugs|patch|patches|patched|resolve|resolves|resolved)\b/i,
  security: /\b(security|secure|vulnerability|vulnerabilities|cve|xss|csrf|injection|auth|authentication)\b/i,
  docs: /\b(doc|docs|documentation|readme|guide|comment|comments)\b/i,
  refactor: /\b(refactor|refactors|refactored|refactoring|restructure|reorganize|cleanup|clean\s*up)\b/i,
  test: /\b(test|tests|testing|spec|specs|coverage)\b/i,
  chore: /\b(chore|chores|maintenance|maintain|update|updates|updated|upgrade|upgrades|bump|bumps)\b/i,
  perf: /\b(perf|performance|optimize|optimizes|optimized|optimization|speed|faster)\b/i,
  ci: /\b(ci|cd|pipeline|workflow|github\s*action|travis|jenkins|circleci)\b/i,
  build: /\b(build|builds|webpack|rollup|bundle|compile|compiles)\b/i,
};

// === Argument Parsing ===
const args = process.argv.slice(2);
let repoPath = process.cwd();
let outputDir = 'reports';

args.forEach(arg => {
  if (arg.startsWith('--output=')) {
    outputDir = arg.split('=')[1];
  } else if (!arg.startsWith('--')) {
    repoPath = path.resolve(arg);
  }
});

// === Git Command Execution ===
function git(command, options = {}) {
  try {
    const result = execSync(`git ${command}`, {
      cwd: repoPath,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large repos
      ...options
    });
    return result.trim();
  } catch (error) {
    console.error(`Git command failed: git ${command}`);
    console.error(error.message);
    return '';
  }
}

// === Commit Message Parsing ===
function parseCommitType(subject) {
  // Try conventional commit format: type(scope): subject
  const conventionalMatch = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);

  if (conventionalMatch) {
    const [, type, scope, breaking, title] = conventionalMatch;
    if (CONVENTIONAL_TYPES.includes(type.toLowerCase())) {
      return {
        type: type.toLowerCase(),
        scope: scope || null,
        breaking: !!breaking,
        title: title,
        is_conventional: true
      };
    }
  }

  // Fallback to keyword detection
  for (const [type, pattern] of Object.entries(KEYWORD_PATTERNS)) {
    if (pattern.test(subject)) {
      return {
        type,
        scope: null,
        breaking: false,
        title: subject,
        is_conventional: false
      };
    }
  }

  // Default to 'other' if no pattern matches
  return {
    type: 'other',
    scope: null,
    breaking: false,
    title: subject,
    is_conventional: false
  };
}

function extractTags(body) {
  const tags = [];

  // Check for explicit tags line
  const tagsMatch = body.match(/^tags?:\s*(.+)$/im);
  if (tagsMatch) {
    tags.push(...tagsMatch[1].split(/[,\s]+/).filter(Boolean));
  }

  // Check for security-related keywords
  if (/\b(security|cve|vulnerability|xss|csrf|injection)\b/i.test(body)) {
    if (!tags.includes('security')) tags.push('security');
  }

  // Check for breaking change indicators
  if (/\bBREAKING\s*CHANGE\b/i.test(body) || /^BREAKING:/im.test(body)) {
    if (!tags.includes('breaking')) tags.push('breaking');
  }

  // Check for dependency updates
  if (/\b(dependency|dependencies|npm|yarn|package\.json)\b/i.test(body)) {
    if (!tags.includes('dependency')) tags.push('dependency');
  }

  return tags;
}

function extractReferences(text) {
  const refs = [];

  // GitHub/GitLab style: #123
  const hashRefs = text.match(/#\d+/g) || [];
  refs.push(...hashRefs);

  // Jira style: PROJ-123
  const jiraRefs = text.match(/[A-Z]+-\d+/g) || [];
  refs.push(...jiraRefs);

  // Explicit refs line
  const refsMatch = text.match(/^refs?:\s*(.+)$/im);
  if (refsMatch) {
    const lineRefs = refsMatch[1].match(/(#\d+|[A-Z]+-\d+)/g) || [];
    refs.push(...lineRefs);
  }

  return [...new Set(refs)]; // Deduplicate
}

// === Data Extraction ===
function extractCommits() {
  console.log('Extracting commits...');

  // Custom format for parsing
  const delimiter = '---COMMIT_DELIMITER---';
  const format = [
    '%H',      // full hash
    '%h',      // short hash
    '%an',     // author name
    '%ae',     // author email
    '%aI',     // author date ISO
    '%cn',     // committer name
    '%ce',     // committer email
    '%cI',     // commit date ISO
    '%s',      // subject
    '%b',      // body
  ].join('%n');

  const logOutput = git(`log --all --pretty=format:'${format}${delimiter}'`);

  if (!logOutput) {
    console.log('No commits found or git log failed');
    return [];
  }

  const commitBlocks = logOutput.split(delimiter).filter(Boolean);
  const commits = [];

  for (const block of commitBlocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 9) continue;

    const [hash, shortHash, authorName, authorEmail, authorDate,
           committerName, committerEmail, commitDate, subject, ...bodyLines] = lines;

    const body = bodyLines.join('\n').trim();
    const parsed = parseCommitType(subject);
    const tags = extractTags(body);
    const references = extractReferences(subject + '\n' + body);

    // Add breaking tag if detected in parsing
    if (parsed.breaking && !tags.includes('breaking')) {
      tags.push('breaking');
    }

    commits.push({
      sha: shortHash,
      fullSha: hash,
      author_id: authorEmail.toLowerCase(),
      author: {
        name: authorName,
        email: authorEmail
      },
      committer: {
        name: committerName,
        email: committerEmail
      },
      timestamp: authorDate,
      commitDate: commitDate,
      subject: subject,
      body: body,
      type: parsed.type,
      scope: parsed.scope,
      title: parsed.title,
      is_conventional: parsed.is_conventional,
      tags: tags,
      references: references
    });
  }

  // Get stats for each commit (this is slower, so we do it separately)
  console.log(`Extracting stats for ${commits.length} commits...`);

  for (let i = 0; i < commits.length; i++) {
    if (i % 50 === 0 && i > 0) {
      console.log(`  Processed ${i}/${commits.length} commits...`);
    }

    const commit = commits[i];
    const statsOutput = git(`show ${commit.fullSha} --stat --format=''`);

    // Parse stats from output like: "2 files changed, 10 insertions(+), 5 deletions(-)"
    const statsMatch = statsOutput.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);

    commit.stats = {
      filesChanged: statsMatch ? parseInt(statsMatch[1]) || 0 : 0,
      additions: statsMatch ? parseInt(statsMatch[2]) || 0 : 0,
      deletions: statsMatch ? parseInt(statsMatch[3]) || 0 : 0
    };

    // Extract changed files
    const filesOutput = git(`show ${commit.fullSha} --name-only --format=''`);
    commit.files = filesOutput.split('\n').filter(Boolean);
  }

  return commits;
}

function extractContributors(commits) {
  console.log('Aggregating contributors...');

  const contributorMap = new Map();

  for (const commit of commits) {
    const key = commit.author.email.toLowerCase();

    if (!contributorMap.has(key)) {
      contributorMap.set(key, {
        author_id: key,
        email: commit.author.email,
        names: new Set([commit.author.name]),
        commits: 0,
        additions: 0,
        deletions: 0,
        firstCommit: commit.timestamp,
        lastCommit: commit.timestamp,
        types: {}
      });
    }

    const contributor = contributorMap.get(key);
    contributor.names.add(commit.author.name);
    contributor.commits++;
    contributor.additions += commit.stats.additions;
    contributor.deletions += commit.stats.deletions;
    contributor.types[commit.type] = (contributor.types[commit.type] || 0) + 1;

    if (commit.timestamp < contributor.firstCommit) {
      contributor.firstCommit = commit.timestamp;
    }
    if (commit.timestamp > contributor.lastCommit) {
      contributor.lastCommit = commit.timestamp;
    }
  }

  return Array.from(contributorMap.values()).map(c => ({
    ...c,
    names: Array.from(c.names),
    primaryName: Array.from(c.names)[0]
  })).sort((a, b) => b.commits - a.commits);
}

function buildAuthorsMap(contributors) {
  const authors = {};
  for (const contributor of contributors) {
    authors[contributor.author_id] = {
      name: contributor.primaryName,
      email: contributor.email,
      emails: [contributor.email]
    };
  }
  return authors;
}

function extractFileStats(commits) {
  console.log('Calculating file statistics...');

  const fileMap = new Map();

  for (const commit of commits) {
    for (const file of commit.files) {
      if (!fileMap.has(file)) {
        fileMap.set(file, {
          path: file,
          changeCount: 0,
          commitTypes: {},
          authors: new Set()
        });
      }

      const fileStats = fileMap.get(file);
      fileStats.changeCount++;
      fileStats.commitTypes[commit.type] = (fileStats.commitTypes[commit.type] || 0) + 1;
      fileStats.authors.add(commit.author.email);
    }
  }

  return Array.from(fileMap.values())
    .map(f => ({
      ...f,
      authors: Array.from(f.authors)
    }))
    .sort((a, b) => b.changeCount - a.changeCount);
}

function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateMetadata() {
  const repoName = path.basename(repoPath);
  const repoId = toKebabCase(repoName);
  const remoteUrl = git('config --get remote.origin.url') || 'local';
  const currentBranch = git('rev-parse --abbrev-ref HEAD');
  const branches = git('branch -a --format="%(refname:short)"').split('\n').filter(Boolean);

  return {
    repo_id: repoId,
    repository: repoName,
    remoteUrl: remoteUrl,
    currentBranch: currentBranch,
    branches: branches,
    extractedAt: new Date().toISOString(),
    repoPath: repoPath
  };
}

function generateSummary(commits, contributors) {
  const typeBreakdown = {};
  const monthlyCommits = {};
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const commit of commits) {
    // Type breakdown
    typeBreakdown[commit.type] = (typeBreakdown[commit.type] || 0) + 1;

    // Monthly aggregation
    const month = commit.timestamp.substring(0, 7); // YYYY-MM
    if (!monthlyCommits[month]) {
      monthlyCommits[month] = { total: 0, types: {} };
    }
    monthlyCommits[month].total++;
    monthlyCommits[month].types[commit.type] = (monthlyCommits[month].types[commit.type] || 0) + 1;

    // Totals
    totalAdditions += commit.stats.additions;
    totalDeletions += commit.stats.deletions;
  }

  // Security commits with details
  const securityCommits = commits.filter(c =>
    c.type === 'security' || c.tags.includes('security')
  );

  const security_events = securityCommits.map(c => ({
    sha: c.sha,
    subject: c.subject,
    timestamp: c.timestamp,
    author_id: c.author_id,
    repo_id: c.repo_id
  }));

  return {
    totalCommits: commits.length,
    totalContributors: contributors.length,
    totalAdditions,
    totalDeletions,
    netLinesChanged: totalAdditions - totalDeletions,
    typeBreakdown,
    monthlyCommits,
    securityCommitCount: securityCommits.length,
    security_events,
    dateRange: {
      earliest: commits.length > 0 ? commits[commits.length - 1].timestamp : null,
      latest: commits.length > 0 ? commits[0].timestamp : null
    }
  };
}

// === Main Execution ===
function main() {
  console.log(`\nGit Analytics Extraction`);
  console.log(`Repository: ${repoPath}`);
  console.log(`Output: ${outputDir}\n`);

  // Verify git repository
  const gitDir = git('rev-parse --git-dir');
  if (!gitDir) {
    console.error('Error: Not a git repository');
    process.exit(1);
  }

  // Extract all data
  const metadata = generateMetadata();
  const commits = extractCommits();

  // Add repo_id to each commit for aggregation support
  for (const commit of commits) {
    commit.repo_id = metadata.repo_id;
  }

  const contributors = extractContributors(commits);
  const files = extractFileStats(commits);
  const summary = generateSummary(commits, contributors);

  // Build authors map and add to metadata
  const authors = buildAuthorsMap(contributors);
  metadata.authors = authors;

  // Create output directory
  const repoOutputDir = path.join(outputDir, metadata.repository);
  fs.mkdirSync(repoOutputDir, { recursive: true });

  // Write JSON files
  const writeJson = (filename, data) => {
    const filepath = path.join(repoOutputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Wrote ${filepath}`);
  };

  writeJson('metadata.json', metadata);
  writeJson('commits.json', { commits });
  writeJson('contributors.json', contributors);
  writeJson('files.json', files);
  writeJson('summary.json', summary);

  // Write combined data file for dashboard
  writeJson('data.json', {
    metadata,
    commits,
    contributors,
    files,
    summary
  });

  console.log(`\nExtraction complete!`);
  console.log(`  Commits: ${commits.length}`);
  console.log(`  Contributors: ${contributors.length}`);
  console.log(`  Files tracked: ${files.length}`);
  console.log(`\nData written to: ${repoOutputDir}/`);
}

main();
