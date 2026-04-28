# LobLove Platform Architecture

**Date**: 2026-04-28
**Status**: Architectural Design
**Author**: Serena Blackwood (Architect Agent)

---

## Executive Summary

LobLove transforms the existing Pokemon-themed dating platform into an AI-agent-mediated dating experience. Each human user ("owner") is assigned a "Lobster" AI agent that acts as their proxy in the dating ecosystem. Lobster agents chat with each other, evaluate compatibility, negotiate introductions, and only exchange owner contact information (WeChat ID) after explicit owner approval.

The fundamental constraint driving this architecture: **AI agents must reduce user anxiety and decision fatigue while preserving human agency at the point of contact exchange.**

---

## 1. System Architecture Overview

```
  Owner A                          Owner B
    |                                |
    v                                v
  Lobster A <---------> Lobster B    |
  (AI Agent)  Agent-to-Agent Chat   (AI Agent)
    |              |                  |
    v              v                  v
  Owner A Approval  <-->  Owner B Approval
    |                                |
    v                                v
  WeChat ID Exchange (Consent-based)
```

### Component Diagram

```
  +----------+     +-------------------------+     +----------+
  | React FE |<--->|   Express.js Backend     |<--->|PostgreSQL|
  | (TS/Vite)|     |   (Port 3000)           |     |+ PostGIS |
  +----------+     |                         |     +----------+
                   |  +-------------------+  |
                   |  | Lobster Agent     |  |
                   |  | Orchestrator      |  |     +----------+
                   |  +-------------------+  |     |  Redis   |
                   |  +-------------------+  |     |(Cache +  |
                   |  | Matching Service  |  |     | PubSub)  |
                   |  | (existing + LLM)  |  |     +----------+
                   |  +-------------------+  |
                   |  +-------------------+  |
                   |  | Chat Service      |  |     +----------+
                   |  | (WS + REST)       |  |<--->| LLM API  |
                   |  +-------------------+  |     | (GLM-4.x)|
                   |  +-------------------+  |     +----------+
                   |  | Subscription Svc  |  |
                   |  | (trial + paid)    |  |     +----------+
                   |  +-------------------+  |     | OpenClaw |
                   |                         |     | Skills   |
                   +-------------------------+     +----------+
```

---

## 2. Database Schema Additions

All new tables use UUID primary keys, `created_at` / `updated_at` timestamps, and cascading deletes where appropriate. New migration file:

**File**: `/home/tony/AIlove/backend/migrations/add_loblove_system.sql`

### 2.1 `lobsters` Table

Each registered user gets exactly one lobster agent. The lobster is created automatically on user registration.

```sql
CREATE TABLE lobsters (
    lobster_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(50) NOT NULL DEFAULT '',           -- Auto-generated or owner-chosen name
    personality_profile JSONB,                       -- Personality traits, tone, communication style
    avatar_url TEXT,                                 -- Lobster avatar image

    -- State
    status VARCHAR(20) DEFAULT 'active',             -- active, paused, suspended
    total_matches_evaluated INT DEFAULT 0,           -- Counter for stats
    total_introductions_facilitated INT DEFAULT 0,   -- Counter for stats
    last_active_at TIMESTAMPTZ DEFAULT NOW(),

    -- Preferences (collected from owner via OpenClaw / manual)
    matching_criteria JSONB,                         -- Owner's refined preferences for lobster to use
    dealbreakers TEXT[],                             -- Hard filters the lobster must respect
    conversation_style VARCHAR(30) DEFAULT 'friendly', -- friendly, direct, playful, serious

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lobsters_owner ON lobsters(owner_id);
CREATE INDEX idx_lobsters_status ON lobsters(status);

COMMENT ON TABLE lobsters IS 'AI lobster agents representing human owners in the dating platform';
COMMENT ON COLUMN lobsters.personality_profile IS 'JSON with tone, humor level, formality, conversation style traits';
COMMENT ON COLUMN lobsters.matching_criteria IS 'Owner-refined preferences: age range, distance, must-haves, dealbreakers';
COMMENT ON COLUMN lobsters.dealbreakers IS 'Array of hard no-go criteria, e.g., ["smoking", "wants_kids"]';
```

### 2.2 `lobster_chats` Table

Stores all agent-to-agent conversations. These are NOT visible to owners by default (only summaries).

```sql
CREATE TABLE lobster_chats (
    chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobster_a_id UUID NOT NULL REFERENCES lobsters(lobster_id) ON DELETE CASCADE,
    lobster_b_id UUID NOT NULL REFERENCES lobsters(lobster_id) ON DELETE CASCADE,

    -- Conversation
    messages JSONB NOT NULL DEFAULT '[]',            -- Array of {role, content, timestamp, metadata}
    session_status VARCHAR(20) DEFAULT 'active',     -- active, completed, abandoned, flagged
    compatibility_score INT,                         -- 0-100 evaluated by lobsters during chat
    compatibility_analysis TEXT,                     -- LLM-generated analysis summary

    -- Outcome
    outcome VARCHAR(30) DEFAULT 'pending',           -- pending, recommended, rejected, introduced
    recommended_at TIMESTAMPTZ,                      -- When lobster recommended to owner
    owner_a_response VARCHAR(20),                    -- approved, rejected, pending
    owner_b_response VARCHAR(20),                    -- approved, rejected, pending

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT no_self_chat CHECK (lobster_a_id != lobster_b_id)
);

CREATE INDEX idx_lobster_chats_participant_a ON lobster_chats(lobster_a_id);
CREATE INDEX idx_lobster_chats_participant_b ON lobster_chats(lobster_b_id);
CREATE INDEX idx_lobster_chats_status ON lobster_chats(session_status);
CREATE INDEX idx_lobster_chats_outcome ON lobster_chats(outcome);
CREATE INDEX idx_lobster_chats_score ON lobster_chats(compatibility_score DESC);
CREATE INDEX idx_lobster_chats_created ON lobster_chats(created_at DESC);

COMMENT ON TABLE lobster_chats IS 'Agent-to-agent conversations with compatibility evaluation';
COMMENT ON COLUMN lobster_chats.messages IS 'Array of {sender: "a"|"b"|"system", content: string, timestamp: ISO8601, metadata: {}}';
```

### 2.3 `consents` Table

Tracks explicit owner consent for WeChat ID exchange.

```sql
CREATE TABLE consents (
    consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES lobster_chats(chat_id) ON DELETE CASCADE,

    -- The two owners involved
    owner_a_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    owner_b_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Consent state machine
    owner_a_wechat_consent BOOLEAN DEFAULT NULL,     -- NULL=not asked, TRUE=consented, FALSE=declined
    owner_b_wechat_consent BOOLEAN DEFAULT NULL,
    owner_a_consent_at TIMESTAMPTZ,
    owner_b_consent_at TIMESTAMPTZ,

    -- Execution
    wechat_exchanged BOOLEAN DEFAULT FALSE,
    wechat_exchange_at TIMESTAMPTZ,

    -- Revocation (owners can revoke consent)
    owner_a_revoked BOOLEAN DEFAULT FALSE,
    owner_b_revoked BOOLEAN DEFAULT FALSE,
    owner_a_revoked_at TIMESTAMPTZ,
    owner_b_revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_consent_per_chat UNIQUE (chat_id)
);

CREATE INDEX idx_consents_owner_a ON consents(owner_a_id);
CREATE INDEX idx_consents_owner_b ON consents(owner_b_id);
CREATE INDEX idx_consents_exchanged ON consents(wechat_exchanged) WHERE wechat_exchanged = TRUE;

COMMENT ON TABLE consents IS 'Explicit owner consent for WeChat ID exchange after lobster matching';
```

### 2.4 `introductions` Table

Records the actual introduction events and their outcomes.

```sql
CREATE TABLE introductions (
    introduction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_id UUID NOT NULL REFERENCES consents(consent_id) ON DELETE CASCADE,
    lobster_a_id UUID NOT NULL REFERENCES lobsters(lobster_id) ON DELETE CASCADE,
    lobster_b_id UUID NOT NULL REFERENCES lobsters(lobster_id) ON DELETE CASCADE,

    -- What was exchanged
    owner_a_wechat_id VARCHAR(100),                  -- WeChat ID (encrypted at rest in production)
    owner_b_wechat_id VARCHAR(100),

    -- Follow-up
    status VARCHAR(20) DEFAULT 'exchanged',          -- exchanged, connected, no_response, blocked
    owner_a_feedback TEXT,                           -- Owner A post-introduction feedback
    owner_b_feedback TEXT,                           -- Owner B post-introduction feedback
    feedback_submitted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_introductions_consent ON introductions(consent_id);
CREATE INDEX idx_introductions_status ON introductions(status);

COMMENT ON TABLE introductions IS 'Records of actual WeChat introductions and their outcomes';
```

### 2.5 `subscriptions` Table

Manages the subscription lifecycle.

```sql
CREATE TABLE subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,

    -- Plan details
    plan_type VARCHAR(20) DEFAULT 'free_trial',      -- free_trial, monthly, quarterly, annual
    status VARCHAR(20) DEFAULT 'active',             -- active, expired, cancelled, past_due

    -- Trial tracking
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ GENERATED ALWAYS AS (trial_started_at + INTERVAL '7 days') STORED,

    -- Paid subscription
    paid_starts_at TIMESTAMPTZ,
    paid_ends_at TIMESTAMPTZ,
    payment_method VARCHAR(30),                      -- wechat_pay, alipay
    external_transaction_id VARCHAR(100),            -- Payment gateway reference

    -- Usage limits
    max_lobster_chats_per_day INT DEFAULT 10,        -- Rate limiting for free tier
    max_introductions_per_month INT DEFAULT 3,        -- Introduction quota

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_trial_end ON subscriptions(trial_ends_at);
CREATE INDEX idx_subscriptions_paid_end ON subscriptions(paid_ends_at) WHERE paid_ends_at IS NOT NULL;

COMMENT ON TABLE subscriptions IS 'User subscription management with 7-day free trial';
```

### 2.6 `subscription_events` Table (Audit Trail)

```sql
CREATE TABLE subscription_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,                 -- trial_started, trial_ended, payment_received, subscription_cancelled, subscription_renewed, payment_failed
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_events_sub ON subscription_events(subscription_id);
CREATE INDEX idx_subscription_events_type ON subscription_events(event_type);

COMMENT ON TABLE subscription_events IS 'Audit trail for subscription lifecycle events';
```

### 2.7 `lobster_preferences` Table (OpenClaw skill data)

```sql
CREATE TABLE lobster_preferences (
    pref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobster_id UUID NOT NULL UNIQUE REFERENCES lobsters(lobster_id) ON DELETE CASCADE,

    -- Collected via OpenClaw skill conversations
    owner_values JSONB,                              -- Deep values extracted from conversations
    owner_communication_style JSONB,                 -- How owner prefers to communicate
    owner_dating_goals VARCHAR(30),                  -- casual, serious, marriage-minded
    owner_lifestyle JSONB,                           -- Daily routine, hobbies, social preferences
    owner_ideal_partner JSONB,                       -- Description of ideal match
    dealbreaker_list TEXT[],                         -- Hard no-go items

    -- Metadata
    last_updated_by VARCHAR(20) DEFAULT 'manual',    -- manual, openclaw_skill, hybrid
    conversation_count INT DEFAULT 0,                -- How many OpenClaw conversations completed
    confidence_score FLOAT DEFAULT 0.0,              -- 0-1 confidence in preference accuracy

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lobster_prefs_lobster ON lobster_preferences(lobster_id);

COMMENT ON TABLE lobster_preferences IS 'Deep preference data collected via OpenClaw skill conversations';
```

### 2.8 Schema Migration - Owner table updates

Add subscription-related fields to the existing `users` table:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
```

---

## 3. API Endpoints

### 3.1 Lobster Agent Endpoints (`/api/lobsters/*`)

**File**: `/home/tony/AIlove/backend/routes/lobsters.js`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/lobsters/initialize` | Create lobster for current user (auto-called on registration) | Yes |
| GET | `/api/lobsters/me` | Get current user's lobster profile | Yes |
| PUT | `/api/lobsters/me` | Update lobster personality/name | Yes |
| GET | `/api/lobsters/me/chats` | List lobster's active/past conversations | Yes |
| GET | `/api/lobsters/me/chats/:chatId` | Get specific chat details | Yes |
| GET | `/api/lobsters/me/stats` | Get lobster activity statistics | Yes |
| POST | `/api/lobsters/me/pause` | Pause lobster activity | Yes |
| POST | `/api/lobsters/me/resume` | Resume lobster activity | Yes |
| GET | `/api/lobsters/me/recommendations` | Get lobster-curated match recommendations | Yes |
| POST | `/api/lobsters/me/respond` | Respond to a lobster recommendation (approve/reject) | Yes |

### 3.2 Consent Endpoints (`/api/consents/*`)

**File**: `/home/tony/AIlove/backend/routes/consents.js`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/consents/pending` | List pending consent requests | Yes |
| POST | `/api/consents/:consentId/respond` | Respond to consent request (approve/decline) | Yes |
| POST | `/api/consents/:consentId/revoke` | Revoke previously given consent | Yes |
| GET | `/api/consents/history` | Get consent history | Yes |

### 3.3 Subscription Endpoints (`/api/subscriptions/*`)

**File**: `/home/tony/AIlove/backend/routes/subscriptions.js`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/subscriptions/me` | Get current subscription status | Yes |
| POST | `/api/subscriptions/start-trial` | Start 7-day free trial | Yes |
| POST | `/api/subscriptions/upgrade` | Upgrade to paid plan | Yes |
| POST | `/api/subscriptions/cancel` | Cancel subscription | Yes |
| POST | `/api/subscriptions/webhook` | Payment provider webhook handler | No (verified) |
| GET | `/api/subscriptions/usage` | Get current usage vs. limits | Yes |

### 3.4 Introduction Endpoints (`/api/introductions/*`)

**File**: `/home/tony/AIlove/backend/routes/introductions.js`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/introductions/me` | List user's introductions | Yes |
| POST | `/api/introductions/:id/feedback` | Submit post-introduction feedback | Yes |

### 3.5 OpenClaw Skill Endpoints (`/api/openclaw/*`)

**File**: `/home/tony/AIlove/backend/routes/openclaw.js`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/openclaw/collect-preferences` | Submit preference collection results | Yes (service) |
| GET | `/api/openclaw/preferences` | Get collected preferences | Yes |
| PUT | `/api/openclaw/preferences` | Update preferences manually | Yes |
| POST | `/api/openclaw/conversation` | Start/continue OpenClaw preference collection session | Yes |

---

## 4. Lobster Agent Architecture

### 4.1 Core Design Decision: Scheduler-Driven, Not Always-On

The fundamental constraint here is cost efficiency and reliability. Always-on WebSocket connections for every agent would waste resources when no matching is happening. Instead, we use a **scheduler-driven approach** with event-triggered responsiveness.

**Why scheduler-driven:**
- Matching is fundamentally a batch problem (compare against candidate pool)
- AI API calls are expensive and should be batched efficiently
- Agent conversations happen asynchronously, not in real-time
- Reduces infrastructure complexity and cloud costs
- Matches the existing recommendation service pattern (already cron-triggered)

### 4.2 Lobster Agent Lifecycle

```
  +------------------+
  | 1. DISCOVERY     |  Find compatible candidates via existing matching algorithm
  +--------+---------+
           |
           v
  +------------------+
  | 2. INITIATE      |  Start agent-to-agent chat with candidate's lobster
  +--------+---------+
           |
           v
  +------------------+
  | 3. CONVERSATION  |  Multi-turn LLM-powered conversation between agents
  +--------+---------+
           |
           v
  +------------------+
  | 4. EVALUATE      |  Assess compatibility, generate score and analysis
  +--------+---------+
           |
           v
  +------------------+
  | 5. RECOMMEND     |  If score > threshold, recommend to owner via notification
  +--------+---------+
           |
           v
  +------------------+
  | 6. NEGOTIATE     |  If both owners approve, facilitate WeChat ID exchange
  +--------+---------+
           |
           v
  +------------------+
  | 7. INTRODUCE     |  Exchange contact info, record introduction outcome
  +------------------+
```

### 4.3 Lobster Orchestrator Service

**File**: `/home/tony/AIlove/backend/services/lobsterOrchestrator.js`

This is the central brain of the lobster agent system. It is triggered by:

1. **Periodic Cron Job** (every 10 minutes) - The main matching loop
2. **Event Triggers** - New user registration, profile update, location change
3. **Owner Actions** - Manual "find matches" request, preference updates

```
Lobster Orchestrator Responsibilities:
- discoverCandidates(): Query matching algorithm for compatible users
- initiateChat(lobsterA, lobsterB): Create new lobster_chats record
- runConversation(chatId): Execute multi-turn agent-to-agent conversation
- evaluateCompatibility(chatId): Generate compatibility score and analysis
- recommendToOwner(chatId): Push recommendation to owner via WebSocket
- processOwnerResponse(consentId, response): Handle approve/reject
- facilitateIntroduction(consentId): Exchange WeChat IDs
- trackMetrics(): Update lobster statistics
```

### 4.4 Multi-Turn Agent Conversation Architecture

**File**: `/home/tony/AIlove/backend/services/lobsterConversationService.js`

Each lobster-to-lobster conversation follows a structured flow:

```
Phase 1: Introduction (1-2 turns)
  - Lobsters exchange greetings, share owner personality highlights
  - LLM generates contextually appropriate opening messages

Phase 2: Deep Exploration (3-6 turns)
  - Lobsters discuss values, lifestyle, goals on behalf of owners
  - Use owner's lobster_preferences to guide conversation authentically
  - Ask probing questions that humans might be too shy to ask directly

Phase 3: Assessment (1-2 turns)
  - Lobsters summarize compatibility assessment
  - Generate compatibility_score (0-100) and compatibility_analysis text
  - Decide whether to recommend to owner
```

**Conversation execution model:**

```javascript
// Pseudocode for conversation flow
async function runConversation(chatId) {
  const chat = await getChat(chatId);
  const lobsterA = await getLobster(chat.lobster_a_id);
  const lobsterB = await getLobster(chat.lobster_b_id);
  const prefsA = await getPreferences(lobsterA.lobster_id);
  const prefsB = await getPreferences(lobsterB.lobster_id);

  const maxTurns = 8;
  let turn = 0;
  let messages = [];

  while (turn < maxTurns) {
    // Determine who speaks next
    const speaker = turn % 2 === 0 ? lobsterA : lobsterB;
    const listener = turn % 2 === 0 ? lobsterB : lobsterA;
    const speakerPrefs = turn % 2 === 0 ? prefsA : prefsB;
    const listenerPrefs = turn % 2 === 0 ? prefsB : prefsA;

    // Generate next message via LLM
    const nextMessage = await generateAgentMessage({
      speaker,
      listener,
      speakerPrefs,
      listenerPrefs,
      conversationHistory: messages,
      turn,
      maxTurns,
    });

    messages.push(nextMessage);
    await saveChatMessages(chatId, messages);
    turn++;

    // Allow small delay between turns for rate limiting
    await sleep(1000);
  }

  // Final evaluation
  const evaluation = await evaluateConversation(messages, lobsterA, lobsterB);
  await updateChatEvaluation(chatId, evaluation);

  return evaluation;
}
```

### 4.5 Scheduler Implementation

**File**: `/home/tony/AIlove/backend/services/lobsterScheduler.js`

```
Scheduler Jobs:
- MatchRunJob (every 10 min): Process active lobsters through discovery -> recommendation
- ConversationJob (every 5 min): Advance active conversations by 1-2 turns
- EvaluationJob (every 5 min): Evaluate completed conversations
- NotificationJob (every 2 min): Push pending notifications to connected owners
- SubscriptionCheckJob (every hour): Check trial expirations, subscription renewals
- CleanupJob (daily): Archive stale conversations, purge expired data
```

**Implementation approach:** Use `node-cron` package added to package.json. No need for external schedulers like AWS EventBridge in the current deployment model.

```javascript
const cron = require('node-cron');

// Main matching loop - every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  await orchestrator.runMatchingCycle();
});

// Conversation advancement - every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  await orchestrator.advanceConversations();
});

// Subscription checks - every hour
cron.schedule('0 * * * *', async () => {
  await subscriptionService.checkExpirations();
});

// Daily cleanup - at 3 AM
cron.schedule('0 3 * * *', async () => {
  await cleanupService.runDailyCleanup();
});
```

---

## 5. Integration with Existing Code

### 5.1 Existing Matching Algorithm Integration

The lobster agents REUSE the existing `matchingAlgorithm.js` service. No duplication needed.

**Integration points:**

```
Existing matchingAlgorithm.js functions:
- calculateMatchScore(userA, userB) -> Used by lobster to pre-filter candidates
- calculateDistanceScore(userA, userB) -> Used as a hard filter
- calculateInterestScore(userA, userB) -> Input for lobster evaluation
- generateIcebreakers(userA, userB) -> Used to seed initial lobster conversation
```

**Modified flow:**

```
OLD: User -> RecommendationsService -> AI matching -> recommendations table -> User sees results
NEW: Lobster -> matchingAlgorithm.js -> candidates -> lobster_conversation -> evaluation -> owner recommendation
```

### 5.2 Recommendation Service Integration

**File**: `/home/tony/AIlove/backend/services/recommendationService.js`

The existing recommendation service continues to work for human-facing recommendations. The lobster system ADDS a parallel pipeline:

```
Pipeline 1 (Existing): Human recommendations via /api/recommendations
  - Coarse filter (geo, age, gender) -> AI fine-tuning -> recommendations table

Pipeline 2 (New): Lobster recommendations via /api/lobsters/me/recommendations
  - Coarse filter (same as Pipeline 1) -> Lobster-to-Lobster chat -> compatibility evaluation -> lobster_chats table
```

### 5.3 Chat Service Integration

**File**: `/home/tony/AIlove/backend/services/websocketService.js`

The existing WebSocket service is EXTENDED with a new message type for lobster-related events:

```
Existing WebSocket message types:
- sendMessage (human-to-human chat)
- markAsRead

New WebSocket message types:
- lobsterRecommendation (lobster recommends a match to owner)
- lobsterChatUpdate (lobster chat milestone notification)
- lobsterIntroductionReady (WeChat ID exchange is ready)
- lobsterStatusUpdate (lobster activity status change)
```

### 5.4 Existing Route Integration

**File**: `/home/tony/AIlove/backend/server.js`

New route registrations:

```javascript
const lobsterRoutes = require('./routes/lobsters');
const consentRoutes = require('./routes/consents');
const subscriptionRoutes = require('./routes/subscriptions');
const introductionRoutes = require('./routes/introductions');
const openclawRoutes = require('./routes/openclaw');

app.use('/api/lobsters', lobsterRoutes);
app.use('/api/consents', consentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/introductions', introductionRoutes);
app.use('/api/openclaw', openclawRoutes);
```

### 5.5 User Registration Hook

When a new user registers, automatically:
1. Create a lobster agent with default personality
2. Create an empty lobster_preferences record
3. Start the 7-day free trial
4. Queue initial OpenClaw preference collection session

**File**: `/home/tony/AIlove/backend/routes/auth.js` (modify existing registration)

---

## 6. Backend File Structure

```
/home/tony/AIlove/backend/
├── server.js                           # Add new route registrations
├── package.json                        # Add: node-cron, bull (optional)
├── migrations/
│   └── add_loblove_system.sql          # NEW: Full schema migration
├── services/
│   ├── lobsterOrchestrator.js          # NEW: Central agent orchestration
│   ├── lobsterConversationService.js   # NEW: Multi-turn agent conversation
│   ├── lobsterScheduler.js             # NEW: Cron job management
│   ├── lobsterMatchingService.js       # NEW: Lobster-specific matching logic
│   ├── subscriptionService.js          # NEW: Subscription lifecycle management
│   ├── consentService.js               # NEW: Consent state machine
│   ├── notificationService.js          # NEW: WebSocket push notifications
│   ├── cleanupService.js               # NEW: Data lifecycle management
│   ├── matchingAlgorithm.js            # EXISTING: Reused by lobsters
│   ├── recommendationService.js        # EXISTING: Parallel pipeline
│   └── websocketService.js             # EXISTING: Extended message types
├── routes/
│   ├── lobsters.js                     # NEW: Lobster agent CRUD
│   ├── consents.js                     # NEW: Consent management
│   ├── subscriptions.js                # NEW: Subscription management
│   ├── introductions.js                # NEW: Introduction tracking
│   ├── openclaw.js                     # NEW: OpenClaw skill integration
│   └── [existing routes]               # EXISTING
└── middleware/
    └── checkSubscription.js            # NEW: Subscription gate middleware
```

### 6.1 Service Module Details

**`lobsterOrchestrator.js`** - The central orchestrator (estimated ~400 lines)

```javascript
class LobsterOrchestrator {
  // Main matching cycle
  async runMatchingCycle() {
    1. Get all active lobsters with expired matching cache
    2. For each lobster, discover candidates via matchingAlgorithm.js
    3. For top candidates, check if lobster_chats already exist
    4. For new candidate pairs, initiate lobster-to-lobster conversations
    5. Advance existing active conversations
    6. Evaluate completed conversations
    7. Push recommendations to owners via WebSocket
  }

  // Individual operations
  async discoverCandidates(lobsterId, limit = 20)
  async initiateChat(lobsterAId, lobsterBId)
  async advanceConversation(chatId)
  async evaluateConversation(chatId)
  async recommendToOwner(chatId)
  async processOwnerResponse(consentId, response)
  async facilitateIntroduction(consentId)
}
```

**`lobsterConversationService.js`** - Multi-turn LLM conversation engine (estimated ~300 lines)

```javascript
class LobsterConversationService {
  async generateAgentMessage(context) {
    // LLM call with system prompt encoding lobster personality
    // and conversation history
  }

  async evaluateConversation(messages, lobsterA, lobsterB) {
    // LLM call to assess compatibility from conversation
  }

  async generateSummaryForOwner(messages, lobster) {
    // LLM call to create owner-readable summary
  }
}
```

**`subscriptionService.js`** - Subscription lifecycle management (estimated ~250 lines)

```javascript
class SubscriptionService {
  async createTrialSubscription(userId)
  async checkExpirations()              // Called by scheduler
  async upgradeSubscription(userId, planType)
  async cancelSubscription(userId)
  async checkAccess(userId)             // Middleware helper
  async getUsage(userId)                // Current usage vs. limits
  async incrementUsage(userId, resourceType)
}
```

### 6.2 Middleware

**`checkSubscription.js`** - Gate access based on subscription status

```javascript
function checkSubscription(requiredPlan = 'any') {
  return async (req, res, next) => {
    // Check if user has active subscription
    // If trial expired and no paid plan, return 402 Payment Required
    // If usage limits exceeded, return 429 Too Many Requests
  }
}
```

---

## 7. Frontend File Structure

```
/home/tony/AIlove/frontend-react/src/
├── pages/
│   ├── LobsterPage.tsx                 # NEW: Main lobster management page
│   ├── ConsentPage.tsx                 # NEW: Consent request management
│   ├── SubscriptionPage.tsx            # NEW: Subscription management
│   ├── IntroductionPage.tsx            # NEW: Introduction history
│   └── [existing pages]                # EXISTING
├── components/
│   ├── LobsterAvatar.tsx               # NEW: Lobster avatar display
│   ├── LobsterChatPreview.tsx          # NEW: Chat list item preview
│   ├── ConsentCard.tsx                 # NEW: Consent request card
│   ├── SubscriptionPlan.tsx            # NEW: Plan comparison card
│   ├── IntroductionHistory.tsx         # NEW: Introduction timeline
│   ├── LobsterStatusBadge.tsx          # NEW: Active/paused status
│   └── [existing components]           # EXISTING
├── services/
│   ├── lobsterApi.ts                   # NEW: Lobster API client
│   ├── consentApi.ts                   # NEW: Consent API client
│   ├── subscriptionApi.ts              # NEW: Subscription API client
│   └── [existing services]             # EXISTING
├── types/
│   └── lobster.ts                      # NEW: TypeScript type definitions
├── contexts/
│   └── LobsterContext.tsx              # NEW: Lobster state context
└── config.ts                           # MODIFY: Add new API endpoints
```

### 7.1 TypeScript Type Definitions

**File**: `/home/tony/AIlove/frontend-react/src/types/lobster.ts`

```typescript
export interface Lobster {
  lobsterId: string;
  ownerId: string;
  name: string;
  personalityProfile: PersonalityProfile;
  avatarUrl: string | null;
  status: 'active' | 'paused' | 'suspended';
  totalMatchesEvaluated: number;
  totalIntroductionsFacilitated: number;
  lastActiveAt: string;
  conversationStyle: 'friendly' | 'direct' | 'playful' | 'serious';
}

export interface PersonalityProfile {
  humorLevel: number;       // 0-10
  formalityLevel: number;   // 0-10
  directness: number;       // 0-10
  empathy: number;          // 0-10
}

export interface LobsterChat {
  chatId: string;
  lobsterAId: string;
  lobsterBId: string;
  messages: ChatMessage[];
  sessionStatus: 'active' | 'completed' | 'abandoned' | 'flagged';
  compatibilityScore: number | null;
  compatibilityAnalysis: string | null;
  outcome: 'pending' | 'recommended' | 'rejected' | 'introduced';
  ownerAResponse: 'approved' | 'rejected' | 'pending' | null;
  ownerBResponse: 'approved' | 'rejected' | 'pending' | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  sender: 'a' | 'b' | 'system';
  content: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface Consent {
  consentId: string;
  chatId: string;
  ownerAId: string;
  ownerBId: string;
  ownerAWechatConsent: boolean | null;
  ownerBWechatConsent: boolean | null;
  ownerAConsentAt: string | null;
  ownerBConsentAt: string | null;
  wechatExchanged: boolean;
  wechatExchangeAt: string | null;
  ownerARevoked: boolean;
  ownerBRevoked: boolean;
  createdAt: string;
}

export interface Subscription {
  subscriptionId: string;
  userId: string;
  planType: 'free_trial' | 'monthly' | 'quarterly' | 'annual';
  status: 'active' | 'expired' | 'cancelled' | 'past_due';
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  paidStartsAt: string | null;
  paidEndsAt: string | null;
  maxLobsterChatsPerDay: number;
  maxIntroductionsPerMonth: number;
}

export interface Introduction {
  introductionId: string;
  consentId: string;
  ownerAWechatId: string | null;
  ownerBWechatId: string | null;
  status: 'exchanged' | 'connected' | 'no_response' | 'blocked';
  ownerAFeedback: string | null;
  ownerBFeedback: string | null;
  createdAt: string;
}
```

### 7.2 New API Endpoints in config.ts

**File**: `/home/tony/AIlove/frontend-react/src/config.ts` (additions)

```typescript
export const API_ENDPOINTS = {
  // ... existing endpoints ...
  LOBSTERS: {
    ME: '/lobsters/me',
    INITIALIZE: '/lobsters/initialize',
    CHATS: '/lobsters/me/chats',
    STATS: '/lobsters/me/stats',
    RECOMMENDATIONS: '/lobsters/me/recommendations',
    RESPOND: '/lobsters/me/respond',
    PAUSE: '/lobsters/me/pause',
    RESUME: '/lobsters/me/resume',
  },
  CONSENTS: {
    PENDING: '/consents/pending',
    RESPOND: (id: string) => `/consents/${id}/respond`,
    REVOKE: (id: string) => `/consents/${id}/revoke`,
    HISTORY: '/consents/history',
  },
  SUBSCRIPTIONS: {
    ME: '/subscriptions/me',
    START_TRIAL: '/subscriptions/start-trial',
    UPGRADE: '/subscriptions/upgrade',
    CANCEL: '/subscriptions/cancel',
    USAGE: '/subscriptions/usage',
  },
  INTRODUCTIONS: {
    ME: '/introductions/me',
    FEEDBACK: (id: string) => `/introductions/${id}/feedback`,
  },
  OPENCLAW: {
    PREFERENCES: '/openclaw/preferences',
    CONVERSATION: '/openclaw/conversation',
    COLLECT: '/openclaw/collect-preferences',
  },
} as const;
```

### 7.3 Frontend Page Descriptions

**LobsterPage.tsx** - Main lobster management dashboard
- Displays lobster profile, name, personality, avatar
- Shows activity stats (matches evaluated, introductions facilitated)
- Lists active and recent conversations (summarized, not full chat logs)
- Toggle pause/resume lobster
- Shows pending recommendations from lobster

**ConsentPage.tsx** - Consent request management
- Lists pending consent requests (lobster found a match, asking for WeChat exchange)
- Approve or decline each request
- View conversation summary from lobster
- History of past consents and outcomes

**SubscriptionPage.tsx** - Subscription management
- Current plan status and usage
- Trial countdown (if in trial)
- Upgrade options (monthly/quarterly/annual)
- Payment integration (WeChat Pay QR codes, reusing existing pokeball payment pattern)

**IntroductionPage.tsx** - Introduction history
- Timeline of introductions
- Status tracking (exchanged, connected, no response, blocked)
- Post-introduction feedback form

---

## 8. Subscription Model Details

### 8.1 Plan Tiers

| Feature | Free Trial (7 days) | Monthly | Quarterly | Annual |
|---------|-------------------|---------|-----------|--------|
| Lobster chats/day | 10 | 30 | 50 | Unlimited |
| Introductions/month | 3 | 5 | 10 | 20 |
| Personality customization | Basic | Full | Full | Full |
| OpenClaw preference collection | 1 session | 3/month | 5/month | Unlimited |
| Priority matching | No | Yes | Yes | Yes |

### 8.2 Subscription Lifecycle

```
User Registers
    |
    v
Trial Starts (7 days, max_lobster_chats_per_day=10, max_introductions_per_month=3)
    |
    v
Trial Expires -> subscription_status = 'expired'
    |
    v
User Upgrades -> subscription_status = 'active', plan_type = 'monthly'
    |
    v
Payment Confirmed via Webhook -> paid_starts_at, paid_ends_at set
    |
    v
Auto-renewal at paid_ends_at (if configured) OR subscription expires
```

### 8.3 Enforcement Middleware

The `checkSubscription` middleware is applied to all lobster-related endpoints:
- `/api/lobsters/*` - Requires active subscription (trial or paid)
- `/api/consents/*` - Requires active subscription
- `/api/introductions/*` - Requires active subscription + checks monthly quota
- `/api/openclaw/*` - Requires active subscription + checks session quota

After trial expires, users can still:
- View their lobster profile
- View past conversations (read-only)
- View past introductions
- See pending recommendations (but cannot approve new ones)

They CANNOT:
- Start new lobster conversations
- Approve new introductions
- Access OpenClaw preference collection

---

## 9. WebSocket Event Extensions

The existing WebSocket service at `/ws/chat` is extended with new server-to-client message types:

```typescript
// Server pushes to client
type LobsterWebSocketMessage =
  | { type: 'lobster:recommendation'; payload: { chatId: string; summary: string; score: number } }
  | { type: 'lobster:chatComplete'; payload: { chatId: string; outcome: string } }
  | { type: 'lobster:consentRequested'; payload: { consentId: string; lobsterName: string; matchScore: number } }
  | { type: 'lobster:introductionReady'; payload: { introductionId: string; wechatId: string } }
  | { type: 'lobster:statusUpdate'; payload: { status: string; stats: LobsterStats } }
  | { type: 'subscription:trialExpiring'; payload: { daysRemaining: number } };
```

These are pushed via `sendMessageToUser(userId, messageObject)` from the orchestrator when events occur.

---

## 10. OpenClaw Skill Integration

### 10.1 Skill Purpose

The OpenClaw skill conducts conversational preference collection. Instead of boring forms, the lobster (or a dedicated OpenClaw agent) has natural conversations with the owner to extract:

- Values and priorities
- Communication preferences
- Dating goals (casual vs. serious vs. marriage-minded)
- Lifestyle patterns
- Ideal partner description
- Dealbreakers

### 10.2 Integration Points

**Backend**: `/api/openclaw/*` routes handle:
- Starting/continuing preference collection sessions
- Storing collected preferences in `lobster_preferences` table
- Updating `lobsters.matching_criteria` based on collected data
- Calculating `confidence_score` based on conversation depth

**Frontend**: Simple conversational UI embedded in LobsterPage:
- "Get to know me better" button starts OpenClaw session
- Chat-like interface for preference questions
- Visual progress bar showing preference completeness
- Summary view of collected preferences with edit capability

### 10.3 Data Flow

```
Owner <-> OpenClaw Skill (conversational UI)
    |
    v
API: POST /api/openclaw/conversation (sends owner response)
    |
    v
Backend: Extracts preferences from conversation via LLM
    |
    v
DB: Updates lobster_preferences table
    |
    v
Lobster: Uses updated preferences in next matching cycle
```

---

## 11. Sequence Diagrams

### 11.1 Lobster Matching Cycle

```
Scheduler              LobsterOrchestrator    MatchingAlgorithm    LobsterConversation    Database        WebSocket
    |                        |                       |                       |                 |                |
    |-- every 10min -------->|                       |                       |                 |                |
    |                        |-- get active lobsters->|                       |                 |                |
    |                        |<-- lobster list ------|                       |                 |-- query ------|
    |                        |                        |                       |                 |                |
    |                        |-- discover candidates->|                       |                 |                |
    |                        |                        |-- calculate scores -->|                 |-- query ------|
    |                        |                        |<-- scored candidates -|                 |                |
    |                        |                        |                       |                 |                |
    |                        |-- initiate new chats -->|                       |                 |-- insert -----|
    |                        |                        |                       |                 |                |
    |                        |-- advance conversations->|                      |                 |                |
    |                        |                        |                       |-- LLM generate ->|-- read msgs -|
    |                        |                        |                       |<-- new message ---|                |
    |                        |                        |                       |                 |-- save msgs --|
    |                        |                        |                       |                 |                |
    |                        |-- evaluate completed -->|                       |                 |                |
    |                        |                        |                       |-- LLM evaluate ->|                |
    |                        |                        |                       |<-- score+analysis|                |
    |                        |                        |                       |                 |-- update chat|
    |                        |                        |                       |                 |                |
    |                        |-- push recommendations->|                       |                 |                |
    |                        |                        |                       |                 |<-- WS push ---|
    |                        |                        |                       |                 |                |
```

### 11.2 Consent and Introduction Flow

```
Owner A            Lobster A          Database         Lobster B          Owner B
    |                  |                  |                 |                |
    |                  |-- recommend match->|                |                |
    |                  |                  |-- WS notify --->|                |
    |  <-- notification|                  |                 |                |
    |                  |                  |                 |                |
    |-- approve ------>|                  |                 |                |
    |                  |-- create consent->|                |                |
    |                  |                  |                 |                |
    |                  |                  |                 |-- notify owner->|
    |                  |                  |                 |                |
    |                  |                  |                 |  <-- approve --|
    |                  |                  |                 |                |
    |                  |                  |<-- both consent--|                |
    |                  |                  |                 |                |
    |                  |-- exchange wechat|                |                |
    |                  |                  |-- create intro ->|                |
    |                  |                  |                 |                |
    |<-- get wechat ID |                  |                 |                |
    |                  |                  |                 |-- get wechat ID|
    |                  |                  |                 |                |
```

---

## 12. Risk Assessment and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM API cost during conversations | High | Cap conversations at 8 turns, batch processing, cache results |
| Spam/abuse via lobster agents | Medium | Rate limiting, content moderation, user reporting |
| Privacy leak in lobster conversations | High | Conversations stored server-side only, owner sees summaries not raw chats |
| Trial abuse (create new accounts) | Medium | Email verification, device fingerprinting, phone number verification |
| WeChat ID exposure before consent | Critical | Double-opt-in consent model, IDs encrypted at rest |
| Lobster agents too aggressive | Medium | Configurable conversation style, owner can pause/resume |
| Subscription payment failures | Medium | Grace period (3 days), notification before and after expiry |

---

## 13. Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. Database migration (`add_loblove_system.sql`)
2. Lobster CRUD API (`/api/lobsters/*`)
3. Auto-create lobster on user registration
4. Frontend: LobsterPage with profile display
5. Basic scheduler with mock matching

### Phase 2: Agent Conversations (Week 3-4)
1. `lobsterConversationService.js` - Multi-turn LLM conversations
2. `lobsterOrchestrator.js` - Main matching cycle
3. WebSocket extensions for lobster events
4. Frontend: LobsterChatPreview, conversation summaries
5. Integration with existing matching algorithm

### Phase 3: Consent and Introduction (Week 5-6)
1. `consentService.js` - Consent state machine
2. `/api/consents/*` and `/api/introductions/*` routes
3. Frontend: ConsentPage, IntroductionPage
4. Double-opt-in WeChat ID exchange
5. Post-introduction feedback system

### Phase 4: Subscription System (Week 7-8)
1. `subscriptionService.js` - Subscription lifecycle
2. `/api/subscriptions/*` routes with webhook handler
3. `checkSubscription` middleware
4. Frontend: SubscriptionPage with plan comparison
5. Payment integration (reuse pokeball QR pattern)

### Phase 5: OpenClaw Integration (Week 9-10)
1. OpenClaw skill for preference collection
2. `/api/openclaw/*` routes
3. `lobster_preferences` table population
4. Frontend: Conversational preference collection UI
5. Lobster matching criteria updates based on collected preferences

### Phase 6: Production Readiness (Week 11-12)
1. Load testing for concurrent lobster conversations
2. Rate limiting and abuse prevention
3. Monitoring and alerting
4. Data encryption for WeChat IDs
5. End-to-end testing of all flows

---

## 14. Technology Justifications

| Choice | Reason |
|--------|--------|
| Scheduler (node-cron) over always-on WS | Cost efficiency, batch processing, matches existing patterns |
| Reuse matchingAlgorithm.js | Don't duplicate existing logic, fundamental constraints are unchanged |
| WebSocket push over polling | Better UX, lower latency, existing infrastructure |
| JSONB for flexible schemas | Preferences and personality profiles evolve; JSONB allows schema-less iteration |
| Double-opt-in consent | Fundamental constraint: neither party should have contact info exposed without explicit consent |
| Encrypted WeChat IDs at rest | Regulatory compliance, privacy protection |
| Existing payment pattern (QR codes) | Reuse proven pokeball payment infrastructure, reduce implementation risk |

---

## 15. Key Design Principles

1. **Human-in-the-loop at critical points**: Owners approve introductions; lobsters do the legwork
2. **Progressive disclosure**: Owners see summaries, not raw agent conversations, until they choose to drill down
3. **Graceful degradation**: If LLM is unavailable, fall back to traditional matching scores
4. **Idempotent operations**: All scheduler jobs can safely re-run without side effects
5. **Observable by design**: Every lobster action is logged and traceable
6. **Subscription-gated access**: Core features require active subscription, with graceful read-only access after expiry

---

## Appendix A: Complete Table Dependency Graph

```
users
  └── lobsters (owner_id -> users.user_id)
        └── lobster_preferences (lobster_id -> lobsters.lobster_id)
        └── lobster_chats (lobster_a_id, lobster_b_id -> lobsters.lobster_id)
              └── consents (chat_id -> lobster_chats.chat_id)
                    └── introductions (consent_id -> consents.consent_id)
  └── subscriptions (user_id -> users.user_id)
        └── subscription_events (subscription_id -> subscriptions.subscription_id)
```

## Appendix B: Environment Variables (New)

```bash
# Lobster Agent Configuration
LOBSTER_MAX_CHATS_PER_CYCLE=20
LOBSTER_MAX_CONVERSATION_TURNS=8
LOBSTER_RECOMMENDATION_THRESHOLD=65    # Minimum compatibility score to recommend
LOBSTER_MATCHING_CYCLE_INTERVAL=600    # Seconds between matching cycles (10 min)

# LLM Configuration (reusing existing)
OPENAI_API_KEY=...
OPENAI_BASE_URL=...
OPENAI_MODEL=glm-4.7

# Subscription Configuration
SUBSCRIPTION_TRIAL_DAYS=7
SUBSCRIPTION_MONTHLY_PRICE_CNY=29
SUBSCRIPTION_QUARTERLY_PRICE_CNY=69
SUBSCRIPTION_ANNUAL_PRICE_CNY=199

# Encryption
WECHAT_ID_ENCRYPTION_KEY=...           # For encrypting WeChat IDs at rest
```
