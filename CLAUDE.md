# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a vocal class management web application being migrated from a localStorage-based PWA to a Cloudflare Pages + D1 + R2 serverless architecture. The app serves both teachers (scheduling, attendance tracking) and students (booking classes, submitting attendance).

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Run local development server with D1 and R2 bindings
wrangler pages dev . --d1=DB --r2=STORAGE

# Alternative (if configured in package.json)
npm run dev
```

### Database Operations
```bash
# Initialize D1 database (local)
wrangler d1 execute vocal-class-db --local --file=./schema.sql

# Initialize D1 database (production)
wrangler d1 execute vocal-class-db --file=./schema.sql

# Run manual SQL query (local)
wrangler d1 execute vocal-class-db --local --command "SELECT * FROM users"

# Run manual SQL query (production)
wrangler d1 execute vocal-class-db --command "SELECT * FROM users"
```

### Deployment
```bash
# Deploy to Cloudflare Pages
wrangler pages deploy . --project-name=vocal-class

# Alternative (if configured in package.json)
npm run deploy

# View real-time logs
wrangler pages deployment tail
```

### R2 Storage
```bash
# Create R2 bucket (one-time setup)
wrangler r2 bucket create vocal-class-storage
```

## Architecture

### Tech Stack
- **Frontend**: Vanilla JavaScript, HTML5, TailwindCSS
- **Backend**: Cloudflare Pages Functions (TypeScript)
- **Database**: Cloudflare D1 (SQLite-based)
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **PWA**: Service Worker with offline caching and notifications

### Project Structure
```
.
├── functions/api/          # Cloudflare Pages Functions (TypeScript)
│   ├── attendance.ts       # POST/GET attendance records + signature upload to R2
│   ├── bookings.ts         # POST/GET/DELETE student lesson bookings
│   ├── recordings.ts       # POST/GET audio recordings to R2
│   └── schedule.ts         # POST/GET teacher availability schedules
├── js/                     # Frontend JavaScript (being migrated)
│   ├── auth.js            # User authentication (localStorage → API)
│   ├── teacher.js         # Teacher schedule management
│   ├── student.js         # Student booking system
│   ├── signature.js       # Canvas-based attendance signatures
│   ├── recorder.js        # MediaRecorder API for audio
│   ├── drawing.js         # Drawing board for lessons
│   └── examples.js        # YouTube video examples management
├── index.html             # Login page
├── teacher.html           # Teacher dashboard
├── student.html           # Student dashboard
├── signature.html         # Attendance signature page
├── tools.html             # Lesson tools (drawing, recording, videos)
├── schema.sql             # D1 database schema
└── wrangler.toml          # Cloudflare configuration
```

### Key Architectural Patterns

**API Endpoints (Pages Functions)**
- Functions in `functions/api/*.ts` automatically map to `/api/*` routes
- Each function exports `onRequestPost`, `onRequestGet`, etc. for HTTP methods
- Access D1 via `context.env.DB` and R2 via `context.env.STORAGE`
- TypeScript interfaces define request/response types

**Database Schema (schema.sql)**
- `users`: Teachers and students (role-based)
- `schedules`: Teacher weekly availability slots
- `bookings`: Student lesson reservations
- `attendances`: Attendance records with signature URLs (R2 paths)
- `recordings`: Audio file metadata (R2 paths)
- `example_videos`: YouTube URLs for teaching materials

**Migration Status**
- The codebase is in transition from `localStorage` to API calls
- See MIGRATION.md for detailed conversion guide
- Frontend JS files still contain localStorage code to be replaced with fetch() calls

**R2 Storage Patterns**
- Signatures stored as: `signatures/{sessionId}_{studentId}_{timestamp}.png`
- Recordings stored with user-defined names: `recording_{timestamp}.webm`
- Base64 images converted to Uint8Array before R2 upload

## Important Notes

### wrangler.toml Configuration
After creating D1 database with `wrangler d1 create vocal-class-db`, you must:
1. Copy the `database_id` from the output
2. Uncomment and fill in the `[[d1_databases]]` section in wrangler.toml
3. Same for R2 bucket binding (uncomment `[[r2_buckets]]`)

### Migration Approach
When converting localStorage code to API calls:
- Replace `localStorage.getItem/setItem` with `fetch()` calls
- Use `sessionStorage` for temporary user session data (not localStorage)
- Add proper error handling with try/catch
- Show loading states during async operations
- Check MIGRATION.md for specific before/after examples

### CORS Handling
If CORS errors occur, create `functions/_middleware.ts`:
```typescript
export async function onRequest(context) {
  const response = await context.next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}
```

### Service Worker (PWA)
- `service-worker.js` caches static assets for offline use
- `manifest.json` enables "Add to Home Screen" functionality
- Notification API used for class reminders

### Testing Locally
- Always test with `wrangler pages dev` (not just `python -m http.server`)
- This ensures D1 and R2 bindings work correctly
- Local D1 uses `.wrangler/state/` for data persistence

## Development Workflow

1. Make changes to functions or frontend code
2. Test locally with `wrangler pages dev .`
3. For database changes, update schema.sql and re-run `wrangler d1 execute`
4. Deploy with `wrangler pages deploy .`
5. Monitor logs with `wrangler pages deployment tail`

## Reference Documentation
- QUICKSTART.md: 5-minute deployment guide
- DEPLOYMENT.md: Full deployment and configuration details
- MIGRATION.md: Step-by-step localStorage to API migration
- README.md: Original project overview (Korean)
