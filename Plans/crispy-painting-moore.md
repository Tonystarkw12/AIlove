# React + TailwindCSS Frontend Migration Plan

## Context

The user wants to abandon UniApp framework due to H5 input compatibility issues and rebuild the frontend using React + TailwindCSS on a new git branch. The existing Pokemon/GameBoy themed dating app (AI月老) needs to be fully recreated with:

- Same backend API compatibility (localhost:3052)
- Same Pokemon/GameBoy visual theme
- Same authentication flow
- Same core features (matching, chat, community, gamification)

---

## Current State

### Backend (Preserved)
- Node.js + Express on port 3052
- PostgreSQL + PostGIS on port 5434
- Redis on port 6379
- WebSocket for real-time chat
- All API endpoints unchanged

### Frontend (To Be Replaced)
- UniApp → React + Vite
- Vue 3 → React 18
- uni-ui → Custom components + TailwindCSS

---

## Implementation Plan

### Phase 1: Project Setup
1. Create new git branch `frontend-react`
2. Initialize React + Vite + TypeScript project
3. Configure TailwindCSS with Pokemon/GameBoy theme
4. Set up project structure

### Phase 2: Core Infrastructure
1. Create API client (axios-based)
2. Create auth context and hooks
3. Set up React Router
4. Create layout components

### Phase 3: Authentication Pages
1. Login page with Pokemon theme
2. Register page with form validation
3. Auth guard / protected routes

### Phase 4: Main Features
1. Home page with map
2. User profile page
3. Chat functionality
4. Community photo wall

### Phase 5: Gamification
1. HP/EXP bar component
2. Pokeball system
3. Pokemon avatar mapping

---

## Proposed Project Structure

```
frontend-react/
├── src/
│   ├── components/
│   │   ├── GameboyButton.tsx
│   │   ├── HpExpBar.tsx
│   │   ├── PokemonTypeBadge.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── TabBar.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Home.tsx
│   │   ├── Map.tsx
│   │   ├── Profile.tsx
│   │   ├── Chat.tsx
│   │   └── Community.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useApi.ts
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── services/
│   │   └── api.ts
│   ├── styles/
│   │   └── theme.css
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## User Decisions (Confirmed)

- ✅ **TypeScript** - Better type safety and developer experience
- ✅ **Mobile Responsive** - Mobile-first design with responsive breakpoints
- ✅ **Keep WeChat Login** - Preserve WeChat login functionality

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| TailwindCSS | Styling |
| React Router v6 | Routing |
| Axios | API client |

---

## Theme Colors to Preserve

```css
/* GameBoy Colors */
--gameboy-bg: #9BBC0F;
--gameboy-dark: #0F380F;
--gameboy-accent: #306230;

/* Pokemon Colors */
--pokemon-yellow: #FFCB05;
--pokemon-blue: #3B4CCA;
--pokemon-red: #FF5A5A;

/* Component Styles */
--border-hard: 4px solid #000000;
--shadow-hard: 4px 4px 0px 0px #000000;
```

---

## API Endpoints (Unchanged)

| Endpoint | Purpose |
|----------|---------|
| POST /api/auth/login | User login |
| POST /api/auth/register | User registration |
| GET /api/users/me/status | Get user status |
| GET /api/users/me/profile | Get user profile |
| POST /api/users/me/match | Start matching |
| GET /api/map/nearby | Get nearby users |
| POST /api/chat/send | Send message |
| GET /api/community/photos | Get community photos |

---

## Verification Plan

1. **Build Check**: `npm run build` succeeds
2. **Dev Server**: `npm run dev` starts on port 5173
3. **Login Flow**: Can login and receive JWT token
4. **Protected Routes**: Redirects to login when not authenticated
5. **API Calls**: Successfully communicates with backend on 3052

---

## Questions for User

1. TypeScript vs JavaScript preference?
2. Need mobile/responsive design?
3. Keep WeChat login functionality?
4. Priority features to implement first?