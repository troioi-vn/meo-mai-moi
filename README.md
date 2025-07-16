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


## Intended Use

This project is designed to be a **starter engine** for communities, NGOs, shelters, or independent groups who want to:

- Run a cat rehoming platform specific to their locality
- Manage temporary fostering networks
- Help with adoption processes
- Provide a safe, reputation-based environment for people and cats to find each other

The system is not tied to any specific country, though the initial dataset is based on Vietnam.

## Development Setup

This project uses different databases for different environments:

- **Local Development**: SQLite (file-based, lightweight)
- **Docker/Production**: PostgreSQL (robust, full-featured)

### Option 1: Local Development (SQLite)

1. **Backend Setup**:
   ```bash
   cd backend
   cp .env.example .env
   composer install
   php artisan key:generate
   php artisan migrate
   php artisan db:seed
   php artisan serve  # Runs on http://localhost:8000
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev  # Runs on http://localhost:5173
   ```

### Option 2: Docker Setup (PostgreSQL)

1. **Start the application**:
   ```bash
   docker compose up -d --build
   ```

2. **Set up the database** (required after first build):
   ```bash
   # Run migrations to create database tables
   docker compose exec backend php artisan migrate --force
   
   # Seed the database with initial data and admin user
   docker compose exec backend php artisan db:seed --force
   
   # Generate admin panel permissions
   docker compose exec backend php artisan shield:generate --all
   ```

   Or use the automated setup profile:
   ```bash
   docker compose --profile setup up migrate seed
   ```

3. **Access the application**: http://localhost:8000

### Requirements

- **Local Development**: PHP 8.4, Node.js, Composer, npm
- **Docker**: Docker & Docker Compose

### Admin Panel Access

The admin panel is available at `http://localhost:8000/admin`.

**Default Credentials:**
- **Email:** `test@example.com`
- **Password:** `password`

### Development Workflow

- **Development Server**: Use `npm run dev` to run the frontend on `http://localhost:5173` with hot-reloading.
- **Laravel Integration**: Use `npm run build` to update the version served by Laravel on `http://localhost:8000`.
- **Docker Builds**: The deployment process uses `npm run build:docker` which is optimized for container builds.

## Testing

The project includes comprehensive testing coverage for both backend and frontend components:

### Backend Tests (Laravel/PHPUnit)

```bash
cd backend

# Run all tests
vendor/bin/sail artisan test

# Run specific test suites
vendor/bin/sail artisan test --filter="OptionalAuthMiddlewareTest"
vendor/bin/sail artisan test --filter="OwnershipPermissionTest"
vendor/bin/sail artisan test --filter="CatProfileTest"

# Run with coverage
vendor/bin/sail artisan test --coverage
```

### Frontend Tests (Vitest/React Testing Library)

```bash
cd frontend

# Run all tests
npm test

# Run specific test files
npm test -- CatProfilePage.test.tsx
npm test -- App.routing.test.tsx

# Run in watch mode
npm test

# Run with coverage
npm test -- --coverage
```

### Test Coverage

- **Backend**: 25+ tests covering authentication, permissions, and API endpoints
- **Frontend**: 22+ tests covering component rendering, routing, and user interactions
- **Key Features**: OptionalAuth middleware, ownership-based permissions, conditional UI rendering

For detailed testing documentation, see [docs/testing.md](docs/testing.md).

## Deployment

This guide outlines the steps to deploy the Meo Mai Moi application to a production environment using Docker and Nginx.

### Prerequisites

* A server running Ubuntu
* Docker and Docker Compose installed
* Nginx installed
* A registered domain name

### Deployment Steps

1. **Clone the Repository**

   Clone the Meo Mai Moi repository to your server:

   ```bash
   git clone https://github.com/your-username/meo-mai-moi.git
   cd meo-mai-moi
   ```

2. **Configure the Backend**

   Navigate to the `backend` directory and create a `.env` file from the example file:

   ```bash
   cd backend
   cp .env.example .env
   ```

   Update the `.env` file with your database credentials and other environment-specific settings.

3. **Build and Run the Docker Containers**

   From the project root directory, build and start the Docker containers in detached mode:

   ```bash
   docker compose up -d --build
   ```

4. **Configure Nginx as a Reverse Proxy**

   Copy the provided Nginx configuration file to the Nginx `sites-available` directory:

   ```bash
   sudo cp ttt.catarchy.space.conf /etc/nginx/sites-available/
   ```

   Create a symbolic link to the `sites-enabled` directory:

   ```bash
   sudo ln -s /etc/nginx/sites-available/ttt.catarchy.space.conf /etc/nginx/sites-enabled/
   ```

   Test the Nginx configuration for syntax errors:

   ```bash
   sudo nginx -t
   ```

   If the test is successful, restart Nginx to apply the changes:

   ```bash
   sudo systemctl restart nginx
   ```

5. **Set Up the Database**

   Access the backend container to run the database migrations:

   ```bash
   docker compose exec backend php artisan migrate --force
   ```

   Seed the database with initial data and admin user:

   ```bash
   docker compose exec backend php artisan db:seed --force
   ```

   Generate admin panel permissions:

   ```bash
   docker compose exec backend php artisan shield:generate --all
   ```

6. **Secure with SSL (Recommended)**

   Install Certbot and obtain a free SSL certificate from Let's Encrypt:

   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d ttt.catarchy.space
   ```

   Certbot will automatically update your Nginx configuration to use SSL.

### Accessing the Application

Your application should now be accessible at `https://ttt.catarchy.space`.

## License

This project is licensed under the **MIT License** — feel free to use, modify, and deploy it for your own community needs.

## Credits

Originally developed as part of the **Meo Mai Moi** project — Cat Matchmaking for Vietnam.

