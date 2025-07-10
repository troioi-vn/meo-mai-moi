# Meo Mai Moi — Cat Rehoming Platform Engine

## About

**Meo Mai Moi** is an open-source web application engine designed to help communities build cat rehoming networks. This platform connects cat owners who need to rehome their cats with individuals offering temporary or permanent homes. It supports fostering, adoption, and community-driven cat welfare.

Anyone can deploy this system in their area or country to run their own version of a cat rehoming service — whether for a city, province, or entire country. While the default geography data is based on Vietnam, it is fully adaptable to other regions.

## Key Features

- 👤 **User Profiles:** For both cat owners and fosters/adopters.
- 🐱 **Cat Listings:** Create detailed profiles for each cat, including health, temperament, and needs.
- 📄 **Questionnaires:** Tailored forms to help match cats with the right homes or fosters.
- 📍 **Location-based Search:** Using regional data (provinces and cities) for accurate matching.
- 💌 **In-app Messaging:** Communicate directly within the platform.
- ⭐ **Reputation System:** Reviews and ratings to build community trust.
- 🌏 **Multilingual Support:** Supports multiple languages, including English and Vietnamese.
- 🚩 **Modular Geography:** Easily adaptable to different countries' administrative regions.

## Tech Stack

- **Frontend:** React.js
- **Backend:** Laravel (PHP)
- **Database:** PostgreSQL (planned default), with static JSON optionally used for initial geography data
- **Deployment:** Docker Compose for local and production environments

## Intended Use

This project is designed to be a **starter engine** for communities, NGOs, shelters, or independent groups who want to:

- Run a cat rehoming platform specific to their locality
- Manage temporary fostering networks
- Help with adoption processes
- Provide a safe, reputation-based environment for people and cats to find each other

The system is not tied to any specific country, though the initial dataset is based on Vietnam.

## Development Setup

To set up and run the development server, follow these steps:

### Backend (Laravel)

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
3.  Bring up the Docker containers:
    ```bash
    docker compose up -d
    ```
4.  Install PHP dependencies inside the Laravel container:
    ```bash
    docker compose exec -w /var/www/html laravel.test composer install
    ```
5.  Generate an application key inside the Laravel container:
    ```bash
    docker compose exec -w /var/www/html laravel.test php artisan key:generate
    ```

**Note:** The default ports for the application and database have been changed to `8080` and `5433` respectively to avoid conflicts with common local development setups. You can access the application at `http://localhost:8080`.

### Frontend (React)

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install Node.js dependencies:
    ```bash
    npm install
    ```
3.  To run the frontend in development mode (with hot-reloading):
    ```bash
    npm run dev
    ```
4.  To build the frontend for production:
    ```bash
    npm run build
    ```

## License

This project is licensed under the **MIT License** — feel free to use, modify, and deploy it for your own community needs.

## Credits

Originally developed as part of the **Meo Mai Moi** project — Cat Matchmaking for Vietnam.

