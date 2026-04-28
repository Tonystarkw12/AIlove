---
task: Pivot AIlove to Molthub-style AI-agent-mediated dating platform (LobLove)
slug: 20260428-102720-pivot-to-loblove-agent-dating-platform
effort: comprehensive
phase: execute
progress: 22/64
mode: algorithm
started: 2026-04-28T10:27:20+08:00
updated: 2026-04-28T10:27:20+08:00
---

## Context

User wants to pivot the existing AIlove Pokemon-themed dating app into a Molthub-style platform where AI agents ("lobsters"/龙虾) act as matchmakers for their human owners. The platform provides an OpenClaw skill that, when installed, asks the owner for permission to share structured preferences (interests, photos, salary, etc.), then the lobster agents browse the platform, chat with other lobsters, run the matching algorithm, and facilitate introductions by exchanging WeChat IDs when both owners approve. Revenue model: free trial period then subscription-only access.

Key decision: Option B - retain existing app infrastructure (matching algorithm, user system, profile management, etc.) and add a lobster agent layer on top, transforming "human finds human" into "lobster finds lobster".

### What exists
- Full auth system (email/password + WeChat OAuth + JWT)
- User profiles with 15+ fields including PostGIS location
- Two-tier matching algorithm (LLM + traditional fallback) with Redis caching
- Pokemon personality-to-avatar mapping
- Real-time WebSocket chat
- Gamification system (points, levels, Pokeballs)
- Dating spots and task system with geofencing

### What needs to be built
1. OpenClaw skill for lobster agent integration
2. Lobster agent proxy layer (one lobster per human owner)
3. Lobster-to-lobster social interaction and chat system
4. Structured preference exchange with owner consent flow
5. Subscription paywall (free trial + recurring billing)
6. WeChat ID exchange workflow (lobster-mediated)
7. Platform branding update (Molthub-style hub)

### Risks
- OpenClaw API/SDK may not exist or be undocumented
- Lobster agent autonomy level unclear (fully autonomous vs. owner-approved actions)
- Subscription billing integration complexity
- Privacy/compliance for sensitive personal data sharing

## Criteria

### OpenClaw Skill
- [ ] ISC-1: OpenClaw skill manifest file created with name, description, version
- [ ] ISC-2: Skill includes owner consent prompt flow for data sharing authorization
- [ ] ISC-3: Skill collects structured preferences (interests, values, lifestyle) from owner
- [ ] ISC-4: Skill collects photos from owner with explicit consent per photo
- [ ] ISC-5: Skill collects salary/income range from owner with consent
- [ ] ISC-6: Skill syncs collected data to MolLove platform via API endpoint
- [ ] ISC-7: Skill handles owner denial gracefully without crashing
- [x] ISC-8: Skill includes installation instructions and documentation

### Lobster Agent Layer
- [x] ISC-9: LobsterAgent model created linking one lobster to one human user
- [x] ISC-10: LobsterAgent has personality derived from owner's preferences
- [x] ISC-11: LobsterAgent has unique profile page on platform
- [ ] ISC-12: LobsterAgent can browse other lobsters on the platform
- [ ] ISC-13: LobsterAgent status tracks active/idle/matching/introducing states
- [ ] ISC-14: LobsterAgent avatar generated from owner's personality type (reuse Pokemon mapping)

### Lobster Social System
- [ ] ISC-15: Lobster-to-lobster chat API endpoint created
- [ ] ISC-16: Lobster-to-lobster chat UI component rendered on platform
- [ ] ISC-17: Lobster chat uses matching algorithm to evaluate compatibility
- [ ] ISC-18: Lobster chat auto-generates compatibility report after N exchanges
- [ ] ISC-19: Compatibility report visible to both lobster owners
- [ ] ISC-20: Lobster chat history persisted in database
- [ ] ISC-21: Lobster can initiate introduction request to another lobster

### Owner Consent & Preference Exchange
- [ ] ISC-22: Owner consent stored with timestamp and scope in database
- [ ] ISC-23: Consent scope defines which fields are shareable (photos, salary, etc.)
- [ ] ISC-24: Owner can modify consent scope after initial grant
- [ ] ISC-25: Owner notification system for lobster match events
- [ ] ISC-26: Preference data encrypted at rest for sensitive fields (salary, photos)

### Matching Algorithm Integration
- [ ] ISC-27: Existing matching algorithm adapted for lobster-to-lobster matching
- [ ] ISC-28: Match results stored per lobster pair, not per human pair
- [ ] ISC-29: Match score triggers introduction suggestion at threshold >70
- [ ] ISC-30: Icebreaker messages generated from lobster preference overlap
- [ ] ISC-31: Match recommendation API returns lobster-perspective results

### WeChat ID Exchange Workflow
- [ ] ISC-32: Lobster requests owner's WeChat ID via notification/prompt
- [ ] ISC-33: WeChat ID stored encrypted after owner provides it
- [ ] ISC-34: Both owners must approve before WeChat IDs are exchanged
- [ ] ISC-35: WeChat exchange notification sent to both owners
- [ ] ISC-36: Exchange event logged in database with timestamp

### Subscription Paywall
- [x] ISC-37: User model extended with subscription fields (tier, trial_start, trial_end, subscription_status)
- [x] ISC-38: Free trial period of 7 days configured and enforced
- [x] ISC-39: Subscription middleware blocks platform access after trial expires
- [x] ISC-40: Payment integration endpoint for subscription checkout
- [x] ISC-41: Subscription renewal webhook handler created
- [x] ISC-42: Subscription downgrade/cancellation flow implemented
- [ ] ISC-43: Trial countdown UI shown to free users

### Platform Branding & UI
- [ ] ISC-44: Platform renamed from AIlove to MolLove/LobLove branding
- [ ] ISC-45: Homepage redesigned as Molthub-style agent discovery hub
- [ ] ISC-46: Lobster profile card component created with personality summary
- [ ] ISC-47: Lobster directory/browsing page created
- [ ] ISC-48: Navigation updated with lobster-themed sections
- [ ] ISC-49: Color scheme updated to ocean/lobster theme
- [ ] ISC-50: Logo/branding assets updated or placeholder created

### API Infrastructure
- [x] ISC-51: New API route group `/api/lobsters` created for lobster operations
- [x] ISC-52: API authentication validates lobster identity, not just human user
- [x] ISC-53: Webhook endpoint for OpenClaw skill callbacks registered
- [ ] ISC-54: Rate limiting applied to lobster chat endpoints
- [ ] ISC-55: API versioning established for external skill integration

### Database Schema
- [x] ISC-56: New `lobsters` table created with foreign key to `users`
- [x] ISC-57: New `lobster_chats` table created for lobster conversation history
- [x] ISC-58: New `consents` table created for owner permission records
- [x] ISC-59: New `introductions` table created for WeChat exchange workflow
- [x] ISC-60: Migration script created and tested for schema changes
- [ ] ISC-61: Existing `recommendations` table adapted for lobster perspective

### Testing
- [ ] ISC-62: Unit tests for LobsterAgent model created
- [ ] ISC-63: Integration tests for lobster chat API endpoints created
- [ ] ISC-64: E2E test for full flow: skill install → consent → match → WeChat exchange

## Decisions

### OpenClaw Integration (CONFIRMED via research)
- OpenClaw has a public SDK and skill system. Skills are SKILL.md files with YAML frontmatter
- Skills can use AskUserQuestion to collect preferences from owners
- Skills can call external APIs via curl/fetch/TypeScript handlers
- ClawHub (clawhub.ai) is the official registry - install via `openclaw skills install`
- Skills are written in natural language, TypeScript, or shell scripts
- We will build a MolLove skill as a SKILL.md directory package, publish to ClawHub

### Payment Strategy (CONFIRMED via research)
- Stripe CANNOT do WeChat Pay/Alipay recurring subscriptions
- Recommended: Dual-provider architecture
  - Alipay: Antom Subscription API (trials, auto-renewal, webhooks)
  - WeChat: Mini Program Virtual Payment (if DAU > 10k) or Auto-Debit API
- 7-day trial via Antom `subscriptionStartTime` or WeChat trial config
- Legal: Must notify 5 days before auto-renewal (China requirement)

### Lobster Agent Architecture
- Scheduler-driven (cron every 5-10 min), NOT always-on WebSocket
- 7-phase lifecycle: Discovery → Initiation → Conversation → Evaluation → Recommendation → Negotiation → Introduction
- Reuses existing matchingAlgorithm.js for candidate scoring
- Multi-turn LLM conversation (8 turns max) between agent pairs

## Context (Risks)

### Risks
- OpenClaw skill ecosystem exists but maturity for data collection needs validation
- Subscription billing requires Chinese payment provider integration (complex)
- PIPL compliance needed for sensitive personal data (photos, income)
- Lobster conversation quality critical to user retention
- Network effect challenge: need critical mass of lobsters before value kicks in
- WeChat Mini Program Virtual Payment requires DAU > 10,000 threshold
