# Team Task Manager

A full-stack team task management application for organizing projects, assigning work, and tracking progress on a Kanban board.

## Features

- **Authentication** — Sign up, log in, and JWT-protected API routes
- **Projects** — Create projects; creators become admins; invite members by email
- **Kanban board** — Drag-and-drop tasks between To Do, In Progress, and Done
- **Tasks** — Title, description, due date, priority (Low / Medium / High), assignee
- **Dashboard** — Stats, overdue tasks, Recharts bar chart (tasks per user), pie chart (tasks by status)
- **Roles** — Admins manage tasks and members; members can update task status via drag-and-drop

## Tech Stack

| Layer    | Technologies                                      |
|----------|---------------------------------------------------|
| Frontend | React 19, Vite, React Router, Axios, Recharts   |
| Backend  | Node.js, Express 5, Prisma 7, PostgreSQL        |
| Auth     | bcryptjs, JSON Web Tokens                         |

## Project Structure

```
team-task-manager/
├── client/          # React frontend (Vite)
├── server/          # Express API + Prisma
│   ├── prisma/      # Schema and migrations
│   ├── routes/      # API route handlers
│   └── lib/         # Prisma client singleton
└── README.md
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (local or hosted)

## Setup

### 1. Clone and install dependencies

```bash
cd team-task-manager
cd server && npm install
cd ../client && npm install
```

### 2. Configure the database

Create a PostgreSQL database, then copy and edit the server environment file:

```bash
cd server
```

Create `server/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/taskmanager"
JWT_SECRET="your-long-random-secret-key"
PORT=5000
```

Replace `USER`, `PASSWORD`, and database name with your values.

### 3. Run migrations and generate Prisma client

```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Start the servers

**Backend** (terminal 1):

```bash
cd server
node server.js
```

API runs at `http://localhost:5000`.

**Frontend** (terminal 2):

```bash
cd client
npm run dev
```

App runs at `http://localhost:5173` (Vite default).

### 5. Use the app

1. Open the frontend URL in your browser
2. Sign up for an account
3. Create a project and add tasks on the Kanban board
4. Invite teammates by email (they must already have an account)

## Environment Variables

### Server (`server/.env`)

| Variable       | Description                          | Example                                      |
|----------------|--------------------------------------|----------------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string         | `postgresql://user:pass@localhost:5432/db`   |
| `JWT_SECRET`   | Secret for signing JWT tokens        | Long random string                           |
| `PORT`         | HTTP port (optional, default `5000`) | `5000`                                       |

### Client

The API base URL is set in `client/src/api/axios.js` as `http://localhost:5000/api`. For production, point this to your deployed API URL or use a Vite env variable:

```env
# client/.env.production
VITE_API_URL=https://your-api.railway.app/api
```

(Update `axios.js` to read `import.meta.env.VITE_API_URL` if you use this approach.)

## API Overview

| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| POST   | `/api/auth/signup`                    | Register                 |
| POST   | `/api/auth/login`                     | Login                    |
| GET    | `/api/dashboard`                      | Dashboard stats & charts |
| GET    | `/api/projects`                       | List projects            |
| POST   | `/api/projects`                       | Create project           |
| GET    | `/api/projects/:id`                   | Project detail           |
| POST   | `/api/projects/:id/members`           | Add member (admin)       |
| DELETE | `/api/projects/:id/members/:userId`   | Remove member (admin)    |
| POST   | `/api/projects/:id/tasks`           | Create task (admin)      |
| PATCH  | `/api/tasks/:id`                      | Update task              |
| DELETE | `/api/tasks/:id`                      | Delete task (admin)      |

Protected routes require header: `Authorization: Bearer <token>`.

## Deployment on Railway

Railway can host the API, database, and optionally the static frontend.

### 1. PostgreSQL on Railway

1. Create a project at [railway.app](https://railway.app)
2. Click **New** → **Database** → **PostgreSQL**
3. Open the Postgres service → **Variables** → copy `DATABASE_URL`

### 2. Deploy the API (server)

1. **New** → **GitHub Repo** (or upload this repo)
2. Set the **root directory** to `server` (or configure the start command for the server folder)
3. Add environment variables:
   - `DATABASE_URL` — from the Postgres service (use Railway’s reference variable `${{Postgres.DATABASE_URL}}`)
   - `JWT_SECRET` — generate a strong random string
   - `PORT` — Railway sets this automatically; use `process.env.PORT` (already configured in `server.js`)
4. **Build command** (if needed):

   ```bash
   npm install && npx prisma generate
   ```

5. **Start command**:

   ```bash
   npx prisma migrate deploy && node server.js
   ```

6. Deploy and note the public URL (e.g. `https://your-app.up.railway.app`)

### 3. Deploy the frontend (client)

**Option A — Static site on Railway**

1. New service from the same repo, root directory `client`
2. Build command: `npm install && npm run build`
3. Start command: `npx serve -s dist -l $PORT` (add `serve` as a dependency or use Railway’s static hosting)
4. Set `VITE_API_URL` at build time to your API URL + `/api`

**Option B — Vercel / Netlify**

1. Connect the `client` folder
2. Build: `npm run build`, output: `dist`
3. Set environment variable for API URL and update `axios.js` accordingly

### 4. CORS

The server uses `cors()` without restrictions. For production, restrict origins in `server/server.js`:

```js
app.use(cors({ origin: "https://your-frontend.up.railway.app" }));
```

### 5. Verify deployment

- `GET https://your-api.up.railway.app/api/auth/login` should return 400/401 (not connection refused)
- Sign up and log in from the deployed frontend
- Run `npx prisma migrate deploy` on each schema change

## Scripts Reference

| Location | Command              | Purpose                |
|----------|----------------------|------------------------|
| `client` | `npm run dev`        | Dev server             |
| `client` | `npm run build`      | Production build       |
| `server` | `node server.js`     | Start API              |
| `server` | `npx prisma studio`  | DB GUI                 |
| `server` | `npx prisma migrate dev` | Apply migrations locally |

## License

ISC
