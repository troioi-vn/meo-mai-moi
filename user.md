---
title: "Frontend Authentication Setup with Laravel Sanctum and Vite-React"
date: 2025-07-12
---

# Overview

This document outlines a **step-by-step** implementation for a React frontend served via Vite (`localhost:5173`) communicating with a Laravel backend (`localhost:8000`) using **Laravel Sanctum** for authentication. The goal is to create a skeleton UI covering:

- Register
- Login
- Logout
- Profile settings (view & update)
- Delete account

Assumptions:
- Backend API routes and controllers are already in place:
  ```php
  Route::post('/register', [AuthController::class, 'register']);
  Route::post('/login',    [AuthController::class, 'login']);
  Route::post('/logout',   [AuthController::class, 'logout'])->middleware('auth:sanctum');

  Route::middleware('auth:sanctum')->group(function () {
      Route::get('/user',            fn(Request $r) => $r->user());
      Route::get('/users/me',        [UserProfileController::class, 'show']);
      Route::put('/users/me',        [UserProfileController::class, 'update']);
      Route::put('/users/me/password', [UserProfileController::class, 'updatePassword']);
      Route::delete('/users/me',     [UserProfileController::class, 'destroy']);
  });
  ```
- Running Laravel with `php artisan serve` on port 8000.
- Tailwind CSS + shadcn/ui for styling in React.

# 1. Laravel Backend Configuration

- [ ] **Install Sanctum** (if not already)
   ```bash
   composer require laravel/sanctum
   php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
   php artisan migrate
   ```

- [ ] **Configure stateful domains & CORS** in `.env`:
   ```dotenv
   SANCTUM_STATEFUL_DOMAINS=localhost:5173
   SESSION_DOMAIN=localhost
   ```

- [ ] **Ensure `config/cors.php` supports credentials**:
   ```php
   'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],
   'supports_credentials' => true,
   ```

- [ ] **Middleware**
   - Verify `EnsureFrontendRequestsAreStateful` is enabled in `api` middleware group.
   - Protect all routes under `auth:sanctum` guard.

# 2. Vite Configuration

- [x] In `vite.config.js`, add a proxy to forward API calls:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/sanctum': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

# 3. Axios Defaults

- [x] Create `src/api/axios.js`:

```js
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,  // send cookies
});

export const csrf = () => axios.get('/sanctum/csrf-cookie', { withCredentials: true });
```

# 4. AuthContext & Hooks

- [x] `src/context/AuthContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { api, csrf } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const { data } = await api.get('/user');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    await csrf();
    await api.post('/register', payload);
    await loadUser();
  };

  const login = async (payload) => {
    await csrf();
    await api.post('/login', payload);
    await loadUser();
  };

  const logout = async () => {
    await api.post('/logout');
    setUser(null);
  };

  useEffect(() => { loadUser(); }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

# 5. React Router & Pages

- [x] Install router:
```bash
npm install react-router-dom
```

- [x] In `src/main.jsx`:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
```

- [x] Define routes in `src/App.jsx`:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
```

# 6. Skeleton Pages

- [x] Create `src/pages/LoginPage.jsx`, `RegisterPage.jsx`, and `ProfilePage.jsx` with basic forms using Tailwind and shadcn/ui components. Each should call the corresponding `login()`, `register()`, `logout()`, and profile `api.get('/users/me')`, `api.put('/users/me')`, `api.put('/users/me/password')`, `api.delete('/users/me')` methods.

# 7. Controllers Review

- [ ] **AuthController** and **UserProfileController** look correct. Ensure in **register** and **login** you return valid JSON tokens or set cookies appropriately.
- [ ] Verify password validation and request classes (`UpdatePasswordRequest`, `DeleteAccountRequest`) enforce strong rules.

# 8. Next Steps

- [ ] Flesh out UI forms and validations.
- [ ] Add feature tests using `Sanctum::actingAs()`.
- [ ] Expand to include email verification & password reset when needed.
