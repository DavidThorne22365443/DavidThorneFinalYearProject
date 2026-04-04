# SkateConnected

A social platform for the Irish skateboarding community. Users can find local skateparks and community-submitted skatespots on an interactive map, associate themselves with parks, and message other skaters.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Map | Mapbox GL JS |
| Backend | Express.js (Node.js) |
| Database | PostgreSQL via Sequelize ORM |
| Auth | JWT (stored in `sc_token` http-only cookie) |
| Email | Resend |

---

## Features

- **Interactive map** centred on the user's city (defaults to Limerick)
- **Skateparks** — admin-created, shown as black markers; users can associate themselves with up to 4 parks and appear in the members list
- **Skatespots** — community-submitted, shown as orange markers; any logged-in user can suggest a spot which an admin must approve before it appears on the map
- **Skill level** — users set Beginner / Intermediate / Advanced on signup, shown on park member lists
- **Messaging** — users can send chat invites to other skaters they find through parks; recipient must accept before the conversation opens
- **Forgot password** — users can request a password reset link by email; link is valid for 1 hour and expires after use
- **Admin panel** — manage users, skateparks, and skatespot approvals; both admin pages use a split layout with a searchable list on the left and a live Mapbox map preview on the right so admins can see exactly where each park or suggested spot is located

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or a `DATABASE_URL` connection string)

---

## Setup

### 1. Clone and install dependencies

```bash
# Frontend (Next.js)
cd skateconnected
npm install

# Backend (Express)
cd backend
npm install
```

### 2. Configure environment variables

**`skateconnected/.env.local`** (Next.js frontend)

```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token
BACKEND_URL=http://localhost:5001
```

**`skateconnected/backend/.env`** (Express backend)

```env
PORT=5001
DATABASE_URL=postgresql://user:password@localhost:5432/skateconnected

JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=7d

# Email (Resend) — required for email verification and password reset
RESEND_API_KEY=your_resend_api_key
MAIL_FROM=onboarding@resend.dev

# Base URL used to build password reset links in emails
APP_URL=http://localhost:3000
```

> **Mapbox token** — get a free token at [mapbox.com](https://www.mapbox.com/). The public token starts with `pk.`.
>
> **Email sending** — `RESEND_API_KEY` and a verified Resend domain are required for emails (verification, password reset) to actually send. Without the key, the backend falls back to logging the code/link to the console, which is fine for local development.

### 3. Create the database

```bash
createdb skateconnected
```

Sequelize will create and sync all tables automatically on first run (`sequelize.sync({ alter: true })`).

### 4. Run both servers

Open two terminals:

```bash
# Terminal 1 — backend (Express)
cd skateconnected/backend
npm run dev       # or: node src/server.js
```

```bash
# Terminal 2 — frontend (Next.js)
cd skateconnected
npm run dev
```

The app is available at **http://localhost:3000**.

---

## Default Admin Account

On first startup the backend seeds a default admin account:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `adminDavid2004` |

> Change the credentials in `backend/src/seedAdmin.js` before deploying.

---

## Project Structure

```
skateconnected/
├── app/                        Next.js App Router pages & API proxy routes
│   ├── api/
│   │   ├── auth/               Login, register, logout, email verify, forgot/reset password
│   │   ├── park/               Park CRUD + association
│   │   ├── skatespot/          Skatespot submit + admin approve/delete
│   │   ├── account/            Current user profile + park memberships
│   │   └── chat/               Conversations & messages
│   ├── map/                    Main map page
│   ├── skatespot-admin/        Admin: approve / reject skatespots; search, submitter details, map preview
│   ├── park-admin/             Admin: rename / delete skateparks; search + map preview (parks created via map)
│   ├── account-admin/          Admin: manage user accounts
│   ├── skateparks/             Public list of all skateparks
│   ├── chat/                   Chat list and conversation pages
│   ├── login/
│   ├── register/
│   ├── forgot-password/        Request a password reset email
│   └── reset-password/         Set a new password via reset link
├── components/
│   └── Map.tsx                 Full interactive map component
├── lib/
│   ├── auth.ts                 Helper to read JWT from cookie server-side
│   └── cities.ts               Irish city coordinates for map centering
└── backend/
    └── src/
        ├── models/             Sequelize models (Account, Park, ParkMember,
        │                       Skatespot, Conversation, Message, …)
        ├── routes/             Express routers (accounts, park, skatespot, chat)
        ├── middleware/
        │   └── requireAuth.js  JWT auth + admin guard middleware
        ├── db/sequelize.js     Database connection
        ├── seedAdmin.js        Seeds the default admin account
        └── server.js           Express app entry point
```

---

## API Overview

All routes below are Express routes (prefixed by `BACKEND_URL`). The Next.js API layer at `/api/*` proxies them, forwarding the auth cookie as a `Bearer` token.

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/accounts/register` | — | Create account |
| POST | `/accounts/login` | — | Returns JWT |
| GET | `/accounts/me` | ✓ | Current user profile |
| PUT | `/accounts/me` | ✓ | Update profile |
| POST | `/accounts/forgot-password` | — | Send password reset email |
| POST | `/accounts/reset-password` | — | Set new password using reset token |

### Parks
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/park` | — | List all parks |
| POST | `/park` | Admin | Create park |
| PUT | `/park/:id` | Admin | Update park |
| DELETE | `/park/:id` | Admin | Delete park |
| GET | `/park/:id/users` | — | List park members |
| POST | `/park/:id/associate` | ✓ | Join a park (max 4) |
| DELETE | `/park/:id/associate` | ✓ | Leave a park |

### Skatespots
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/skatespot` | — | List approved spots |
| POST | `/skatespot` | ✓ | Submit a spot (pending approval) |
| GET | `/skatespot/pending` | Admin | List spots awaiting approval |
| PUT | `/skatespot/:id/approve` | Admin | Approve a spot |
| DELETE | `/skatespot/:id` | Admin | Delete a spot |

### Chat
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/chat/conversations` | ✓ | List user's conversations |
| POST | `/chat/conversations` | ✓ | Start a new conversation |
| GET | `/chat/conversations/:id/messages` | ✓ | Get messages |
| POST | `/chat/conversations/:id/messages` | ✓ | Send a message |
| POST | `/chat/conversations/:id/accept` | ✓ | Accept a chat invite |
| DELETE | `/chat/conversations/:id/decline` | ✓ | Decline / delete a conversation |

---

## Map Usage

| User type | Clicking the map | Markers visible |
|---|---|---|
| Not logged in | Nothing | Parks & approved spots |
| Logged-in user | Opens "Suggest a Skatespot" form | Parks & approved spots |
| Admin | Opens "Add Skatepark" form | Parks & approved spots |

**Marker colours:**
- Black — skateparks (admin-created, always visible)
- Orange — skatespots (community-submitted, visible after admin approval)
