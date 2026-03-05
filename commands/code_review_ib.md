---
allowed-tools: Read, Bash, Grep, Glob
argument-hint: [file-path] | [commit-hash] | --full
description: Code review for BMP Internet Banking (React + Vite + Zustand + React Query + Zod)
---

# Code Review - BMP Internet Banking

Review React/TypeScript code against BMP Internet Banking ADS standards: $ARGUMENTS

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

| Rule | Pattern | Example |
|------|---------|---------|
| Folders | `kebab-case` | `user-profile/`, `billing-management/` |
| Components | `kebab-case/index.tsx` | `billing-card/index.tsx` |
| Hooks | `use-*.ts` | `use-auth.ts`, `use-billing-filters.ts` |
| Services | `*.service.ts` | `billing.service.ts`, `user.service.ts` |
| Models (DTOs) | `*.model.ts` | `billing.model.ts`, `user.model.ts` |
| Keys | `*.keys.ts` | `billing.keys.ts` |
| Enums | `kebab-case.enum.ts` | `billing-status.enum.ts` |
| Labels | `kebab-case.label.ts` | `billing-status.label.ts` |
| SCSS Module | `kebab-case.module.scss` | `billing-card.module.scss` |
| Utils | `kebab-case.ts` | `format-date.ts`, `validate-cpf.ts` |

**Structure:**
```
src/
├── features/                    # Feature-based organization
│   └── <feature>/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       ├── schemas/             # Zod validation schemas
│       └── tests/               # Integration tests
├── core/
│   ├── services/
│   │   └── <module>/
│   │       ├── queries/         # React Query - READ (GET)
│   │       ├── mutations/       # React Query - WRITE (POST/PUT/DELETE)
│   │       ├── actions/         # Composed hooks (orchestration)
│   │       ├── models/          # DTOs (Request/Response)
│   │       ├── enums/
│   │       ├── labels/
│   │       ├── <module>.service.ts
│   │       └── <module>.keys.ts
│   └── stores/                  # Zustand global state
└── shared/
    ├── components/ui/
    ├── hooks/
    ├── utils/
    └── constants/
```

### 2. Imports Organization

**Auto-organized by ESLint (`eslint-plugin-simple-import-sort`):**

```tsx
// 1. External libraries
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Absolute imports (@/)
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/core/stores/auth.store';

// 3. Relative imports
import { BillingCard } from '../components/billing-card';

// 4. Styles (always last)
import styles from './billing-page.module.scss';
```

**Critical: Inline type imports (mandatory)**

```tsx
// ✅ CORRECT: inline type imports
import { type User, getUserById } from '@/api/users';

// ❌ WRONG: separate type imports
import type { User } from '@/api/users';
import { getUserById } from '@/api/users';
```

### 3. Component Patterns

**Size limit:** Max **200-250 lines**

**Structure (mandatory order):**

```tsx
// 1. Types/Interfaces
interface BillingCardProps {
  title: string;
  onAction: () => void;
}

// 2. Component
export function BillingCard({ title, onAction }: BillingCardProps) {
  // 2.1. Hooks (always at top)
  const [state, setState] = useState();
  const { data } = useQuery({ ... });

  // 2.2. Callbacks and helpers
  const handleClick = () => onAction();

  // 2.3. Effects (after callbacks)
  useEffect(() => { ... }, []);

  // 2.4. Early returns (validation)
  if (!data) return <Loading />;

  // 2.5. Render
  return <div className={styles.container}>{title}</div>;
}
```

**Exports:**

```tsx
// ✅ ALWAYS: Named exports
export function BillingCard() { ... }

// ❌ AVOID: Default exports (except pages for lazy loading)
export default function BillingCard() { ... }
```

**Props:**

```tsx
// ✅ Interface (not type) for props
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  children: ReactNode;
}

// ✅ Destructuring with default values
export function Button({
  variant = 'primary',
  disabled = false,
  children
}: ButtonProps) { ... }

// ✅ Props with 2+ params: always object
interface UseUserParams {
  id: string;
  includeProfile: boolean;
}
function useUser({ id, includeProfile }: UseUserParams) { ... }

// ❌ AVOID: Positional params
function useUser(id: string, includeProfile: boolean) { ... }
```

### 4. Hooks - Custom Hooks

**Naming:** Always `use` prefix + `camelCase`

**When to create:**
- Logic reused in 2+ components
- Functions > 15-20 lines
- API calls, form handling, click outside, viewport detection
- localStorage operations, toggle states, timers, debounce

**Composition rules:**

```tsx
// ✅ ALLOWED: Built-in hooks + external lib hooks
export function useBillingData(userId: string) {
  // ✅ React built-in hooks
  const [state, setState] = useState();

  // ✅ External lib hooks (React Query, React Hook Form)
  const { data } = useQuery({ ... });
  const { register } = useForm();

  return { data, state };
}

// ❌ AVOID: Custom hooks calling other custom hooks
export function useAuth() {
  const user = useUser(); // ❌ Custom hook from project
  const billing = useBillingData(); // ❌ Custom hook from project
  return { user, billing };
}

// ✅ CORRECT: Compose in component
function Dashboard() {
  const user = useUser();
  const billing = useBillingData();
  return <div>...</div>;
}

// ✅ EXCEPTION: Explicit composition hook
export function useUserData(userId: string) {
  // Explicit purpose: unify related hooks
  const user = useUser(userId);
  const permissions = useUserPermissions(userId);
  const preferences = useUserPreferences(userId);

  return {
    user,
    permissions,
    preferences,
    isFullyLoaded: !!user && !!permissions && !!preferences
  };
}
```

### 5. TypeScript Patterns

**Strictness:**

```tsx
// ❌ NEVER use any
function process(data: any) { ... }

// ❌ NEVER use @ts-ignore
// @ts-ignore
const value = data.something;

// ❌ NEVER use as any
const value = data as any;

// ✅ Use unknown and validate
function process(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
}
```

**Interfaces vs Types:**

| Context | Use | Example |
|---------|-----|---------|
| Props | `interface` | `interface ButtonProps { ... }` |
| DTOs/Models | `interface` | `interface UserResponse { ... }` |
| Union types | `type` | `type Status = 'pending' \| 'approved'` |
| Utility types | `type` | `type PartialUser = Partial<User>` |

**DTOs - Naming pattern (mandatory):**

```tsx
// ✅ Request: data sent to API
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

// ✅ Response: data received from API
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

// Usage
const handleSubmit = async (request: CreateUserRequest) => {
  const user: UserResponse = await createUser(request);
};
```

**Enums - Const objects (mandatory):**

```tsx
// ✅ CORRECT: Const object with as const
export const BillingStatusEnum = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
} as const;

export type BillingStatus = (typeof BillingStatusEnum)[keyof typeof BillingStatusEnum];

// ✅ Labels with Record
export const billingStatusLabels: Record<BillingStatus, string> = {
  [BillingStatusEnum.PENDING]: 'Pendente',
  [BillingStatusEnum.APPROVED]: 'Aprovado',
  [BillingStatusEnum.REJECTED]: 'Rejeitado',
};

// ❌ WRONG: TypeScript enum
enum BillingStatus {
  PENDING = 1,
  APPROVED = 2,
}
```

### 6. State Management

**Local state (useState):**
- Data used only in one component
- UI state (modal open/closed, active tab)
- Simple forms

**Context API:**
- Data shared in component tree
- Theme, auth (feature-specific)
- User preferences

**Zustand (global state):**
- Data accessed across multiple features
- Notifications, global modals
- App configuration

```tsx
// ✅ Zustand store
import { create } from 'zustand';

interface NotificationsStore {
  notifications: Notification[];
  add: (notification: Notification) => void;
  remove: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  notifications: [],
  add: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),
  remove: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
```

### 7. React Query - Server State

**Architecture:**
```
core/services/<module>/
├── <module>.service.ts    # Service base (pure logic)
├── <module>.keys.ts       # Query keys (centralized)
├── queries/               # GET operations (useQuery)
│   └── use-list-*.ts
├── mutations/             # POST/PUT/DELETE (useMutation)
│   └── use-create-*.ts
└── actions/               # Composed hooks (orchestration)
    └── use-*-actions.ts
```

**Service base (pure logic):**

```tsx
// ✅ Service with HttpClient interface (dependency injection)
export class BillingService {
  constructor(private readonly httpClient: HttpClient) {}

  async getBills(params: GetBillsRequest): Promise<GetBillsResponse> {
    return this.httpClient.get<GetBillsResponse>('/bills', { params });
  }
}

// Factory + singleton
export function createBillingService(httpClient: HttpClient): BillingService {
  return new BillingService(httpClient);
}

export const billingService = createBillingService(apiClient);
```

**Query keys (centralized):**

```tsx
// ✅ Centralized in <module>.keys.ts with TSDoc
export const billingKeys = {
  /**
   * Root key. Use to invalidate everything.
   */
  all: ['billing'] as const,

  /**
   * Key for all list queries.
   */
  lists: () => [...billingKeys.all, 'list'] as const,

  /**
   * Key for specific list with filters.
   */
  list: (filters: ListBillsRequest) => [...billingKeys.lists(), filters] as const,

  /**
   * Key for entity details.
   */
  detail: (id: string) => [...billingKeys.all, 'detail', id] as const,
} as const;
```

**Queries (READ - GET):**

```tsx
// ✅ queries/use-list-bills.ts
export function useListBills(
  params: ListBillsRequest = {},
  options?: Omit<UseQueryOptions<BillsResponse[], AppError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: billingKeys.list(params), // ← Centralized key
    queryFn: () => billingService.listBills(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}
```

**Mutations (WRITE - POST/PUT/DELETE):**

```tsx
// ✅ mutations/use-create-bill.ts
export function useCreateBill(
  options?: Omit<UseMutationOptions<BillResponse, AppError, CreateBillRequest>, 'mutationFn'>,
) {
  return useMutation({
    mutationFn: (request: CreateBillRequest) => billingService.createBill(request),
    ...options,
  });
}
```

**Actions (orchestration):**

```tsx
// ✅ actions/use-billing-actions.ts
export function useBillingActions() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  const createMutation = useCreateBill({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.lists() });
    },
    onError: handleError,
  });

  const handleCreate = async (data: CreateBillRequest) => {
    await createMutation.mutateAsync(data);
    toast.success('Bill created successfully');
  };

  return {
    handleCreate,
    isCreating: createMutation.isPending,
  };
}
```

**Critical rules:**

- ✅ `useQuery` **ONLY** for reads (GET)
- ✅ `useMutation` for all writes (POST/PUT/DELETE)
- ✅ Always `reportException` in `onError`
- ✅ Invalidate related queries in `onSuccess`
- ❌ NEVER `useQuery` with `enabled: false` + `refetch` for writes

### 8. Forms - React Hook Form + Zod

**Schema validation:**

```tsx
// ✅ schemas/bill-form.schema.ts
import { z } from 'zod';

export const billFormSchema = z.object({
  amount: z.number({ message: 'Required' }).positive('Must be > 0'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  description: z.string().min(3, 'Min 3 chars').max(200, 'Max 200 chars'),
});

export type BillFormData = z.infer<typeof billFormSchema>;
```

**Form component:**

```tsx
// ✅ Component with React Hook Form + Zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function BillForm({ onSuccess }: Props) {
  const form = useForm<BillFormData>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      amount: undefined,
      dueDate: new Date().toISOString().split('T')[0],
      description: '',
    },
  });

  const onSubmit = async (data: BillFormData) => {
    try {
      await createBill(data);
      form.reset();
      onSuccess?.();
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('amount')} />
      {form.formState.errors.amount && (
        <span>{form.formState.errors.amount.message}</span>
      )}
      <button type="submit" disabled={form.formState.isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

### 9. Styling - SCSS Modules

**Naming:**

```scss
// ✅ billing-card.module.scss - camelCase for classes
.container {
  display: flex;
}

.header {
  padding: 16px;
}

.actionButton {
  padding: 8px 16px;
}
```

**Usage:**

```tsx
import styles from './billing-card.module.scss';

export function BillingCard() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.actionButton}>Action</button>
      </div>
    </div>
  );
}
```

**CSS Variables:**

```scss
// ✅ Use CSS variables
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --font-size-sm: 12px;
  --font-size-md: 14px;
}

.container {
  padding: var(--spacing-md);
  font-size: var(--font-size-md);
}
```

### 10. Error Handling

**Custom error classes:**

```tsx
// ✅ Custom AppError
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public userMessage: string = 'An error occurred',
    public context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Specific errors
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, 'Invalid data', context);
  }
}
```

**Error handling hook:**

```tsx
// ✅ useErrorHandler hook
export function useErrorHandler() {
  const handleError = (error: AppError | unknown) => {
    const appError = error instanceof AppError
      ? error
      : new AppError('UNKNOWN_ERROR', String(error), 500);

    DatadogService.logError(appError);
    toast.error(appError.userMessage);

    return appError;
  };

  return { handleError };
}
```

### 11. Constants - No Magic Numbers

```tsx
// ❌ WRONG: Magic numbers
setTimeout(() => setModal('terms'), 200);
if (password.length < 8) throw new Error('Too short');

// ✅ CORRECT: Constants
// shared/constants/times.constant.ts
export const ONE_SECOND_IN_MS = 1000;
export const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;

export const DELAYS = {
  MODAL_ANIMATION: 200,
  DEBOUNCE_INPUT: 300,
  API_TIMEOUT: 30 * ONE_SECOND_IN_MS,
} as const;

// shared/constants/limits.constant.ts
export const VALIDATION_LIMITS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_SIZE_MB: 10,
} as const;

// Usage
import { DELAYS } from '@/shared/constants/times.constant';
import { VALIDATION_LIMITS } from '@/shared/constants/limits.constant';

setTimeout(() => setModal('terms'), DELAYS.MODAL_ANIMATION);
z.string().min(VALIDATION_LIMITS.MIN_PASSWORD_LENGTH);
```

### 12. Performance

```tsx
// ✅ Lazy loading pages (mandatory)
const DashboardPage = lazy(() => import('@/features/dashboard'));

// ✅ React.memo for stable props
export const BillingCard = memo(function BillingCard({ bill }: Props) {
  return <div>{bill.amount}</div>;
});

// ✅ useMemo for expensive calculations
const total = useMemo(() => {
  return bills.reduce((sum, bill) => sum + bill.amount, 0);
}, [bills]);

// ✅ useCallback for functions as props
const handleEdit = useCallback((id: string) => {
  editBill(id);
}, [editBill]);
```

**When to use:**
- `React.memo`: Components that re-render frequently with same props
- `useMemo`: Complex calculations or data transformations
- `useCallback`: Functions passed as props or as dependencies

**When NOT to use:**
- ❌ Prematurely (measure first)
- ❌ Trivial components
- ❌ Simple primitive values

### 13. Accessibility

```tsx
// ✅ Buttons without visible text
<button aria-label="Close modal">
  <Icon name="close" />
</button>

// ✅ Inputs always with label
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-required="true" />

// ✅ Images with alt
<img src="/logo.png" alt="BMP Internet Banking Logo" />

// ✅ Semantic HTML
<header>
  <nav aria-label="Main navigation">...</nav>
</header>
<main>
  <section aria-labelledby="billing-title">
    <h2 id="billing-title">Billing Management</h2>
  </section>
</main>
```

### 14. Security

```tsx
// ❌ NEVER store tokens in localStorage
localStorage.setItem('token', 'abc123'); // ❌ XSS vulnerable

// ✅ Use httpOnly cookies (backend)
// Or get from secure cookie
const token = getTokenFromCookie();

// ❌ NEVER use dangerouslySetInnerHTML without sanitizing
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // ❌ XSS

// ✅ Sanitize first
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
<div dangerouslySetInnerHTML={{ __html: clean }} /> // ✅ Safe
```

### 15. Testing

**Location:**
- Unit tests: Next to file (`billing-card.test.tsx`)
- Integration tests: `features/<feature>/tests/` directory

**Pattern (AAA):**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';

describe('BillingCard', () => {
  it('should call onEdit when button is clicked', () => {
    // Arrange
    const mockOnEdit = vi.fn();
    const bill = { id: '1', amount: 100 };

    // Act
    render(<BillingCard bill={bill} onEdit={mockOnEdit} />);
    const button = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(button);

    // Assert
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });
});
```

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

- [ ] Folders/files: `kebab-case`
- [ ] Components: named exports
- [ ] Components: ≤250 LOC
- [ ] Props: interface (not type)
- [ ] Props: object with ≥2 params
- [ ] Hooks: no custom hooks calling custom hooks
- [ ] DTOs: Request/Response suffix
- [ ] Enums: const object pattern
- [ ] Services: HttpClient dependency injection
- [ ] Query keys: centralized in `*.keys.ts`
- [ ] `useQuery` only for reads
- [ ] `useMutation` for writes
- [ ] Forms: React Hook Form + Zod
- [ ] Inline type imports: `import { type User }`
- [ ] No magic numbers
- [ ] No `any`, `@ts-ignore`, `as any`
- [ ] SCSS: camelCase classes
- [ ] Error handling: AppError classes
- [ ] Lazy loading: pages
