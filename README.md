# SyncBoard 
A real-time, collaborative digital canvas that allows multiple users to synchronize the state of shared objects instantly.

## Features
- **Real-Time Sync**: Move objects in one tab and see them move in all others instantly.
- **Persistent State**: Canvas coordinates are saved even if all users disconnect.
- **Secure Auth**: Integrated Supabase Auth supporting Email/Password and Google OAuth.
- **Edge Performance**: Backend built on Cloudflare Workers for global low-latency.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Lucide React.
- **Backend**: Cloudflare Workers with Hono.
- **Real-Time**: WebSockets + Cloudflare Durable Objects.
- **Auth/DB**: Supabase.

## Architecture
The application uses a **Durable Object** to maintain a "Single Source of Truth." When a user drags a box, coordinates are sent via WebSocket to the Worker, which broadcasts the update to all connected clients and persists the state.

## Setup
1. Clone the repository.
2. Run `npm install`.
3. Create a `.env` file with your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Run `npm run dev` to start locally.
5. Deploy the backend: `npx wrangler deploy`.

## setup & Deployment
1. Frontend (Client)
2. Clone & Install:
3. npm install

   
## Environment Variables: 
Create a .env file:
1. VITE_SUPABASE_URL=your_project_url
2. VITE_SUPABASE_ANON_KEY=your_anon_key
   
## Run: 
npm run dev

## Backend (Serverless)
Initialize Queues/KV: (If using KV for profiles) 
npx wrangler kv:namespace create PROFILES.


## Deploy:
npx wrangler deploy
