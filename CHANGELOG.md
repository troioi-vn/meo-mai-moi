# CHANGELOG

## [Unreleased]

### Changed
- Removed `/api/cats` GET endpoint from backend and corresponding frontend `CatsSection` component.
- Updated backend logout functionality to delete all user tokens.
- Ensured `/api/users/me` endpoint response is consistently wrapped in a `data` property.
- Increased avatar upload size limit to 10MB.
- Refined `axios` mocking in frontend tests to correctly handle nested `data` responses and `AxiosError`.
- Corrected `getMyCats` function to call `/my-cats` endpoint.
- Added `await waitFor` to various frontend tests to improve stability and handle asynchronous rendering.
