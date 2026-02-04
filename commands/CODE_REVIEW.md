---
allowed-tools: Read, Bash, Grep, Glob
argument-hint: [file-path] | [commit-hash] | --full
description: Comprehensive code quality review with security, performance, and architecture analysis
---

# Code Quality Review

Review React/React Native code against Front-End Guild standards: $ARGUMENTS

## Constraints

- Only flag issues from the checklist below
- Every issue requires a before/after code example
- Include file path and line numbers
- Prioritize by severity: critical > high > medium > low
- Keep explanations beginner-friendly

## Step 1: Determine Scope

**Scope rules:**
- File path provided → review that file
- Commit hash provided → review files in that commit
- `--full` or nothing → review changed files vs main branch

**Execute:**

```bash
ARGS="$ARGUMENTS"
if [[ -f "$ARGS" ]]; then
  echo "$ARGS"
elif git cat-file -e "$ARGS^{commit}" 2>/dev/null; then
  git diff-tree --no-commit-id --name-only -r "$ARGS" | grep -E '\.(tsx?|jsx?)$'
else
  MAIN=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")
  git diff --name-only "$MAIN"...HEAD | grep -E '\.(tsx?|jsx?)$'
fi
```

## Step 2: For Each File

1. Read full file content
2. View diff: `git diff main...HEAD -- <file-path>`
3. Apply checklist below
4. Document findings with line numbers

---

## Review Checklist

### 1. File Structure & Naming

| Rule | Example |
|------|---------|
| Folders: `kebab-case` | `user-profile/`, `shopping-cart/` |
| Components: `PascalCase.tsx` | `Modal.tsx`, `UserCard.tsx` |
| No `index.tsx` for components | Use explicit names like `Modal.tsx` |
| Types colocated in same file | Only separate `types.ts` for shared types |
| State: `camelCase` | `isLoading`, `userList` |
| Handlers: `handle*` / `on*` | `handleClick`, `onSubmit` |

### 2. Component Size & Organization

- **Max 250 lines per component** - extract to hooks or subcomponents if exceeded
- **Extract custom hooks for:** API calls, form handling, click outside, viewport detection, local storage, toggle states, timers, debounce
- **Never call custom hooks inside other custom hooks** - compose at component level

### 3. Data & Mapping

- Repetitive JSX → use `.map()` with unique `key` props
- Hardcoded repeated data → extract to array of objects

### 4. Semantic HTML

Replace `<div>` with: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`, `<button>`, `<form>`

### 5. Accessibility

- All `<img>` must have `alt`
- ARIA labels where needed
- Keyboard navigation support

### 6. TypeScript

**Forbidden:**
- `// @ts-ignore`
- `any` type
- `as any` casting

**Required patterns:**

```tsx
// Enums: use const object, not enum keyword
const STATUS_ENUM = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' } as const
type Status = (typeof STATUS_ENUM)[keyof typeof STATUS_ENUM]

// Props: always use type, not interface
type ButtonProps = {
  label: string
  onClick: () => void
}

// Hooks with 2+ params: use object
type UseUserParams = { id: string; includeProfile: boolean }
const useUser = ({ id, includeProfile }: UseUserParams) => { ... }
```

### 7. React Patterns

**Early return (required order):**
```tsx
if (isPending) return <Spinner />
if (isError) return <Error />
if (!data) return <Empty />
return <Content data={data} />
```

**Props:** 2+ parameters must be typed object with destructuring

**Hooks:** Always destructure return values

### 8. React Query

| Operation | Hook | Required |
|-----------|------|----------|
| GET (read) | `useQuery` | `reportException` in `onError` |
| POST/PUT/DELETE | `useMutation` | Invalidate queries in `onSuccess` |

**Never:** `useQuery` with `enabled: false` + `refetch` for writes

### 9. Styling

**TailwindCSS:**
```tsx
// Same width/height → use size-*
className="size-4"      // not "w-4 h-4"
className="size-full"   // not "w-full h-full"
```

**React Native:** Never use `RFValue` - use design system tokens with fixed values

**No inline styles** except for dynamic values based on state/props

### 10. Constants

```tsx
// Use declarative units
const CACHE_DURATION = 1 * ONE_HOUR    // not 3600
const RETRY_DELAY = 5 * ONE_SECOND     // not 5000
const MAX_SIZE = 10 * ONE_MB           // not 10485760
```

**API communication:** `snake_case` to/from backend, `camelCase` internally

### 11. Code Organization

- Pure JS functions → `utils/` folder
- API endpoints → `config/api.ts`
- Route paths → `config/routes.ts`

### 12. Documentation

TODOs must have task reference: `// TODO: [Description] - [TASK-123]`

### 13. Security

- No hardcoded secrets/API keys
- Input validation and sanitization
- No XSS/injection vulnerabilities

### 14. Performance

- Identify bottlenecks
- Check for memory leaks
- Use `React.memo`, `useMemo`, `useCallback` where beneficial

---

## Output Format

For each issue:

### Issue: [Category] - [Brief description]

**File:** `path/to/file.tsx:42`

**Severity:** critical | high | medium | low

**You wrote:**
```tsx
// problematic code
```

**Should be:**
```tsx
// corrected code
```

**Why:** One sentence explanation.

---

## Final Summary

After reviewing all files, output:

```markdown
## Review Summary

**Files reviewed:** [count]
**Issues found:** [critical: X, high: X, medium: X, low: X]

### Critical Issues
- [ ] Issue description (file:line)

### High Priority
- [ ] Issue description (file:line)

### Medium Priority
- [ ] Issue description (file:line)

### Low Priority
- [ ] Issue description (file:line)

### Recommendations
1. ...
2. ...
```

---

## Quick Checklist

Before finalizing, verify:

- [ ] Folders: `kebab-case`
- [ ] No `index.tsx` components
- [ ] Types in same file
- [ ] Components ≤250 LOC
- [ ] Props as objects (≥2 params)
- [ ] Hook returns destructured
- [ ] Early return pattern
- [ ] `useQuery` for reads only
- [ ] `useMutation` for writes
- [ ] `reportException` in `onError`
- [ ] Const object enums
- [ ] Unit constants
- [ ] `snake_case` API calls
- [ ] TODOs have task refs
- [ ] No nested custom hooks
- [ ] No `RFValue`
- [ ] `size-*` for equal w/h
