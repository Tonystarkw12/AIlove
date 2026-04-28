---
name: mollove_lobster
description: MolLove Lobster - AI-mediated dating platform skill. Collects owner preferences for lobster agent matching on the MolLove platform.
author: MolLove Team
version: 1.0.0
website: https://mollove.app
tags: [dating, social, matchmaking, lobster, AI]
min_version: 0.1.0
---

# MolLove Lobster Skill

Connect your OpenClaw to the MolLove platform. Your lobster agent will collect your dating preferences, find compatible matches, and facilitate introductions.

## Setup

1. Ensure you have a MolLove account (register at https://mollove.app)
2. Set your MolLove API key in environment:
   ```bash
   export MOLLOVE_API_KEY=your_key_here
   export MOLLOVE_API_URL=https://api.mollove.app/api
   ```

## Commands

### `/lobster-setup` - Initialize your lobster agent

Run this command to start the preference collection process.

**Workflow:**
1. Ask the owner for their MolLove credentials
2. Verify account and create lobster agent if not exists
3. Begin structured preference collection conversation
4. Submit collected preferences to MolLove platform

### `/lobster-preferences` - View/update collected preferences

Show the owner their current preferences and allow updates.

**Workflow:**
1. Call `GET /api/openclaw/preferences` to fetch current preferences
2. Display in a friendly format
3. Offer to update any field

### `/lobster-status` - Check lobster matching status

Show the owner their lobster's current activity.

**Workflow:**
1. Call `GET /api/lobsters/me` for lobster profile
2. Call `GET /api/lobsters/me/stats` for activity stats
3. Call `GET /api/subscriptions/me` for subscription status
4. Display summary

### `/lobster-matches` - View current match recommendations

Show the owner matches found by their lobster.

**Workflow:**
1. Call `GET /api/lobsters/me/recommendations`
2. Display match cards with compatibility scores
3. Ask owner to approve or reject each match

## Preference Collection Flow

When running `/lobster-setup`, guide the owner through these questions naturally. Don't dump all questions at once - have a real conversation:

### 1. Dating Goals
Ask about their dating intentions:
- "你是认真寻找长期关系，还是先随缘认识朋友？"
- "你期望在什么时间范围内找到合适的对象？"

Map to `owner_dating_goals`: `casual`, `serious`, `marriage-minded`

### 2. Core Values
Discuss what matters most to them:
- "你认为在一段关系中最重要的是什么？"
- "你最看重对方的哪些品质？"

Store as `owner_values` JSON: `{ "top_values": [...], "importance": {...} }`

### 3. Lifestyle & Hobbies
Learn about their daily life:
- "你理想的周末是什么样的？"
- "你平时有什么爱好？"

Store as `owner_lifestyle` JSON: `{ "hobbies": [...], "routine": "...", "social_level": "introvert/extrovert/ambivert" }`

### 4. Ideal Partner
Understand their preferences:
- "你理想中的另一半是什么样的？"
- "有什么特质最吸引你？"

Store as `owner_ideal_partner` JSON: `{ "traits": [...], "age_range": {...}, "must_haves": [...] }`

### 5. Dealbreakers
Identify hard limits:
- "有什么是你绝对不能接受的？"

Store as `dealbreaker_list` string array: `["smoking", "dishonesty", ...]`

### 6. Communication Style
Understand how they prefer to communicate:
- "你更喜欢怎样的交流方式？直接还是委婉？"

Store as `owner_communication_style` JSON: `{ "directness": 1-10, "humor": 1-10, "formality": 1-10 }`

### 7. Photos & Basic Info
Collect photos and basic info (with explicit consent):
- "你愿意分享几张照片吗？这能提高匹配质量。"
- "你的职业和大致收入范围是？（可选）"

### 8. WeChat ID
For final introduction:
- "如果匹配成功，你的微信号是什么？我们会在你同意后才交换。"

Update user profile via `PUT /api/users/me` with `wechat_id`.

## Submitting Preferences

After collecting preferences, submit them to the MolLove platform:

```bash
curl -X POST $MOLLOVE_API_URL/openclaw/collect-preferences \
  -H "Authorization: Bearer $MOLLOVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "owner_values": {...},
    "owner_communication_style": {...},
    "owner_dating_goals": "...",
    "owner_lifestyle": {...},
    "owner_ideal_partner": {...},
    "dealbreaker_list": [...]
  }'
```

## API Reference

### Authentication
All API calls require JWT token in Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

### Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/lobsters/initialize` | Create lobster agent |
| GET | `/api/lobsters/me` | Get lobster profile |
| GET | `/api/lobsters/me/recommendations` | Get matches |
| POST | `/api/lobsters/me/respond` | Approve/reject match |
| GET | `/api/subscriptions/me` | Check subscription |
| POST | `/api/openclaw/collect-preferences` | Submit preferences |
| GET | `/api/openclaw/preferences` | Get current preferences |
| GET | `/api/consents/pending` | Check pending WeChat exchanges |
| POST | `/api/consents/:id/respond` | Approve/decline WeChat exchange |

## Error Handling

- If the user doesn't have an account, guide them to register at mollove.app
- If API calls fail, inform the user and suggest retrying
- Never store API keys or tokens in conversation history
- If the user declines to share certain info, respect their choice and skip that section
