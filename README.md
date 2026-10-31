# ERP Client

React + TypeScript + Vite frontend for the Shop Management System.

## Prerequisites

- Node.js 20+
- npm

## Setup

```bash
# Install dependencies
npm install

# Copy env file
copy .env.example .env
```

Edit `.env` if your backend runs on a different port:
- `VITE_API_URL` — backend API URL (default: `http://localhost:5000/api`)
- `VITE_SHOP_NAME` — your shop name shown on invoices

## Run

```bash
# Development
npm run dev
```

Open `http://localhost:5173` in your browser.

Go to `/setup` on first run to create your admin account.

## Build

```bash
npm run build
```

Output goes to `dist/` — serve with any static file server.

## Test

```bash
npm test
```
