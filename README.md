# Readi — Drone Operations Management Platform - build-1

Readi is a full-stack platform for managing drone operations, missions, compliance, safety, and logistics. It serves operators, pilots, and clients across the entire drone mission lifecycle.

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15 (App Router) | Framework |
| React | 19 | UI library |
| TypeScript | 5 | Language |
| Tailwind CSS | 4 | Styling |
| Shadcn UI / Radix UI | latest | Component library |
| TanStack Table | 8 | Data tables |
| React Hook Form + Zod | 7 / 4 | Forms & validation |
| Recharts | 3 | Charts & analytics |
| FullCalendar | 6 | Scheduling calendar |
| Leaflet | 1.9 | Interactive maps |
| i18next | 26 | Internationalization |
| Socket.io Client | 4 | Real-time updates |
| SurveyJS | 2.5 | Dynamic survey forms |
| next-auth | 4 | Authentication |

### Backend
| Technology | Purpose |
|---|---|
| Express.js v5 | REST API server |
| Supabase | Database (PostgreSQL) + Auth |
| Socket.io | Real-time communication (Drone ATC) |
| JWT + bcrypt | Token auth & password hashing |

### External Integrations
| Service | Purpose |
|---|---|
| AWS S3 | File & document storage |
| Supabase Storage | Media uploads |
| Resend | Transactional email |
| Google Generative AI | AI-assisted features |
| Groq SDK | AI inference |
| Flytbase | Drone fleet management integration |
| GUTMA | UTM / airspace integration |

---

## Project Structure

```
Readi/
├── src/                        # Next.js frontend (App Router)
│   ├── app/                    # Route pages
│   │   ├── dashboard/
│   │   ├── mission/
│   │   ├── operations/
│   │   ├── planning/
│   │   ├── logbooks/
│   │   ├── training/
│   │   ├── compliance/
│   │   ├── safety/
│   │   ├── systems/
│   │   ├── team/
│   │   ├── organization/
│   │   ├── client/
│   │   ├── document-repository/
│   │   ├── drone-atc/
│   │   ├── audit-logs/
│   │   ├── control-center/
│   │   ├── emergency-contact/
│   │   └── settings/
│   ├── components/             # Shared React components
│   ├── actions/                # Next.js server actions
│   ├── lib/                    # Utilities & Supabase clients
│   ├── types/                  # TypeScript type definitions
│   ├── config/                 # App configuration
│   └── locales/                # i18n translation files
├── backend/
│   └── src/
│       ├── services/           # Business logic (23 domains)
│       ├── controller/         # Route controllers
│       ├── middleware/         # Auth, error handling
│       ├── database/           # Supabase client
│       ├── config/             # Environment config
│       ├── validators/         # Request validation
│       └── utils/              # Shared utilities
├── platform-docs/              # Documentation site (Next.js)
├── mcp-server/                 # MCP server integration
└── public/                     # Static assets
```

---

## Key Modules

| Module | Description |
|---|---|
| **Dashboard** | KPIs, analytics charts, pilot & mission statistics |
| **Mission** | Mission types, flight requests, DCC settings, post-flight data |
| **Operations** | Operation board, flight logs, maintenance cycles, LUC procedures |
| **Planning** | Mission planning, evaluation, templates, test logbooks |
| **Logbooks** | Mission logbooks, flight logbooks, battery logbooks |
| **Training** | Training management and tracking |
| **Compliance** | Compliance targets and evidence management |
| **Safety** | Safety performance indicators (SPI/KPI) |
| **Systems** | Drone fleet, components, maintenance tickets, drone classes |
| **Organization** | Teams, assignments, checklists, communication |
| **Client Portal** | Client-facing mission and report access |
| **Drone ATC** | Real-time drone air traffic control via WebSocket |
| **Document Repository** | Document upload, storage, and management |
| **Emergency Contact** | ERP (Emergency Response Plan) management |
| **Audit Logs** | Full system audit trail |
| **Authorization** | Role-based access control |

---

## Codebase Statistics ( 20-05-2026 )

> Measured with PowerShell — excludes `node_modules`, `.git`, `dist`, `build`
| Language | Files | Lines |
|---|---:|---:|
| TSX | 400 | 75,831 |
| TypeScript | 404 | 31,890 |
| JSON | 16 | 38,343 |
| SQL | 3 | 2,808 |
| Markdown | 27 | 593 |
| JSX | 7 | 264 |
| CSS/SCSS | 5 | 229 |
| JavaScript | 5 | 184 |
| HTML | 31 | 31 |
| **Total** | **898** | **150,173** |

---

## Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project (URL + service role key)
- AWS S3 bucket (for file storage)

### Frontend

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, NEXTAUTH_SECRET, etc.

# Run development server
npm run dev
```

Frontend runs at `http://localhost:3000`.

### Backend

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.

# Run backend server
npm run dev
```

---

## Environment Variables

### Frontend (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_BACKEND_URL=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
RESEND_API_KEY=
```

### Backend
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
PORT=
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
