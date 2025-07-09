#  GEMINI.md - Meo Mai Moi Project

This document outlines the conventions, goals, and workflow for the collaboration between the development team and the Gemini AI assistant on the Meo Mai Moi project.

## 1. Project Summary

**Meo Mai Moi** is an open-source web application engine designed to help communities build cat rehoming networks. It connects cat owners with fosters and adopters, supporting a community-driven approach to cat welfare. The platform is architected to be geographically modular, allowing anyone to deploy it for their own region.

## 2. Tech Stack

- **Backend:** Laravel (PHP) - REST API
- **Frontend:** React.js (JavaScript) - Single Page Application
- **Database:** PostgreSQL
- **Deployment:** Docker Compose

## 3. Gemini's Role

As the AI assistant for this project, my primary responsibilities are:

- **Code Generation:** Write readable, tested, and idiomatic code following the project's established styles and patterns.
- **Architecture & Design (High Importance):** Be creative and proactive in suggesting architectural improvements, design patterns, and potential weak spots in the current implementation. These suggestions should be clearly marked.
- **Testing:** Assist in writing unit and integration tests, adhering to our TDD-for-features workflow.
- **Debugging:** Help identify and resolve bugs.
- **Clarification:** Ask questions to resolve ambiguity before implementing.

## 4. Development Practices

### Git Workflow

- **Branching:** All work should be done on separate branches.
- **Branch Naming Convention:**
    - New features: `feature/task-description` (e.g., `feature/add-user-profile-page`)
    - Bug fixes: `fix/bug-description` (e.g., `fix/login-form-validation`)

### Testing

- **TDD for New Features:** All new features must begin with a failing test that defines the desired functionality. This is the default approach for adding anything new.
- **Fixes & Refactoring:** The TDD rule is not strictly required for minor bug fixes or code improvements where it's impractical.
- **Default Frameworks:**
    - **Laravel (Backend):** Pest
    - **React (Frontend):** Jest with React Testing Library (RTL)

### Coding Style & Linting

- **PHP / Laravel:**
    - **Standard:** PSR-12.
    - **Tool:** We will use `PHP-CS-Fixer` to automatically enforce the style guide.
      *(Note: `PHP-CS-Fixer` is a command-line tool that automatically reformats PHP code to follow standards like PSR-12. It helps keep the codebase clean and consistent without manual effort.)*
- **JavaScript / React:**
    - **Style Guide:** Airbnb's JavaScript Style Guide.
    - **Formatter:** Prettier will be used to auto-format the code.

### React Components

- **Component Style:** We will use **Functional Components with Hooks** exclusively. Class-based components should not be used unless there is a specific, agreed-upon reason.

## 5. Command Glossary

*(This section can be updated with any custom commands or aliases we establish.)*

## 6. TODOs

- [ ] **Setup Project Scaffolding:**
    - [ ] Initialize a new Laravel project.
    - [ ] Initialize a new React project (e.g., with Vite or Create React App).
- [ ] **Configure Linting & Formatting:**
    - [ ] Set up `PHP-CS-Fixer` for the Laravel backend.
    - [ ] Set up `ESLint` (with Airbnb config) and `Prettier` for the React frontend.

## 7. User Preferences

- **Collaboration Style:** Iterative, feedback-driven.
- **Command Style:** Imperative (e.g., "Refactor this function", "Write a test for the login API").
- **User Language:** Intermediate English (native: Russian). Communication should be clear and direct.
