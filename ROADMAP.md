# PalaPoint - Master Roadmap

## 🎾 Project Vision
Complete padel scoring system for clubs with remote management, analytics, and advertising capabilities.

---

## ✅ What We Built (V3 - Complete)

### Core Game Features
- **Setup Flow** - Quick Play and Custom game configuration
- **Server Announcement** - Random coin toss with animation
- **Game Scoreboard** - Real-time scoring with serving indicators
- **Side Swap** - Automatic overlay after odd games & every 6 tiebreak points
- **Set Win** - Celebration screen with set score
- **Match Win** - 4-slide stats slideshow (auto-cycles every 15s)
- **Point Indicators** - SET POINT, MATCH POINT, TIEBREAK badges
- **Screensaver** - Ad rotation (30s setup / 10min game / 5min match win)

### Game Modes
- Standard padel scoring
- Advantage / Silver Point / Golden Point (deuce rules)
- 1 or 3 set matches
- Tiebreak or Play-On at 6-6

### Stats Tracking
- Match duration, total points, points won
- Service points, breaks, longest streak
- Point-by-point momentum visualization

### Design System
- Clean dark theme with green/purple team colors
- `/dev/*` routes for isolated component testing
- Fully responsive layouts

### Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Clean engine architecture (game logic separated from UI)
- Zustand for state management

---

## 🚀 What We're Building Next (Central Management System)

### The Vision
Single dashboard to manage multiple venues and courts remotely. No more on-site visits for updates or maintenance.

### Architecture Overview
```
Dashboard (Web App)
    ↕
Supabase (Database + Storage + Auth)
    ↕
pala-agent (on each Pi)
    ↕
V3 Game App
```

---

## 📅 Implementation Phases (6-7 weeks)

### **Phase 1: Monitoring (Weeks 1-2)**
**Goal:** See all courts online/offline status

**Features:**
- Real-time court status (green = online, red = offline)
- Last heartbeat timestamp
- Software version display
- Error logs
- Health history

**Technical:**
- Supabase project setup
- Database schema with RLS
- 3 Edge Functions (heartbeat, match, command-result)
- pala-agent with 60s heartbeat
- Admin dashboard skeleton

**Deliverable:** Dashboard showing multiple courts with live status

---

### **Phase 2: Analytics (Weeks 3-4)**
**Goal:** Track all games played with full stats

**Features:**
- Matches played per court/venue
- Game mode usage
- Average match duration
- Peak usage times
- Export to CSV

**Technical:**
- Match data ingestion via Edge Function
- Offline queue (`pending.jsonl`) with rotation
- Analytics views with charts (Recharts)
- Match upload at set/match end only

**Deliverable:** Full game analytics visible in dashboard

---

### **Phase 3: Remote Updates (Week 5)**
**Goal:** Deploy software updates without touching Pi

**Features:**
- See current version on each court
- One-click deploy (single court / venue / global)
- Version history with commit SHA
- Rollback capability
- Update status tracking

**Technical:**
- Commands queue table
- Agent polls for updates every 20-30s
- Git pull → npm build → pm2 restart
- Reports commit SHA after update

**Deliverable:** One-click software deployment from dashboard

---

### **Phase 4: Ad Management (Week 6)**
**Goal:** Venue owners upload screensaver ads remotely

**Features:**
- Drag & drop image upload
- Preview before deploy
- Replace ad1.jpg, ad2.jpg, ad3.jpg per court
- One-click deploy to court
- Manifest with cache busting (only download changed files)

**Technical:**
- Supabase Storage integration
- Manifest.json with image hashes
- Agent checks manifest every 5 min
- Downloads only changed images

**Deliverable:** Remote ad management for venue owners

---

### **Phase 5: Multi-Venue & Polish (Week 7)**
**Goal:** Production-ready for multiple venues

**Features:**
- Venue manager accounts (limited to their venue)
- Super admin (full access)
- Mobile-responsive dashboard
- Setup documentation

**Deliverable:** Fully scalable, production-ready system

---

## 🏗️ Technical Architecture

### Core Components

**pala-agent** (runs on each Pi)
- Location: `/var/lib/palapoint/agent/`
- Heartbeat: Every 60s
- Commands poll: Every 20-30s
- Ad sync: Every 5 min
- Offline queue with rotation (5MB cap)

**Edge Functions** (Supabase)
- `/heartbeat` - Validates token, updates status
- `/match` - Ingests game data
- `/command-result` - Updates command status

**Dashboard** (Next.js)
- Admin interface
- Analytics visualizations
- Deployment controls
- User management

---

## 🗄️ Database Schema (Key Tables)
```sql
venues              # Padel clubs
courts              # Individual courts (no pi_token, no status)
court_secrets       # pi_token isolated (RLS: service role only)
commands            # Generic queue (update/adsync/ping/reboot)
matches             # Game data
status_logs         # Health history
version_history     # Update audit trail (includes commit_sha)
ad_images           # Uploaded ads
users               # Admin access (super_admin/venue_manager/staff)
```

**Key Design Decisions:**
- Status derived from `last_heartbeat` age (not stored)
- Secrets isolated from tenant-visible rows
- Generic command queue for all operations
- Edge Functions validate `pi_token` (not direct PostgREST)

---

## 🔐 Security Model

- Each Pi has unique `pi_token` (stored in `court_secrets`)
- Edge Functions validate token on every request
- Row-Level Security (RLS) by venue
- Venue managers can only see their venue
- Super admin sees everything

---

## 💰 Cost & Infrastructure

**Development:** Solo developer (you) with AI assist

**Monthly Operating:**
- Supabase free tier: Handles 10-20 courts easily
- Supabase Pro ($25/mo): When scaling to 50+ courts
- Internet: Already available at venues ✅

**Per Court:**
- Raspberry Pi: ~£100 (one-time)
- pala-agent: Free, minimal resources

---

## 📍 Current Status

**Phase:** Planning Complete ✅  
**Next Action:** Start Phase 1 - Monitoring  
**Ready to begin:** Pending your go-ahead

**Prerequisites:**
- [ ] Supabase project created
- [ ] Test Pi available
- [ ] Internet connectivity confirmed
- [ ] Repository ready for `/docs` folder

---

## 🔮 Future Features (Post-Launch)

**Planned for Later:**
- Tournament management
- Booking system integrations (MATCHi, Playtomic, etc.)
- Player profiles & ratings
- Court scheduling
- Video ads support
- SMS/email alerts
- Multi-court leaderboards

**Architecture already supports these** - just new tables and dashboard views.

---

## 🎯 Success Metrics

**For You:**
- ✅ No manual updates (save hours per week)
- ✅ Monitor all courts remotely
- ✅ Track usage data
- ✅ Quick debugging with logs

**For Venue Owners:**
- ✅ Self-service ad management
- ✅ Usage analytics for scheduling
- ✅ Generate ad revenue
- ✅ Professional system

**For Scale:**
- ✅ Add new courts in minutes
- ✅ Support 100+ venues
- ✅ Centralized control
- ✅ SaaS potential

---

## 📝 Key Technical Choices

**Why Supabase?**
- Free tier sufficient for pilot
- Auth + Database + Storage in one
- Real-time subscriptions
- Row-Level Security built-in
- Easy to scale

**Why Edge Functions over direct PostgREST?**
- Validate `pi_token` securely
- Custom logic without complex SQL policies
- Cleaner ingress point for agents

**Why offline queue?**
- Matches never lost
- Resilient to network issues
- Sync when connection restored

**Why derived status?**
- Prevents stale "stuck red" states
- Always accurate
- Computed from `last_heartbeat`

**Why generic command queue?**
- Single system for updates, ads, reboots
- Simple agent polling
- Extensible for future commands

---

## 🔄 How to Use This Doc Across Chat Sessions

**Start of new chat:**
1. Paste the `## Current Status` section
2. Say "continue from here"

**End of chat:**
1. Update `## Current Status`
2. Add notes to relevant phase
3. Commit to repo

**That's it.** Simple, low-maintenance, always synchronized.

---

**Last Updated:** 2025-01-15  
**Version:** V3 Complete + Central System Planned  
**Next Milestone:** Phase 1 - Monitoring MVP
```

---

✅ **Done!** 

Save this as `ROADMAP.md` in your repo root. 

**In your next chat, just paste:**
```
Current Status from ROADMAP.md:
Phase: Planning Complete
Next: Start Phase 1 - Monitoring