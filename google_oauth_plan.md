# Google OAuth Login/Registration Implementation Plan

This document outlines the steps to implement Google OAuth2 for login and registration in the Meo Mai Moi application.

## 1. Backend Implementation

### 1.1. Install Laravel Socialite

The `laravel/socialite` package is not yet a dependency. It needs to be installed via Composer.

```bash
docker compose exec backend composer require laravel/socialite
```

### 1.2. Configure Socialite

- **Add Service Configuration:**
  In `backend/config/services.php`, add the configuration for Google.

  ```php
  'google' => [
      'client_id' => env('GOOGLE_CLIENT_ID'),
      'client_secret' => env('GOOGLE_CLIENT_SECRET'),
      'redirect' => env('GOOGLE_REDIRECT_URI'),
  ],
  ```

- **Add Environment Variables:**
  In `.env` and `.env.docker.example`, add the following variables. We will use `dev.meo-mai-moi.com` for the domain.

  ```
  GOOGLE_CLIENT_ID=
  GOOGLE_CLIENT_SECRET=
  GOOGLE_REDIRECT_URI=https://dev.meo-mai-moi.com/auth/google/callback
  ```
  *(Note: We will need to obtain the client ID and secret from the Google API console.)*

### 1.3. Update User Model and Database

- **Create a Migration:**
  A new migration is needed to add columns to the `users` table to store Google-specific information.

  ```bash
  docker compose exec backend php artisan make:migration add_google_oauth_to_users_table --table=users
  ```

  The migration will add the following nullable columns:
  - `google_id` (string, unique)
  - `google_token` (text)
  - `google_refresh_token` (text)
  - `avatar` (string)

  The `password` column should be made nullable, as users registering via Google won't have a password initially.

- **Update User Model:**
  In `backend/app/Models/User.php`, add the new columns to the `$fillable` array.

  ```php
  protected $fillable = [
      'name',
      'email',
      'password',
      'google_id',
      'google_token',
      'google_refresh_token',
      'avatar',
  ];
  ```

### 1.4. Create Routes and Controller

- **Add Routes:**
  In `backend/routes/web.php`, add the routes for redirection and callback.

  ```php
  use App\Http\Controllers\GoogleAuthController;

  Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('google.redirect');
  Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');
  ```

- **Create Controller:**
  Create a new controller `backend/app/Http/Controllers/GoogleAuthController.php`.

  ```bash
  docker compose exec backend php artisan make:controller GoogleAuthController
  ```

  This controller will contain two methods:
  - `redirect()`: Redirects the user to Google's authentication page.
  - `callback()`: Handles the user information returned from Google.

### 1.5. Implement Controller Logic

- **`redirect()` method:**
  This method will simply use Socialite to redirect the user to Google.

- **`callback()` method:**
  This is the core logic:
  1. Retrieve the user from Google using Socialite.
  2. Check if a user with the `google_id` already exists in the `users` table.
     - If yes, update their `google_token` and `avatar` if necessary, then log them in.
  3. If no user with `google_id` exists, check if a user with the same email address exists.
     - If yes, this means the user already has an account created with email/password. Redirect them to the frontend login page with an error message, e.g., `?error=email_exists`. The message should inform them to log in with their password and connect their Google account from their profile settings (a future feature).
     - If no, create a new user record with the data from Google. The password can be set to a long random string or `null`. Log the new user in.
  4. After successful login, redirect the user to the frontend's main dashboard (e.g., `/account/pets`).

## 2. Frontend Implementation

### 2.1. Add Google Login Button

- In `frontend/src/components/LoginForm.tsx`, add a "Sign in with Google" button.
- This button should be styled appropriately and include the Google logo.
- It should be placed below the email input field or have a prominent position in the form.
- A horizontal divider with "OR" text can be used to separate the email/password flow from the Google login.

### 2.2. Implement Button Action

- The "Sign in with Google" button will be a simple link (`<a>` tag styled as a button).
- The `href` of the link will point to the backend redirect route: `/auth/google/redirect`.

### 2.3. Handle Callback and Errors

- The backend will handle the redirect back to the frontend after a successful login.
- The frontend needs to handle the error case where the email already exists.
- In `frontend/src/pages/LoginPage.tsx`, check for the `error` query parameter in the URL.
- If `error=email_exists` is present, display a prominent error message to the user on the login form.

## 3. Testing Plan

### 3.1. Backend
- Create a feature test for the Google OAuth flow.
- Mock the Socialite `user()` response to simulate different scenarios:
  - A new user registering for the first time.
  - An existing Google user logging in.
  - A user trying to sign up with Google when an account with their email already exists.

### 3.2. Frontend
- Add a test case in `frontend/src/pages/LoginPage.test.tsx` to ensure the "Sign in with Google" button is rendered.
- Add a test case to verify that the error message is displayed when the `error=email_exists` query parameter is present.
