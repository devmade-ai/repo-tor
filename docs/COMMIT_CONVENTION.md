# Commit Convention Guide

This guide defines the commit message format for consistent, analyzable git history.

## Why Conventional Commits?

Structured commit messages enable:
- **Automated changelog generation**
- **Semantic versioning decisions**
- **Meaningful analytics reports** (feature velocity, bug rates, security posture)
- **Easier code review** (type gives immediate context)
- **Better searchability** in git history

## Commit Message Format

```
type(scope): subject

body

tags: tag1, tag2
refs: #123, PROJ-456
```

### Required: First Line

```
type(scope): subject
```

| Part | Required | Description |
|------|----------|-------------|
| `type` | Yes | Category of change (see types below) |
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

### Optional: Footer

```
tags: security, breaking
refs: #123, PROJ-456
```

- `tags:` - Labels for categorization (security, breaking, dependency, performance)
- `refs:` - Issue/ticket references

## Commit Types

| Type | When to Use | Analytics Impact |
|------|-------------|------------------|
| `feat` | New feature or capability | Progress reports, feature velocity |
| `fix` | Bug fix | Bug rate tracking, quality metrics |
| `security` | Security patch or hardening | Security posture report |
| `docs` | Documentation only | Documentation coverage |
| `style` | Formatting, whitespace (no logic) | Excluded from most metrics |
| `refactor` | Code restructure (no behavior change) | Technical debt indicators |
| `perf` | Performance improvement | Performance tracking |
| `test` | Adding or updating tests | Test coverage proxy |
| `build` | Build system or dependencies | Build health |
| `ci` | CI/CD configuration | Pipeline health |
| `chore` | Maintenance tasks | Overhead tracking |
| `revert` | Reverting previous commit | Stability indicators |

## Special Tags

Add these to the `tags:` line when applicable:

| Tag | When to Use |
|-----|-------------|
| `security` | Any security-related change (even if type is `fix`) |
| `breaking` | Breaking change requiring migration |
| `dependency` | Dependency update |
| `performance` | Performance-impacting change |

## Breaking Changes

For breaking changes, either:

1. Add `!` after the type:
   ```
   feat(api)!: change response format to JSON:API spec
   ```

2. Or add `BREAKING CHANGE:` in the body:
   ```
   feat(api): change response format

   BREAKING CHANGE: Response now uses JSON:API spec.
   Clients must update their parsing logic.
   ```

## Examples by Type

### Features
```
feat(cart): add quantity selector to cart items
feat(search): implement fuzzy search for products
feat: add user preference export functionality
```

### Bug Fixes
```
fix(checkout): prevent double-submit on slow connections
fix(auth): handle expired tokens gracefully
fix: resolve memory leak in image gallery
```

### Security
```
security(auth): patch session fixation vulnerability
security: sanitize user input in search queries
fix(upload): validate file types server-side

tags: security
```

### Documentation
```
docs(api): add authentication examples
docs: update changelog for v2.0
docs(readme): add troubleshooting section
```

### Refactoring
```
refactor(api): extract validation into middleware
refactor: simplify date formatting logic
refactor(tests): use factory pattern for fixtures
```

### Chores
```
chore(deps): upgrade React to 18.2
chore: update .gitignore for IDE files
chore(ci): add Node 20 to test matrix
```

## Scope Suggestions

Use consistent scope names across your project:

| Scope | Description |
|-------|-------------|
| `api` | API endpoints, requests |
| `auth` | Authentication, authorization |
| `ui` | User interface components |
| `db` | Database, migrations |
| `config` | Configuration files |
| `deps` | Dependencies |
| `ci` | CI/CD pipelines |
| `tests` | Test infrastructure |

## Quick Reference

```
# Feature
feat(scope): add new capability

# Bug fix
fix(scope): correct specific behavior

# Security
security: address vulnerability

# Documentation
docs: update documentation

# Refactor
refactor(scope): improve code structure

# Test
test(scope): add test coverage

# Chore
chore(scope): maintenance task

# With breaking change
feat(api)!: breaking change description

# With tags and refs
fix(auth): description

tags: security
refs: #123
```

## Commit Message Checklist

Before committing, verify:

- [ ] Type accurately describes the change category
- [ ] Subject is imperative mood ("add" not "added" or "adds")
- [ ] Subject is under 72 characters
- [ ] Body explains WHY, not just WHAT (for non-trivial changes)
- [ ] Security-related changes have `security` type or tag
- [ ] Breaking changes are marked with `!` or `BREAKING CHANGE:`
- [ ] Issue references are included when applicable

---

*This convention is based on [Conventional Commits](https://www.conventionalcommits.org/) v1.0.0*
