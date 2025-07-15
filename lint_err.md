# Linter Error Fixes

This document outlines the linting errors and the plan to fix them.

## Errors and Fixes

- **`@typescript-eslint/no-floating-promises` in `LoginForm.tsx`, `RegisterPage.tsx`, `CreateCatPage.tsx`:**
  - **Cause:** Promises are not being awaited or handled with `.catch()`.
  - **Fix:** I'll use the `void` operator to explicitly ignore the promises, as the navigation or toast messages don't need to be awaited.

- **`@typescript-eslint/no-unsafe-assignment`, `@typescript-eslint/no-unsafe-call`, `@typescript-eslint/no-confusing-void-expression` in `UserMenu.tsx`:**
  - **Cause:** The `logout` function is not being handled correctly.
  - **Fix:** I'll use a `.catch()` block to handle potential errors from the `logout` function, which will also resolve the unsafe assignment and call errors.

- **`react-x/no-forward-ref` warnings in `alert-dialog.tsx`, `button.tsx`, `input.tsx`:**
  - **Cause:** React 19 deprecates `forwardRef`.
  - **Fix:** I'll ignore these warnings for now, as the components are from a library and I don't want to change them.

- **`react-x/no-context-provider` warnings in `form.tsx`, `AuthContext.tsx`, `TestAuthProvider.tsx`:**
  - **Cause:** React 19 prefers rendering `<Context>` directly instead of `<Context.Provider>`.
  - **Fix:** I'll ignore these warnings for now, as the components are from a library and I don't want to change them.

- **`@typescript-eslint/no-base-to-string`, `@typescript-eslint/no-unnecessary-condition` in `form.tsx`:**
  - **Cause:** The error message is not being properly stringified.
  - **Fix:** I'll remove the optional chaining from the error message.

- **`react-refresh/only-export-components` in `form.tsx`:**
  - **Cause:** The file exports more than just React components.
  - **Fix:** I'll move the non-component exports to a separate file.

- **Parsing error in `auth-context.tsx`:**
  - **Cause:** The file is not included in the `tsconfig.json`.
  - **Fix:** I'll add the file to the `include` array in `tsconfig.json`.
