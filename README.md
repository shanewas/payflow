# Payflow API & Frontend

Payflow is a full-stack payment processing application built with Node.js, Express, and PostgreSQL on the backend, and React on the frontend. It uses Stripe for payment processing and provides a complete solution for handling user authentication, orders, payments, refunds, and more.

---

## Architecture

The application is containerized using Docker and is composed of the following services:

```ascii
+-----------------+      +-----------------+      +----------------+
|   React Client  |----->|   Node.js API   |----->|   PostgreSQL   |
| (localhost:3000)|      | (localhost:8080)|      |      (db)      |
+-----------------+      +-----------------+      +----------------+
        |                      |                      ^
        |                      |                      |
        |                      v                      |
        |               +----------------+            |
        +-------------->|     Stripe     |------------+
                        |      (API)     |      (Webhooks)
                        +----------------+
```

---

## Features

- **User Authentication**: Secure user registration and login using JWT (JSON Web Tokens).
- **Payment Processing**: Integration with Stripe for handling payments, including PaymentIntents for SCA compliance.
- **Order Management**: Create and manage orders linked to payments.
- **Database Migrations**: A simple, script-based migration system to manage database schema changes.
- **RESTful API**: A well-structured API with clear endpoints for all major functionalities.
- **Frontend UI**: A React-based single-page application for user interaction.
- **Dockerized Environment**: The entire application stack can be run easily using Docker Compose.
- **CI/CD Pipeline**: Automated testing and builds using GitHub Actions.
- **API Documentation**: Interactive API documentation available via Swagger/OpenAPI.

---

## Setup & Installation

### Prerequisites
- Node.js (v14+)
- PostgreSQL (v12+)
- Docker & Docker Compose
- A Stripe account and API keys

### 1. Clone the repository
```bash
git clone <repository-url>
cd payflow
```

### 2. Backend Setup
- Copy the example environment file: `cp .env.example .env`
- Fill in the required environment variables in `.env` (see table below).
- Install dependencies: `npm install`
- Run database migrations: `npm run migrate`
- Start the server: `npm start`

### 3. Frontend Setup
- Navigate to the client directory: `cd client`
- Install dependencies: `npm install`
- Create a `.env` file in the `client` directory with `REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_pk`.
- Start the frontend dev server: `npm start`

### 4. Docker Setup (Alternative)
- Ensure Docker is running.
- Copy the example environment file: `cp .env.example .env`
- Fill in the required environment variables in `.env`.
- Run `docker-compose up --build -d`.
- The API will be available at `http://localhost:3000` and the client at `http://localhost:3001` (if 3000 is taken by the API).

---

## Environment Variables

| Variable                          | Description                                         | Example                                                 |
|-----------------------------------|-----------------------------------------------------|---------------------------------------------------------|
| `PORT`                            | The port for the Node.js server to run on.          | `8080`                                                  |
| `DATABASE_URL`                    | The connection string for the PostgreSQL database.  | `postgres://user:password@localhost:5432/payflow`       |
| `STRIPE_SECRET_KEY`               | Your Stripe secret key (sk_test_...).               | `sk_test_...`                                           |
| `STRIPE_WEBHOOK_SECRET`           | Your Stripe webhook signing secret (whsec_...).     | `whsec_...`                                             |
| `JWT_ACCESS_TOKEN_SECRET`         | Secret key for signing JWT access tokens.           | `your-super-secret-key`                                 |
| `JWT_ACCESS_TOKEN_EXPIRATION`     | Expiration time for access tokens.                  | `15m`                                                   |
| `JWT_REFRESH_TOKEN_SECRET`        | Secret key for signing JWT refresh tokens.          | `another-super-secret-key`                              |
| `JWT_REFRESH_TOKEN_EXPIRATION`    | Expiration time for refresh tokens.                 | `7d`                                                    |
| `NODE_ENV`                        | The application environment.                        | `development` or `production`                           |
| `CORS_ORIGIN`                     | The origin to allow for CORS requests.              | `http://localhost:3000`                                 |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY`| Your Stripe publishable key for the React app.      | `pk_test_...`                                           |

---

## API Endpoints

The full interactive API documentation is available at `GET /docs` when the server is running.

| Method | Endpoint                    | Description                                | Auth Required |
|--------|-----------------------------|--------------------------------------------|---------------|
| `POST` | `/auth/register`            | Register a new user.                       | No            |
| `POST` | `/auth/login`               | Log in a user.                             | No            |
| `POST` | `/payments/intent`          | Create a new payment intent.               | Yes           |
| `GET`  | `/payments`                 | Get the payment history for the user.      | Yes           |
| `GET`  | `/payments/:id`             | Get details for a specific payment.        | Yes           |
| `POST` | `/payments/:id/refund`      | Refund a payment.                          | Yes           |
| `POST` | `/orders`                   | Create a new order.                        | Yes           |
| `POST` | `/checkout`                 | Initiate the checkout flow for an order.   | Yes           |
| `POST` | `/webhooks/stripe`          | Handle incoming webhooks from Stripe.      | No (Signature)|
| `GET`  | `/admin/payments`           | Get all payments (admin only).             | Yes (Admin)   |
| `GET`  | `/admin/stats`              | Get application statistics (admin only).   | Yes (Admin)   |
| `POST` | `/admin/refund/:id`         | Refund any payment (admin only).           | Yes (Admin)   |

---

## Running Tests

- To run all tests (unit and integration), use: `npm test`
- You may need to configure a separate test database and set the `DATABASE_URL` accordingly.

---

## Stripe Test Card Numbers

| Card Number        | CVC | Expiry |
|--------------------|-----|--------|
| `4242 4242 4242 4242` | 123 | 12/24  |

---

## Deployment Notes

- For production, ensure `NODE_ENV` is set to `production`.
- Use a robust process manager like PM2 to manage the Node.js application.
- Ensure your database is properly secured and backed up.
- Configure your Stripe webhooks in the Stripe dashboard to point to your production server's `/webhooks/stripe` endpoint.
