# 🚀 MySpace — Personal & Collaborative Workspace Platform

<p align="center">
  <img src="apps/web/public/images/myspace-planning-collage.png" alt="MySpace Banner" width="800" style="border-radius: 12px;" />
</p>

<p align="center">
  <b>One unified space for your personal focus & real-time team collaboration.</b><br>
  Manage habits, goals, focus sessions, and private notes alongside multiplayer canvases, shared kanban boards, and workspace documentation — with zero data collision.
</p>

<p align="center">
  <a href="#-features"><img src="https://img.shields.io/badge/Architecture-Monorepo-blue.svg" alt="Monorepo"></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Next.js-16.2-black.svg" alt="Next.js"></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/React-19.0-61dafb.svg" alt="React"></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Express-4.19-000000.svg" alt="Express"></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Drizzle%20ORM-0.38-green.svg" alt="Drizzle ORM"></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/PostgreSQL-NeonDB-blue.svg" alt="PostgreSQL"></a>
</p>

---

## 📖 Table of Contents
- [✨ Key Features](#-key-features)
  - [🧘 Personal Productivity Suite](#-personal-productivity-suite)
  - [👥 Co-Space Collaboration Suite](#-co-space-collaboration-suite)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Project Directory Structure](#-project-directory-structure)
- [⚡ Quick Start & Setup Guide](#-quick-start--setup-guide)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Clone Repository & Install Dependencies](#2-clone-repository--install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Database Setup & Migrations](#4-database-setup--migrations)
  - [5. Run Development Servers](#5-run-development-servers)
- [📜 Available PNPM Scripts](#-available-pnpm-scripts)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Key Features

### 🧘 Personal Productivity Suite
- **📊 Habit Tracker & Analytics**: Build daily habits with streak counting, weekly heatmaps, and momentum metrics.
- **⏱️ Focus Room**: Protect deep work with Pomodoro timers, ambient soundscapes, and gamified XP rewards.
- **🎯 Goals & Milestones**: Define quarterly objectives, track completion progress, and link tasks directly to goals.
- **📝 Private Notes & Notebooks**: Markdown-enabled ideas vault, rich notes manager, and journal entries.
- **🎨 Personal Infinite Canvas**: Rough.js sketch-style infinite vector canvas with custom shapes, sticky notes, and text elements.
- **💳 Expense Tracker**: Monitor recurring financial subscriptions and budget allocations.

### 👥 Co-Space Collaboration Suite
- **🖱️ Real-Time Co-Canvas**: Infinite SVG canvas with Socket.IO multiplayer live cursor streaming, active room presence badges (`Alex`, `Sarah`, `Ben`), sticky notes, and threaded comment pins with resolution status.
- **📋 Co-Projects (Shared Kanban)**: Collaborative project boards with live column updates, card drag & drop, and instant team sync.
- **📄 Co-Notes**: Multi-user shared documentation, meeting minutes, and system specifications.
- **🔒 Role Isolation**: Airtight separation between Personal Space (100% private) and Co-Spaces (shared team access with invite codes and role permissions).

---

## 🛠️ Tech Stack

### **Frontend (`apps/web`)**
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- **Canvas Engine**: Hand-crafted Infinite Vector SVG canvas + [Rough.js](https://roughjs.com/) sketch renderer
- **State & Data**: [TanStack React Query v5](https://tanstack.com/query) + [Axios](https://axios-http.com/)
- **Real-Time Client**: [Socket.IO Client v4](https://socket.io/)

### **Backend (`apps/api`)**
- **Runtime**: Node.js + [Express.js](https://expressjs.com/) (TypeScript)
- **Database**: PostgreSQL (Hosted on [Neon DB](https://neon.tech/)) + [Drizzle ORM](https://orm.drizzle.team/)
- **Real-Time WebSockets**: [Socket.IO v4 Server](https://socket.io/)
- **Authentication**: JWT (Access Token + Refresh Token in HttpOnly Cookies)
- **Validation & Security**: [Zod](https://zod.dev/), Helmet, Rate-Limiting, HPP, Compression

---

## 📂 Project Directory Structure

```
MySpace/
├── apps/
│   ├── api/                       # Express Backend REST API & WebSockets
│   │   ├── src/
│   │   │   ├── db/                # Drizzle ORM Schema, Migrations & Seeds
│   │   │   │   ├── schema/        # Modular Database Tables
│   │   │   │   └── seed.ts        # Initial Database Seeder
│   │   │   ├── modules/           # Domain-driven Modules (auth, notes, tasks, kanban, etc.)
│   │   │   ├── sockets/           # Real-Time Socket.IO Handlers (co-canvas, kanban)
│   │   │   ├── middleware/        # JWT Auth, Rate Limit, Validation
│   │   │   └── index.ts           # API Server Entry Point
│   │   └── package.json
│   │
│   └── web/                       # Next.js 16 App Router Frontend
│       ├── src/
│       │   ├── app/               # App Router Page Routes (/dashboard, /canvas, /co-space, etc.)
│       │   ├── components/        # Reusable UI & Co-Space Components
│       │   ├── lib/
│       │   │   ├── canvas/        # Custom Infinite Vector Canvas Engine & Math Utilities
│       │   │   └── api.ts         # Axios Interceptors & Refresh Token Flow
│       └── package.json
│
├── pnpm-workspace.yaml            # PNPM Workspace Config
├── package.json                   # Root Scripts & Monorepo Configuration
└── README.md                      # Project Documentation
```

---

## ⚡ Quick Start & Setup Guide

Follow these step-by-step instructions to get MySpace running locally on your machine.

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js**: `v20.x` or higher
- **PNPM**: `v9.x` or higher (`npm install -g pnpm`)
- **PostgreSQL**: A local PostgreSQL database or a free instance on [Neon DB](https://neon.tech/)

---

### 2. Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/MySpace.git

# Navigate into the project folder
cd MySpace

# Install all monorepo dependencies
pnpm install
```

---

### 3. Configure Environment Variables

#### **Backend (`apps/api/.env`)**
Create a `.env` file in `apps/api/.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=8000

# PostgreSQL Database Connection URL
DATABASE_URL=postgresql://user:password@localhost:5432/myspacedb?sslmode=require

# JWT Secret Keys (Generate secure random 64-char strings)
JWT_ACCESS_SECRET=super-secret-jwt-access-key-should-be-at-least-64-characters-long
JWT_REFRESH_SECRET=super-secret-jwt-refresh-key-should-be-at-least-64-characters-long
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Allowed Origin
CORS_ORIGIN=http://localhost:3000

# Uploads & Security Settings
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

#### **Frontend (`apps/web/.env.local`)**
Create a `.env.local` file in `apps/web/.env.local`:

```env
# Backend API Endpoint
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# WebSocket Server Endpoint
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

---

### 4. Database Setup & Migrations

Run Drizzle schema push or migrations to build the tables in your PostgreSQL database:

```bash
# Push database schema directly to PostgreSQL
pnpm --filter api db:push

# (Optional) Seed initial demo data
pnpm --filter api db:seed
```

---

### 5. Run Development Servers

Start both the **Next.js frontend** and **Express backend** concurrently:

```bash
# Start all workspace apps in parallel
pnpm dev:all
```

Or start them individually in separate terminal sessions:

```bash
# Terminal 1: Backend API (http://localhost:8000)
pnpm dev:api

# Terminal 2: Web App (http://localhost:3000)
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start using **MySpace**!

---

## 📜 Available PNPM Scripts

### **Root Scripts (`package.json`)**
| Script | Command | Description |
| :--- | :--- | :--- |
| `pnpm dev:all` | `pnpm -r --parallel dev` | Runs both Web & API dev servers concurrently |
| `pnpm dev:web` | `pnpm --filter web dev` | Runs Next.js frontend dev server (`localhost:3000`) |
| `pnpm dev:api` | `pnpm --filter api dev` | Runs Express backend dev server (`localhost:8000`) |
| `pnpm build` | `pnpm -r build` | Builds production bundles for all workspace apps |
| `pnpm test` | `pnpm -r test` | Runs vitest test suites across the monorepo |
| `pnpm lint` | `pnpm -r lint` | Lints TypeScript files across all apps |

### **Backend Scripts (`apps/api/package.json`)**
| Script | Command | Description |
| :--- | :--- | :--- |
| `pnpm --filter api db:generate` | `drizzle-kit generate` | Generates SQL migration files |
| `pnpm --filter api db:migrate` | `drizzle-kit migrate` | Executes migrations on the database |
| `pnpm --filter api db:push` | `drizzle-kit push` | Pushes schema directly to database |
| `pnpm --filter api db:studio` | `drizzle-kit studio` | Opens Drizzle Studio GUI database manager |

---

## 🤝 Contributing

Contributions are welcome! If you find a bug or want to enhance MySpace:
1. Fork the project repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
