# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.3.0] - 2025-07-15

### Added
- Frontend: Added new `auth-context.tsx` file to separate context definition from provider implementation.
- Frontend: Added comprehensive error logging in registration form for better debugging.

### Changed
- Frontend: Refactored authentication architecture for better separation of concerns:
  - Moved context definition to separate file (`auth-context.tsx`)
  - Updated `AuthContext` to use `useCallback` for all functions to prevent unnecessary re-renders
  - Standardized type imports across auth-related files
- Frontend: Improved error handling consistency across forms:
  - Enhanced `ChangePasswordForm` with proper `AxiosError` type checking and fallback error messages
  - Updated `DeleteAccountDialog` to use consistent error handling pattern
  - Improved `RegisterForm` error processing and type safety
- Frontend: Enhanced component implementations:
  - Updated `LoginForm` to properly handle async form submission with `void` operator
  - Modified `UserMenu` to use proper promise handling for `logout` function
  - Updated `MainNav` to use the new `useAuth` hook import path
- Frontend: Improved UI component architecture:
  - Refactored `alert-dialog.tsx` to use proper `React.forwardRef` implementation
  - Updated `button.tsx` to use cleaner interface definitions and import structure
  - Enhanced `form.tsx` with better context handling and error message processing
  - Improved `input.tsx` with proper TypeScript interface exports
- Frontend: Updated page components for better UX:
  - Removed `HomeButton` component from `LoginPage` and `RegisterPage` for cleaner design
  - Enhanced `ProfilePage` to use direct function references instead of arrow functions
  - Updated `CreateCatPage` to use proper promise chaining instead of async/await in event handlers
- Frontend: Improved test infrastructure:
  - Updated `NotificationBell.test.tsx` with proper API mocking using `vi.spyOn`
  - Enhanced `TestAuthProvider` to use `useMemo` for better performance
  - Fixed test imports to use the new hook location
- Frontend: Configuration improvements:
  - Updated `tsconfig.json` to explicitly include the new `auth-context.tsx` file

### Removed
- Frontend: Removed the unused `HomeButton` component and all its references.

### Fixed
- **Linting:** Resolved majority of ESLint errors including:
  - Fixed `@typescript-eslint/no-floating-promises` errors by using proper promise handling
  - Resolved `@typescript-eslint/no-unsafe-call` and `@typescript-eslint/no-unsafe-assignment` errors
  - Fixed `@typescript-eslint/no-unnecessary-condition` errors with proper type checking
  - Resolved `@typescript-eslint/prefer-nullish-coalescing` errors by using `??` operator
- **Type Safety:** Enhanced TypeScript usage across components:
  - Proper `AxiosError` type checking in error handlers
  - Improved interface definitions and type exports
  - Better error message type handling
- **React Best Practices:** Improved component implementations:
  - Proper `React.forwardRef` usage in UI components
  - Better hook usage with `useCallback` and `useMemo` for performance
  - Consistent promise handling patterns
- **Note:** Some React 19 warnings remain for `forwardRef` usage and context providers, which are acceptable for current shadcn/ui components

## [0.2.0] - 2025-07-15

### Added
- Backend: Added `cats()` relationship to `User` model.
- Frontend: Added `postcss.config.js` for Tailwind CSS and Autoprefixer.
- Frontend: Created `badge-variants.ts` and `button-variants.ts` for React Fast Refresh compatibility.

### Changed
- Backend: Refactored `CatController` authorization to use manual checks instead of `authorizeResource`.
- Backend: Updated `Controller.php` to use `AuthorizesRequests` and `ValidatesRequests` traits.
- Frontend: Standardized import statements to use single quotes (`'`).
- Frontend: Updated `App.tsx` for styling and `pt-16` comment.
- Frontend: Modified `api.ts` to use `|| '/api'` for `baseURL`.
- Frontend: Improved error handling and type safety in `axios.ts` interceptor.
- Frontend: Updated styling and structure in `CatCard.tsx`, `CatsSection.tsx`, `HeroSection.tsx`, `LoginPage.tsx`, `MainPage.tsx`, `NotFoundPage.tsx`, `ProfilePage.tsx`, `RegisterPage.tsx`, `CreateCatPage.tsx`, and `MyCatsPage.tsx`.
- Frontend: Refactored `ChangePasswordForm.tsx` for improved error handling and Zod schema.
- Frontend: Added `await` to `logout()` in `DeleteAccountDialog.tsx`.
- Frontend: Updated `LoginForm.tsx` to handle `handleSubmit` with `void`.
- Frontend: Added `p-2` padding to header in `MainNav.tsx`.
- Frontend: Updated `NotificationBell.test.tsx` and `NotificationBell.tsx` for improved mocking and `useEffect` logic.
- Frontend: Updated `RegisterForm.tsx` for improved error logging.
- Frontend: Refactored `UserMenu.tsx` for dark mode toggling, updated avatar attributes, and removed unused import/link.
- Frontend: Simplified `Avatar`, `AvatarImage`, and `AvatarFallback` components in `avatar.tsx`.
- Frontend: Refactored `Card` components in `card.tsx`.
- Frontend: Removed hardcoded background colors from `DropdownMenuContent` and `DropdownMenuSubContent` in `dropdown-menu.tsx`.
- Frontend: Updated context creation and component structure in `form.tsx`.
- Frontend: Refactored `Input` component in `input.tsx` to use `React.forwardRef`.
- Frontend: Updated `Label` component in `label.tsx`.
- Frontend: Updated theme variables in `sonner.tsx`.
- Frontend: Updated `Toast` components in `toast.tsx`.
- Frontend: Added block scope to `DISMISS_TOAST` case in `use-toast.ts`.
- Frontend: Added `RegisterPayload` and `LoginPayload` interfaces in `AuthContext.tsx`.
- Frontend: Updated `TestAuthProvider.tsx` for mock values.
- Frontend: Updated dark mode color definitions in `index.css`.
- Frontend: Updated `tsconfig.json` and `vite.config.ts` for paths and imports.
- Frontend: Updated `package-lock.json` and `package.json` dependencies.

### Removed
- Backend: Removed `__construct` with `authorizeResource` from `CatController.php`.
- Frontend: Removed social media icon buttons from `Footer.tsx` due to deprecation warnings.
- Frontend: Removed "About" link from `UserMenu.tsx`.
- Frontend: Removed `DropdownMenuLabel` import from `UserMenu.tsx`.
- Frontend: Removed `type VariantProps` from `button.tsx` import.
- Frontend: Removed the unused `HomeButton` component.

### Fixed
- **General:** Addressed numerous ESLint errors across the frontend, including `no-floating-promises`, `no-unsafe-call`, `no-unnecessary-condition`, and `no-misused-promises`, leading to more stable and type-safe code.
- **Ref Forwarding:** Corrected the implementation of `React.forwardRef` in several `shadcn/ui` components (`alert-dialog.tsx`, `input.tsx`) to resolve React 19 warnings.
- **Fast Refresh:** Fixed `react-refresh/only-export-components` errors by isolating non-component exports (e.g., `buttonVariants`, form contexts) into their own files.
- **Error Handling:** Standardized and improved error handling in forms (`ChangePasswordForm`, `RegisterForm`) and dialogs (`DeleteAccountDialog`) to be more robust.
- **Promise Handling:** Correctly handled promises in various components (`LoginForm`, `CreateCatPage`, `UserMenu`) to prevent unhandled promise rejections.
- **Imports & Modules:** Corrected the import path for `useAuth` hook and `buttonVariants` across multiple components.
- **Configuration:** Updated `frontend/tsconfig.json` to correctly include all necessary files, resolving a persistent parsing error.
- **Testing:** Repaired broken tests (`NotificationBell.test.tsx`, `LoginPage.test.tsx`, etc.) by mocking dependencies correctly and updating providers.
- **UI/UX:** Removed the now-redundant `HomeButton` from login and registration pages.

### Refactored
- Improved frontend code structure by separating auth context, hooks, and types into their own files for better maintainability.
- Standardized promise handling and error catching across several React components.