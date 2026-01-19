# Commit Convention Guide

This guide defines the commit message format for consistent, analyzable git history.

## Commit Message Format

```
type(scope): subject

body

tags: tag1, tag2, tag3
urgency: 1-5
impact: internal|user-facing|infrastructure|api
refs: #123, PROJ-456
```

### Required: First Line

```
type(scope): subject
```

| Part | Required | Description |
|------|----------|-------------|
| `type` | Yes | General category (see types below) |
| `scope` | No | Module, component, or area affected |
| `subject` | Yes | Imperative description (max 72 chars) |

**Examples:**
```
feat(auth): add OAuth2 login support
fix(api): handle timeout errors in fetch requests
docs: update README with installation steps
chore(deps): upgrade lodash to 4.17.21
```

### Optional: Body

Explain **why** the change was made, not what (the diff shows what).

```
feat(dashboard): add dark mode toggle

Users requested dark mode for reduced eye strain during night usage.
This adds a toggle in settings that persists to localStorage.
```

### Required: Tags Footer

**Use multiple tags from the playbook's 55+ tag list.** This enables consistent tagging between manual commits and AI analysis.

```
tags: feature, ui, ux
```

Always ask: "What work was done in this commit?" Then apply ALL relevant tags.

### Optional: Metadata Footers

For richer analytics, add urgency and impact:

```
tags: bugfix, performance
urgency: 4
impact: user-facing
```

These help track reactive vs planned work and where effort goes.

## Commit Types (First Line)

General categories for the subject line:

| Type | When to Use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `refactor` | Code restructure |
| `test` | Test changes |
| `chore` | Maintenance, deps, config |
| `perf` | Performance improvement |
| `style` | Formatting only |
| `ci` | CI/CD changes |
| `revert` | Reverting previous commit |

## Tags (Footer) - Use Multiple!

Tags provide detailed categorization. **Always assign ALL that apply.**

See `docs/EXTRACTION_PLAYBOOK.md` for the complete 55+ tag list. Key tags:

### User-Facing Work
| Tag | What work was done |
|-----|-------------------|
| `feature` | Built something new for users |
| `enhancement` | Improved existing functionality |
| `bugfix` | Fixed broken behavior |
| `hotfix` | Urgent production fix |
| `ui` | Visual/interface changes |
| `ux` | User experience improvements |

### Code Changes
| Tag | What work was done |
|-----|-------------------|
| `refactor` | Restructured code |
| `simplify` | Reduced complexity |
| `removal` | Deleted dead code/files |
| `migration` | Migrated to new approach |
| `naming` | Renamed things |
| `types` | Type definitions |

### Performance
| Tag | What work was done |
|-----|-------------------|
| `performance` | Speed improvements |
| `memory` | Memory optimization |
| `caching` | Caching improvements |

### Security
| Tag | What work was done |
|-----|-------------------|
| `security` | General security work |
| `auth` | Authentication changes |
| `vulnerability` | Fixed vulnerability |
| `sanitization` | Input validation |

### Testing
| Tag | What work was done |
|-----|-------------------|
| `test-unit` | Unit tests |
| `test-integration` | Integration tests |
| `test-e2e` | End-to-end tests |
| `test-fix` | Fixed broken tests |

### Documentation
| Tag | What work was done |
|-----|-------------------|
| `docs` | Documentation files |
| `changelog` | Changelog updates |
| `comments` | Code comments |
| `examples` | Code examples |

### Infrastructure
| Tag | What work was done |
|-----|-------------------|
| `ci` | CI pipelines |
| `cd` | Deployment automation |
| `docker` | Containerization |
| `monitoring` | Logging/observability |

### Build & Config
| Tag | What work was done |
|-----|-------------------|
| `build` | Build system |
| `config` | App configuration |
| `lint` | Linter rules |

### Dependencies
| Tag | What work was done |
|-----|-------------------|
| `dependency-add` | Added dependency |
| `dependency-update` | Upgraded dependency |
| `dependency-remove` | Removed dependency |

### Git/Process
| Tag | What work was done |
|-----|-------------------|
| `merge` | Merge commit |
| `revert` | Reverted change |
| `release` | Version bump |

## Breaking Changes

Add `!` after the type:
```
feat(api)!: change response format to JSON:API spec

BREAKING CHANGE: Response now uses JSON:API spec.

tags: api, api-breaking, migration
```

## Examples with Multiple Tags

### Feature with UI work
```
feat(dashboard): add dark mode toggle

Users requested dark mode for reduced eye strain.
Adds toggle in settings, persists to localStorage.

tags: feature, ui, ux, config
urgency: 1
impact: user-facing
```

### Bug fix with security implications
```
fix(auth): sanitize user input in login form

Prevents XSS attack via username field.

tags: bugfix, security, vulnerability, sanitization
urgency: 5
impact: user-facing
```

### Refactor with test updates
```
refactor(api): extract validation into middleware

Centralizes validation logic for all endpoints.
Updated tests to use new middleware.

tags: refactor, simplify, test-fix
urgency: 1
impact: internal
```

### Documentation update
```
docs: update extraction playbook with batch processing

Added human-in-the-loop review workflow.
Documented 55+ tags for commit analysis.

tags: docs, examples
impact: internal
```

### Dependency upgrade
```
chore(deps): upgrade React to v19

Updated all components for new API.
Fixed breaking changes in hooks.

tags: dependency-update, migration, refactor
complexity: 4
impact: internal
```

### Performance fix
```
perf(dashboard): optimize chart rendering

Charts now use virtual scrolling for large datasets.
Reduces initial render time by 60%.

tags: performance, ux, refactor
urgency: 3
impact: user-facing
```

## Metadata Indicators (Optional)

For richer analytics, add these optional footers to your commits.

### Complexity (1-5)

How big/difficult was this change?

| Score | Description |
|-------|-------------|
| 1 | Trivial - single file, minor change |
| 2 | Small - few files, straightforward |
| 3 | Medium - multiple files, moderate |
| 4 | Large - many files, significant |
| 5 | Major - extensive, high complexity |

### Urgency (1-5)

How critical was this change? Reactive vs planned work.

| Score | Level | When to Use |
|-------|-------|-------------|
| 1 | Planned | Scheduled work, no time pressure |
| 2 | Normal | Regular development pace (default) |
| 3 | Elevated | Needs attention soon, affecting some users |
| 4 | Urgent | High priority, blocking work |
| 5 | Critical | Production down, security vulnerability |

**Tip:** Most commits are urgency 2. Only increase for time-sensitive work.

### Impact

Who/what is affected by this change?

| Value | When to Use |
|-------|-------------|
| `internal` | Only affects developers (tests, refactoring, docs, tooling) |
| `user-facing` | Directly affects end users (UI, features, bug fixes) |
| `infrastructure` | Affects deployment/operations (CI/CD, Docker, monitoring) |
| `api` | Affects external integrations (endpoints, breaking changes) |

### Full Example

```
feat(auth): implement OAuth2 flow

Full OAuth2 implementation with token refresh.
Replaces legacy session-based auth.

tags: feature, auth, security, api, migration
complexity: 4
urgency: 2
impact: user-facing
```

## Quick Reference

```
# Feature (planned work)
feat(scope): add new capability

tags: feature, ui
impact: user-facing

# Bug fix (normal priority)
fix(scope): correct specific behavior

tags: bugfix
impact: user-facing

# Security fix (critical!)
fix(auth): patch vulnerability

tags: bugfix, security, vulnerability
urgency: 5
impact: user-facing

# Production hotfix
fix(api): restore service after timeout

tags: hotfix, bugfix, performance
urgency: 5
impact: infrastructure

# Documentation (internal)
docs: update guides

tags: docs
impact: internal

# Refactor (planned, internal)
refactor(scope): improve structure

tags: refactor, simplify
urgency: 1
impact: internal

# API endpoint (affects integrations)
feat(api): add endpoint with validation

tags: feature, endpoint, api, validation
impact: api
```

## Commit Checklist

Before committing:

- [ ] Type accurately describes the general category
- [ ] Subject is imperative mood ("add" not "added")
- [ ] Subject is under 72 characters
- [ ] Body explains WHY (for non-trivial changes)
- [ ] `tags:` line includes ALL relevant tags (use multiple!)
- [ ] Breaking changes marked with `!` and `BREAKING CHANGE:`
- [ ] Issue refs included when applicable

**Optional but recommended:**
- [ ] `urgency:` added for time-sensitive work (3-5)
- [ ] `impact:` specified (internal/user-facing/infrastructure/api)
- [ ] `complexity:` added for significant changes (3-5)

---

*All metadata aligns with `docs/EXTRACTION_PLAYBOOK.md` for consistent AI analysis*
