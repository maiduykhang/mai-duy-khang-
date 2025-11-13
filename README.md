# WorkHub - Next.js Job Board

WorkHub is a modern, full-stack job board application built with Next.js, TypeScript, Prisma, PostgreSQL, and NextAuth.js. It features public job listings, a detailed job view, and a secure admin dashboard for managing posts.

## Features

-   **Public Job Listings:** Browse and view job opportunities.
-   **Static Generation:** Job pages are statically generated for optimal performance (ISR can be configured).
-   **Secure Admin Panel:** Role-based access control for administrators and moderators.
-   **CRUD Operations:** Admins can create, read, update, and delete job postings.
-   **Authentication:** Secure authentication using NextAuth.js with email and password.
-   **Database:** Uses PostgreSQL with Prisma for type-safe database access.
-   **Styling:** Responsive and modern UI built with Tailwind CSS.

---

## Getting Started

### 1. Prerequisites

-   [Node.js](https://nodejs.org/en/) (v18 or later)
-   [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
-   [PostgreSQL](https://www.postgresql.org/) database. A local instance or a free cloud-hosted one from [Supabase](https://supabase.com/) or [Neon](https://neon.tech/) will work.
-   [Git](https://git-scm.com/)

### 2. Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd workhub-nextjs
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```
    Now, fill in the required values in your `.env` file:
    -   `DATABASE_URL`: Your PostgreSQL connection string.
    -   `NEXTAUTH_SECRET`: A secret key for NextAuth. Generate one using `openssl rand -base64 32`.
    -   `NEXTAUTH_URL`: The full URL of your application (e.g., `http://localhost:3000` for development).

4.  **Run database migrations:**
    This will apply the Prisma schema to your database, creating the necessary tables.
    ```bash
    npx prisma migrate dev
    ```

5.  **Seed the database:**
    This will populate your database with an initial admin user and some sample job postings.
    ```bash
    npx prisma db seed
    ```
    -   **Admin User:** `admin@workhub.com`
    -   **Password:** `password123`

6.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Your application should now be running at [http://localhost:3000](http://localhost:3000).

---

## API Endpoints

The API is protected by admin authentication where noted.

#### `GET /api/jobs`

-   **Description:** Fetches all approved job postings.
-   **Authentication:** None
-   **Example:**
    ```bash
    curl http://localhost:3000/api/jobs
    ```

#### `GET /api/jobs/:id`

-   **Description:** Fetches a single job by its ID.
-   **Authentication:** None
-   **Example:**
    ```bash
    curl http://localhost:3000/api/jobs/clxysq87t000108l4f6d3h8j9
    ```

#### `POST /api/jobs`

-   **Description:** Creates a new job posting.
-   **Authentication:** Admin/Moderator
-   **Example (requires authentication cookie):**
    ```bash
    curl -X POST http://localhost:3000/api/jobs \
         -H "Content-Type: application/json" \
         -b "next-auth.session-token=..." \
         -d '{
              "title": "New Job Title",
              "company": "New Company",
              "location": "Remote",
              "salary": "Competitive",
              "description": "Job description here.",
              "requirements": "Requirements here.",
              "applicationLink": "https://apply.here/link"
            }'
    ```

#### `PUT /api/jobs/:id`

-   **Description:** Updates an existing job posting.
-   **Authentication:** Admin/Moderator
-   **Example (requires authentication cookie):**
    ```bash
    curl -X PUT http://localhost:3000/api/jobs/clxysq87t000108l4f6d3h8j9 \
         -H "Content-Type: application/json" \
         -b "next-auth.session-token=..." \
         -d '{ "status": "APPROVED" }'
    ```

#### `DELETE /api/jobs/:id`

-   **Description:** Deletes a job posting.
-   **Authentication:** Admin/Moderator
-   **Example (requires authentication cookie):**
    ```bash
    curl -X DELETE http://localhost:3000/api/jobs/clxysq87t000108l4f6d3h8j9 \
         -b "next-auth.session-token=..."
    ```

---

## Deployment

This project is optimized for deployment on [Vercel](https://vercel.com).

1.  **Push your code to a GitHub repository.**

2.  **Import your project on Vercel:**
    -   Go to your Vercel dashboard and click "Add New... > Project".
    -   Select your GitHub repository.
    -   Vercel will automatically detect that it's a Next.js project.

3.  **Configure Environment Variables:**
    -   In the project settings on Vercel, navigate to "Environment Variables".
    -   Add the same variables you defined in your `.env` file (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`). **Important:** Use your production database URL and the production URL of your Vercel app.

4.  **Deploy:**
    -   Click the "Deploy" button. Vercel will build and deploy your application.

**Note on Database Migrations in Production:**
Vercel's build process does not automatically run database migrations. You need to run them manually against your production database before or after a deployment that includes schema changes:
```bash
npx prisma migrate deploy
```
