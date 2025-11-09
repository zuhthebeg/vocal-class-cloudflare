# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-lesson education platform (vocal, PT, drawing, piano, etc.) built with Cloudflare Pages + D1 + R2 serverless architecture. The app serves both teachers (scheduling, attendance tracking, profile management) and students (browsing teachers, booking classes, submitting reviews).

**Current Development Phase**: Core features implementation (Phase 1)
- Database can be reset anytime during development - no migration concerns
- Authentication is simplified (name-only) - proper auth will be added in final phase

## Development Environment

**IMPORTANT: All environments (dev/prod) use D1 database - NO localStorage mode**

- **Development**: `wrangler pages dev . --port=8788` → Uses local D1 (`.wrangler/state/v3/d1`)
- **Production**: Cloudflare Pages deployment → Uses remote D1
- **Data Storage**: ALL user data, schedules, bookings stored in D1 database
- **Session Storage**: Only `localStorage` is used for user session (login state)
- **Database Resets**: Safe to reset database anytime during development phase

### Common Commands

#### Development
```bash
# Install dependencies
npm install

# Run local development server (ALWAYS use this - port 8788 required)
wrangler pages dev . --port=8788

# With explicit D1 and R2 bindings
wrangler pages dev . --d1=DB --r2=STORAGE --port=8788
```

**⚠️ CRITICAL**: ALWAYS use port 8788 for development
- Other ports will not have D1/R2 bindings available
- Frontend code expects API endpoints at port 8788

#### Database Operations
```bash
# Reset local database (SAFE during development - no migration needed)
rm -rf .wrangler/state/v3/d1  # Delete local database
wrangler d1 execute vocal-class-db --local --file=./schema.sql  # Recreate

# Initialize D1 database (local)
wrangler d1 execute vocal-class-db --local --file=./schema.sql

# Seed initial data (categories)
wrangler d1 execute vocal-class-db --local --command "INSERT INTO lesson_categories (name, icon, description) VALUES ('보컬', '🎤', '보컬 트레이닝'), ('PT', '💪', '퍼스널 트레이닝'), ('드로잉', '🎨', '그림 레슨'), ('피아노', '🎹', '피아노 레슨'), ('기타', '🎸', '기타 레슨'), ('요가', '🧘', '요가 레슨');"

# Run manual SQL query (local)
wrangler d1 execute vocal-class-db --local --command "SELECT * FROM users"

# Initialize D1 database (production)
wrangler d1 execute vocal-class-db --file=./schema.sql

# Run manual SQL query (production)
wrangler d1 execute vocal-class-db --command "SELECT * FROM users"
```

**Development Database Guidelines:**
- Local database is stored in `.wrangler/state/v3/d1/`
- Safe to delete and recreate anytime during development
- No need for migrations - just reset when schema changes
- Always seed categories after reset

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
│   ├── auth.ts            # POST login, GET user list, PATCH user update
│   ├── attendance.ts      # POST/GET attendance records + signature upload to R2
│   ├── bookings.ts        # POST/GET/DELETE student lesson bookings
│   ├── recordings.ts      # POST/GET audio recordings to R2
│   └── schedule.ts        # POST/GET/DELETE teacher availability schedules
├── js/                    # Frontend JavaScript (being migrated)
│   ├── auth.js           # User authentication (localStorage → API)
│   ├── teacher.js        # Teacher schedule management (date-based)
│   ├── student.js        # Student booking system (date-based)
│   ├── students.js       # Student management (teacher view)
│   ├── admin.js          # Admin dashboard
│   ├── signature.js      # Canvas-based attendance signatures
│   ├── recorder.js       # MediaRecorder API for audio
│   ├── drawing.js        # Drawing board for lessons
│   └── examples.js       # YouTube video examples management
├── index.html            # Login page
├── teacher.html          # Teacher dashboard (calendar + student mgmt)
├── student.html          # Student dashboard (booking)
├── students.html         # Student management page
├── admin.html            # Admin dashboard
├── signature.html        # Attendance signature page
├── tools.html            # Lesson tools (drawing, recording, videos)
├── schema.sql            # D1 database schema
└── wrangler.toml         # Cloudflare configuration
```

### Key Architectural Patterns

**API Endpoints (Pages Functions)**
- Functions in `functions/api/*.ts` automatically map to `/api/*` routes
- Each function exports `onRequestPost`, `onRequestGet`, etc. for HTTP methods
- Access D1 via `context.env.DB` and R2 via `context.env.STORAGE`
- TypeScript interfaces define request/response types

**Database Schema (schema.sql)**
- `users`: Teachers and students (role-based)
  - Added fields: `end_date`, `bank_account`, `payment_status`
  - Supports attendance tracking via subquery
- `schedules`: Teacher availability by **specific date** (not day of week)
  - Uses `specific_date` (DATE) + `time_slot` (TEXT)
  - Changed from weekly recurring to date-based scheduling
- `bookings`: Student lesson reservations
  - Uses `booking_date` + `time_slot` (no schedule_id foreign key)
  - Includes `status` field ('confirmed', 'cancelled')
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

### API Endpoints Reference

**Authentication (`functions/api/auth.ts`)**
- `POST /api/auth` - Login (username, password, role)
- `GET /api/auth?role=student` - Get student list with attendance counts
- `PATCH /api/auth?id={userId}` - Update user info (end_date, bank_account, payment_status, notes)

**Schedules (`functions/api/schedule.ts`)**
- `POST /api/schedule` - Create schedule for specific date
  ```json
  { "teacherId": 1, "date": "2025-10-29", "timeSlots": ["10:00", "10:30"] }
  ```
- `GET /api/schedule?teacherId=1&startDate=2025-10-01&endDate=2025-12-31`
- `DELETE /api/schedule?teacherId=1&date=2025-10-29&timeSlot=10:00`

**Bookings (`functions/api/bookings.ts`)**
- `POST /api/bookings` - Create booking (no scheduleId, uses date + timeSlot)
  ```json
  { "studentId": 1, "teacherId": 1, "bookingDate": "2025-10-29", "timeSlot": "10:00" }
  ```
- `GET /api/bookings?studentId=1` or `?teacherId=1`
- `DELETE /api/bookings?id={bookingId}` - Cancel booking (sets status='cancelled')

**Attendance (`functions/api/attendance.ts`)**
- `POST /api/attendance` - Submit attendance with signature (uploads to R2)
- `GET /api/attendance?studentId=1` or `?teacherId=1`

**Recordings (`functions/api/recordings.ts`)**
- `POST /api/recordings` - Upload audio file to R2
- `GET /api/recordings?userId=1`

## Important Notes

### Cloudflare Pages HTML Extension Handling
**CRITICAL**: Cloudflare Pages automatically redirects `.html` URLs with 308 Permanent Redirect:
- `teacher.html` → `teacher` (automatic redirect)
- All links and redirects MUST omit `.html` extension
- Use `window.location.href = 'teacher'` NOT `'teacher.html'`
- Use `<a href="/">` NOT `<a href="/index.html">`
- This applies to all navigation: `js/auth.js`, `js/signature.js`, `teacher.html`, `student.html`

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
- Always test with `wrangler pages dev . --port=8788` (not just `python -m http.server`)
- This ensures D1 and R2 bindings work correctly
- Local D1 uses `.wrangler/state/` for data persistence
- Access at `http://localhost:8788`
- Development mode detection: ports 3000, 5000, 5500, 8000, 8080, 8788 use localStorage
- Other ports/domains use API endpoints

## Development Workflow

1. Make changes to functions or frontend code
2. Test locally with `wrangler pages dev . --d1=DB --r2=STORAGE --port=8788`
3. For database changes, update schema.sql and re-run:
   ```bash
   wrangler d1 execute vocal-class-db --local --file=./schema.sql
   ```
4. Deploy with `wrangler pages deploy .`
5. Monitor logs with `wrangler pages deployment tail --project-name=vocal-class-cloudflare`

## Reference Documentation
- QUICKSTART.md: 5-minute deployment guide
- DEPLOYMENT.md: Full deployment and configuration details
- MIGRATION.md: Step-by-step localStorage to API migration
- WORK_LOG.md: Development history and troubleshooting notes
- README.md: Original project overview (Korean)
