# Phase 5 — Input Focus & React Re-render Glitch Report

**Status:** PASS
**Date:** 2026-10-09
**Module:** Modal & Form Input Focus (`src/components/ui/Modal/Modal.tsx`, `src/pages/dashboard/budget-manager/BudgetManager.tsx`)

---

## 1. Overview & Problem Description

When users typed into numeric inputs inside modals (e.g. entering `0.001` into the Amount field in the Create/Edit Budget modal), typing each character caused:
1. The field to lose focus or outline to change unexpectedly.
2. The user was forced to click back into the input field after typing a single character.
3. React logged minified warning/error traces.

---

## 2. Root Cause Investigation

### A. The Dependency Loop in `Modal.tsx`
In `src/components/ui/Modal/Modal.tsx`:
```tsx
const handleKeyDown = useCallback(
  (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    // ...
  },
  [onClose]
);

useEffect(() => {
  if (isOpen) {
    // ...
    requestAnimationFrame(() => {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(...);
      firstFocusable?.focus();
    });
  }
  return () => { ... };
}, [isOpen, handleKeyDown]);
```

In `BudgetManager.tsx`:
```tsx
<Modal
  isOpen={showCreate}
  onClose={() => {
    setShowCreate(false);
    setEditingBudgetId(null);
  }}
>
```

When a user typed `0` in `<input value={form.amount} onChange={...} />`:
1. `setForm` updated the component state.
2. `BudgetManager` re-rendered.
3. An entirely new arrow function instance `() => { setShowCreate(false); ... }` was passed to `Modal` as `onClose`.
4. In `Modal`, `handleKeyDown` was re-instantiated because `onClose` changed.
5. In `Modal`, `useEffect` had `[isOpen, handleKeyDown]` in its dependency array.
6. The entire effect cleaned up and re-ran.
7. Its setup invoked `requestAnimationFrame(() => firstFocusable.focus())`.
8. `firstFocusable` (the modal close `X` button or the first input) was forcibly focused!
9. Focus was snatched away from the `Amount` field on EVERY keystroke!

### B. HTML5 Input Step Validation
The input was `<input type="number" value={form.amount} />` without `step="any"` or `step="0.001"`. The default HTML5 number input step is `1`, causing browser-level step mismatch warnings when entering decimals like `0.001`.

---

## 3. Exact Fixes Applied

### A. Refactored `Modal.tsx` Focus & Effect Management
1. Created an `onCloseRef` (`onCloseRef.current = onClose`) to keep `onClose` accessible without making listeners or effects depend on its reference.
2. Added a `wasOpenRef` to track open transitions:
   - Auto-focus now runs **strictly once** when `isOpen` transitions from `false` to `true`.
   - Re-renders of `Modal` while open **never** re-trigger auto-focus or steal cursor focus.
3. Separated the keyboard event listener into its own stable effect.

### B. HTML5 Step Attribute
In `BudgetManager.tsx`, updated the amount input:
```tsx
<input
  className={styles.input}
  type="number"
  step="any"
  min="0.001"
  value={form.amount}
  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
  placeholder="10.00"
  required
/>
```

---

## 4. Verification & Testing

- User can now click the Amount field once and type `0.001`, `0.005`, `10.25`, or any decimal amount continuously without any interruption.
- Cursor remains exactly where it was.
- Backspace, delete, copy-paste, and arrow keys function normally.
- Modal only auto-focuses upon initial opening.

## 5. Status: PASS
