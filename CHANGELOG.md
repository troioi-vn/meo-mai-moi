## [Unreleased]

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

### Fixed
- Backend: Fixed typo in `CatController.php` catch block.
- Frontend: Fixed `ElementRef` deprecation errors in `alert-dialog.tsx`, `form.tsx`, `label.tsx`, and `toast.tsx`.
- Frontend: Fixed `no-empty-object-type` error in `input.tsx`.
- Frontend: Fixed `no-case-declarations` error in `use-toast.ts`.
- Frontend: Fixed `no-floating-promises` errors in `DeleteAccountDialog.tsx`, `LoginForm.tsx`, `NotificationBell.tsx`, `RegisterPage.tsx`, `CreateCatPage.tsx`, and `MyCatsPage.tsx`.
- Frontend: Fixed `no-misused-promises` errors in `NotificationBell.tsx`, `RegisterForm.tsx`, `UserMenu.tsx`, `ProfilePage.tsx`, and `CreateCatPage.tsx`.
- Frontend: Fixed `no-unused-vars` errors in `NotificationBell.test.tsx`, `UserMenu.tsx`, `button.tsx`, and `CreateCatPage.test.tsx`.
- Frontend: Fixed `unbound-method` error in `NotificationBell.test.tsx`.
- Frontend: Fixed `no-unsafe-call` error in `NotificationBell.tsx`.
- Frontend: Fixed `prefer-nullish-coalescing` and `no-unnecessary-condition` errors in `RegisterForm.tsx` and `UserMenu.tsx`.
- Frontend: Fixed `no-redundant-type-constituents`, `no-unsafe-assignment`, `no-unsafe-member-access`, and `prefer-nullish-coalescing` errors in `button.tsx`.
- Frontend: Fixed `no-base-to-string` and `no-unnecessary-condition` errors in `form.tsx`.
- Frontend: Fixed `no-non-null-assertion` error in `main.tsx`.
- Frontend: Fixed `any` type usage in `LoginPage.test.tsx`, `MainPage.test.tsx`, `ProfilePage.test.tsx`, `RegisterPage.test.tsx`, `AuthContext.tsx`, and `TestAuthProvider.tsx`.
- Frontend: Fixed `react-refresh/only-export-components` errors in `badge.tsx`, `button.tsx`, `form.tsx`, and `AuthContext.tsx`.
- Frontend: Fixed `no-array-index-key` warning in `MyCatsPage.tsx`.