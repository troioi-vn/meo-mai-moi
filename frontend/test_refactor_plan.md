# Frontend Test Refactoring Plan

## 1. Summary and Analysis

This document provides a consolidated and actionable plan for refactoring the frontend test suite. The analysis is based on the guidelines from `frontend/front_test.md` and an investigation of the project's testing configuration.

**Key Findings:**
- **Redundancy:** The original `test_list.md` contained a high degree of duplication between the "Existing Tests" and "Missing Tests" sections. This plan merges them into a single, actionable list.
- **Solid Foundation:** The project's configuration (`vite.config.ts`, `setupTests.ts`, `test-utils.tsx`) is modern and correctly set up to support the desired testing strategy.
- **Refactoring Goal:** The primary goal is to ensure all tests consistently use the established patterns: `renderWithRouter`, centralized mock data, and user-centric assertions.

## 2. Consolidated Test Refactoring Guide

Below is the unified list of tests to be reviewed and refactored. Each item includes a "Refactoring Focus" to guide the development effort.

---

### Core Application & Layout

-   **App.routing.test.tsx**
    -   **Existing Tests:** Renders pages for various routes (`/cats/:id`, invalid ID, edit cat), supports navigation.
    -   **Refactoring Focus:**
        -   **Keep.** This is a crucial test for application routing.
        -   **Review:** Ensure it uses `renderWithRouter` for all rendering. Verify that assertions focus on the outcome (e.g., `screen.getByRole('heading', { name: /Cat Profile/i })`) rather than implementation details.

-   **MainPage.test.tsx**
    -   **Existing Tests:** Renders all the main sections.
    -   **Refactoring Focus:**
        -   **Keep.** Good high-level integration test.
        -   **Review:** This should be a simple test that verifies the main sections (`HeroSection`, `CatsSection`, etc.) are present. Avoid testing the content of those sections here.

-   **MainNav.test.tsx**
    -   **Existing Tests:** Renders login/register buttons (unauthenticated) or user menu (authenticated).
    -   **Refactoring Focus:**
        -   **Keep.** Essential for testing authentication-based UI changes.
        -   **Review:** Use `renderWithRouter` and manipulate the auth state via its test options to simulate authenticated and unauthenticated users.

-   **Footer.test.tsx**
    -   **Existing Tests:** Renders the footer component.
    -   **Refactoring Focus:**
        -   **Keep.** Simple but necessary.
        -   **Review:** Ensure it checks for key elements like copyright text or social links.

-   **NotFoundPage.test.tsx**
    -   **Existing Tests:** Renders 404 message, heading, and link to homepage.
    -   **Refactoring Focus:**
        -   **Keep.**
        -   **Review:** The test that checks for rendering on an unknown route (`renders NotFoundPage for unknown routes via router`) is the most important one. Ensure it's robust.

### Authentication & User Pages

-   **LoginForm.test.tsx**
    -   **Existing Tests:** Renders form, allows input, shows error on failed login.
    -   **Refactoring Focus:**
        -   **Keep.** Critical user flow.
        -   **Review:** Ensure MSW handlers are used to mock the API login response (both success and failure). Test that the `useAuth` context is updated correctly upon successful login, likely by asserting that a navigation or UI change occurs.

-   **RegisterForm.test.tsx**
    -   **Existing Tests:** Renders form, shows error on failure, success message on success.
    -   **Refactoring Focus:**
        -   **Keep.** Critical user flow.
        -   **Review:** Similar to `LoginForm.test.tsx`, use MSW to mock API responses for registration. Verify success/error toasts and navigation.

-   **RegisterPage.test.tsx**
    -   **Existing Tests:** Renders the page, registers a new user, and navigates.
    -   **Refactoring Focus:**
        -   **Simplify/Merge:** This test likely has significant overlap with `RegisterForm.test.tsx`. Consider making this a simpler integration test that just ensures the `RegisterForm` component is rendered correctly on the page, and keep the detailed form logic tests in `RegisterForm.test.tsx`.

-   **LoginPage.test.tsx**
    -   **Existing Tests:** Renders login form and layout.
    -   **Refactoring Focus:**
        -   **Simplify/Merge:** Similar to `RegisterPage`, this can be a simple test to ensure the `LoginForm` is rendered. Keep logic tests in `LoginForm.test.tsx`.

-   **ProfilePage.test.tsx**
    -   **Existing Tests:** Renders the profile page correctly.
    -   **Refactoring Focus:**
        -   **Expand:** This test is likely too simple. It should be expanded to verify that user-specific data is fetched and displayed, including components like `UserAvatar` and `ChangePasswordForm`. Use MSW to provide mock user data.

-   **ChangePasswordForm.test.tsx**
    -   **Existing Tests:** Renders fields, shows validation errors, calls API on submit.
    -   **Refactoring Focus:**
        -   **Keep.**
        -   **Review:** Ensure it correctly tests form validation logic (e.g., password mismatch) and mocks the API call with MSW to test success and error states.

-   **UserMenu.test.tsx**
    -   **Existing Tests:** Renders avatar, opens dropdown, has correct links, calls logout, handles theme toggle.
    -   **Refactoring Focus:**
        -   **Keep.**
        -   **Review:** This is a component with a lot of states. Ensure all states (e.g., user with/without name, logout success/error) are tested. Use `renderWithRouter` and its auth context options.

-   **UserAvatar.test.tsx**
    -   **Existing Tests:** Renders image or fallback, shows/hides upload controls.
    -   **Refactoring Focus:**
        -   **Keep.**
        -   **Review:** The logic for showing initials as a fallback is important to test. The tests for showing/hiding controls based on props are also valuable.

### Cat-Related Components & Pages

-   **CatsSection.test.tsx**
    -   **Existing Tests:** Renders the section heading.
    -   **Refactoring Focus:**
        -   **Expand:** This test should be expanded to test the data-fetching state. It should render a loading state, then a list of `CatCard` components based on a mocked API response from MSW, and finally an error state.

-   **CatCard.test.tsx**
    -   **Existing Tests:** Renders cat info, image/placeholder, links to profile.
    -   **Refactoring Focus:**
        -   **Keep.** This is a core presentational component.
        -   **Review:** Ensure tests use centralized mock data from `src/mocks/data/cats.ts`. Check that the link correctly points to `/cats/:id`.

-   **CatProfilePage.test.tsx**
    -   **Existing Tests:** Renders profile info, image/placeholder, error messages, and conditional buttons (owner vs. non-owner).
    -   **Refactoring Focus:**
        -   **Keep.** Critical page test.
        -   **Review:** This is a perfect example of where to use MSW to test all data states: success, not found (404), and server error (500). Use `renderWithRouter` to simulate different users (owner vs. non-owner) to test the conditional rendering of edit buttons.

-   **CatPhotoManager.test.tsx**
    -   **Existing Tests:** Renders for owner vs. non-owner, handles upload/delete (success and error), shows loading states.
    -   **Refactoring Focus:**
        -   **Keep.**
        -   **Review:** Use MSW to mock the upload and delete API endpoints. Verify that loading states are shown and that the UI updates correctly on success or shows a toast on error.

-   **EnhancedCatRemovalModal.test.tsx**
    -   **Existing Tests:** Tests the entire multi-step workflow: name confirmation, action selection, password validation, and final API calls.
    -   **Refactoring Focus:**
        -   **Keep.** This is a complex but critical workflow.
        -   **Review:** This test is a good candidate for user-flow testing with `userEvent`. Ensure each step is tested thoroughly. Use MSW to mock the final API calls (`deleteCat`, `updateCatStatus`) and test the success and error handling.

-   **account/MyCatsPage.test.tsx**
    -   **Existing Tests:** Fetches and displays user's cats, shows loading/error, toggles switch.
    -   **Refactoring Focus:**
        -   **Keep.**
        -   **Review:** Use MSW to mock the API endpoint for fetching the user's cats. Test the loading and error states.

-   **account/EditCatPage.test.tsx**
    -   **Existing Tests:** Fetches data, renders form, updates on submit, handles removal modal.
    -   **Refactoring Focus:**
        -   **Keep.**
        -   **Review:** This is a key integration test. It needs to use MSW to fetch the initial cat data and to mock the update API call.

-   **account/CreateCatPageNew.test.tsx**
    -   **Existing Tests:** Renders form, validates fields, calls createCat API, navigates on success.
    -   **Refactoring Focus:**
        -   **Keep.**
        -   **Review:** Use MSW to mock the `createCat` API endpoint to test both success (with navigation) and failure (with error message).

### UI Components & Providers

-   **ui/switch.test.tsx**
    -   **Existing Tests:** Renders checked/unchecked, handles clicks, disabled state.
    -   **Refactoring Focus:**
        -   **Keep.** Good example of a simple component test.

-   **ui/select.test.tsx**
    -   **Missing Tests:** Renders trigger, opens dropdown, selects option, disabled state.
    -   **Refactoring Focus:**
        -   **Write Test.** This is a standard component test that should be implemented to ensure the select component is reliable.

-   **ui/alert-dialog.test.tsx**
    -   **Missing Tests:** Renders, opens/closes, calls callbacks.
    -   **Refactoring Focus:**
        -   **Write Test.** Important for confirming user actions. Test that the `onConfirm` and `onCancel` callbacks are fired correctly.

-   **ui/alert.test.tsx**
    -   **Missing Tests:** Renders variants, title, description.
    -   **Refactoring Focus:**
        -   **Write Test.** Simple component test to verify props and variants work as expected.

-   **theme-provider.test.tsx**
    -   **Missing Tests:** Provides context, sets/gets theme from storage, toggles theme.
    -   **Refactoring Focus:**
        -   **Write Test.** This is important for ensuring theme persistence works correctly. Mock `localStorage` to test reading and writing the theme value.

### Other

-   **NotificationBell.test.tsx**
    -   **Existing Tests:** Fetches and displays the number of unread notifications.
    -   **Refactoring Focus:**
        -   **Keep.**
        -   **Review:** Use MSW to mock the notifications API endpoint. Test the loading state and the final count display.

-   **HeroSection.test.tsx**
    -   **Existing Tests:** Renders heading and text.
    -   **Refactoring Focus:**
        -   **Keep.** Simple presentational component test.

-   **ApplyToHelpPage.test.tsx**
    -   **Missing Tests:** Renders page and form, submits application.
    -   **Refactoring Focus:**
        -   **Write Test.** This is a key user flow. The test should verify the form renders and that it can be submitted, mocking the API call with MSW.

-   **icons.test.tsx**
    -   **Missing Tests:** Renders each exported icon.
    -   **Refactoring Focus:**
        -   **Low Priority.** This can be useful but is less critical than user-flow and component logic tests. Can be a simple test that renders each icon and checks for `toBeInTheDocument()`.

---
This plan provides a clear path forward. By following these guidelines, the test suite will become more robust, maintainable, and aligned with modern best practices.
