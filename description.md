# Meo Mai Moi — Cat Rehoming Engine — Technical Overview

## Project Purpose

Meo Mai Moi is a web application designed to connect individuals who need to rehome cats with those offering temporary or permanent homes. It functions as a non-profit, peer-to-peer platform focused on usability, transparency, and community-driven welfare for cats.

This engine is designed to be adaptable, allowing anyone worldwide to deploy it with their own geography data and run their own local cat rehoming network.

## Core Functionalities

- **User Profiles:** Cat owners and helpers (fosters/adopters) with editable profiles.
- **Cat Listings:** Owners can create detailed profiles for each cat needing a home.
- **Matching System:** Search based on location, preferences, and availability.
- **Questionnaires:** Structured forms for both cat details and helper capabilities.
- **Messaging:** Secure in-platform chat between users.
- **Reputation System:** Users can leave reviews after successful matches.
- **Multilingual Support:** Default in English and Vietnamese; extensible to other languages.
- **Geography Handling:** Location selection using provinces and cities or other regional schemas.

## Non-Functional Requirements

- **Performance:** Optimized for responsive UI and quick backend responses.
- **Security:** Modern authentication, authorization, and encrypted data handling.
- **Scalability:** Suitable for growing datasets and user bases.
- **Usability:** Accessible for both tech-savvy users and the general public.

## System Architecture

- **Frontend:** React.js (SPA) consuming RESTful APIs.
- **Backend:** Laravel (PHP) for API management and business logic.
- **Database:** PostgreSQL for production use, with initial geography data optionally loaded from JSON.
- **Deployment:** Docker Compose for development and production environments.

## Data Models (Simplified)

- **User:**  
  - Roles: Owner, Helper  
  - Profile info, location (Province, City)  

- **Cat:**  
  - Basic info: Name, age, health, behavior  
  - Linked to an Owner  

- **Geography:**  
  - Provinces and Cities (or other regions, depending on country)  

- **Match:**  
  - Connects a Cat, an Owner, and a Helper  

- **Message:**  
  - Private chats between Users  

- **Review:**  
  - One User reviewing another, post-match  

## API Endpoints (REST)

- `/api/users` — Manage users
- `/api/cats` — Manage cats
- `/api/provinces`, `/api/cities` — Geography data
- `/api/matches` — Create/view matches
- `/api/messages` — In-app communication
- `/api/reviews` — Manage user reviews  

## User Interface Components

- User Dashboard  
- Cat Listings  
- Profile Management  
- Search and Filter  
- Chat/Messaging Interface  
- Reviews and Ratings  

## Deployment Model

- **Containerized Deployment:**  
  - Docker Compose for local and server environments  
  - Allows quick setup and consistent deployment  

- **Cloud-Friendly:**  
  - Adaptable to cloud platforms like AWS, DigitalOcean, or self-hosted servers  

- **Modular Geography:**  
  - Swap out Vietnamese location data for any other country's administrative divisions  

## Challenges and Mitigation

- **Localization:**  
  - Built-in multilingual framework, extendable to more languages  

- **Data Integrity:**  
  - Matches, reviews, and messaging are only accessible to involved users  

- **Scalability:**  
  - PostgreSQL backend with Laravel's Eloquent ORM  
  - Caching solutions like Redis can be added  

- **Community Safety:**  
  - Reviews and messaging are restricted to verified matches to reduce spam or abuse  

## Summary

This application is designed as a flexible, open-source engine for building cat rehoming communities anywhere in the world. Its architecture prioritizes trust, usability, and adaptability.

