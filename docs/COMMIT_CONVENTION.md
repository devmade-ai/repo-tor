# Commit Convention Guide

This guide defines the commit message format for consistent, analyzable git history.

## Commit Message Format

```
type(scope): subject

body

tags: tag1, tag2, tag3
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
```

### Bug fix with security implications
```
fix(auth): sanitize user input in login form

Prevents XSS attack via username field.

tags: bugfix, security, vulnerability, sanitization
```

### Refactor with test updates
```
refactor(api): extract validation into middleware

Centralizes validation logic for all endpoints.
Updated tests to use new middleware.

tags: refactor, simplify, test-fix
```

### Documentation update
```
docs: update extraction playbook with batch processing

Added human-in-the-loop review workflow.
Documented 55+ tags for commit analysis.

tags: docs, examples
```

### Dependency upgrade
```
chore(deps): upgrade React to v19

Updated all components for new API.
Fixed breaking changes in hooks.

tags: dependency-update, migration, refactor
```

### Performance fix
```
perf(dashboard): optimize chart rendering

Charts now use virtual scrolling for large datasets.
Reduces initial render time by 60%.

tags: performance, ux, refactor
```

## Complexity Indicator (Optional)

For significant changes, add complexity (1-5) to help future analysis:

```
feat(auth): implement OAuth2 flow

Full OAuth2 implementation with token refresh.

tags: feature, auth, security, api
complexity: 4
```

| Score | Description |
|-------|-------------|
| 1 | Trivial - single file, minor change |
| 2 | Small - few files, straightforward |
| 3 | Medium - multiple files, moderate |
| 4 | Large - many files, significant |
| 5 | Major - extensive, high complexity |

## Quick Reference

```
# Feature
feat(scope): add new capability

tags: feature, ui

# Bug fix
fix(scope): correct specific behavior

tags: bugfix

# Security fix
fix(auth): patch vulnerability

tags: bugfix, security, vulnerability

# Documentation
docs: update guides

tags: docs

# Refactor with tests
refactor(scope): improve structure

tags: refactor, simplify, test-unit

# Dependency update
chore(deps): upgrade library

tags: dependency-update

# Multiple concerns
feat(api): add endpoint with validation

tags: feature, endpoint, api, validation
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

---

*Tags align with `docs/EXTRACTION_PLAYBOOK.md` for consistent AI analysis*
