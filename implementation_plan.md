# DEVISE: Complete Implementation Plan (Original Idea Compliance)

## Goal
Build the **complete DEVISE pipeline** that satisfies every mandatory requirement from the original hackathon brief, with our additions (Swarm V4, MiroFish Genesis) layered on top.

---

## Compliance Audit: Original Idea → Current State

| # | Original Requirement | Status | Gap |
|---|---|---|---|
| 1 | **OpenClaw-based autonomous agent** | ❌ MISSING | No OpenClaw integration at all. We have a custom FastAPI app. |
| 2 | **Real execution against live paper trading API** | ❌ MISSING | No Alpaca SDK. No `order_place`. No real trades. |
| 3 | **Intent validation layer before execution** | ❌ MISSING | No ArmorClaw. No intent planning. No tool approval gate. |
| 4 | **Policy-based runtime enforcement** | ❌ MISSING | No `policy.yaml`. No DevicePolicy. No fail-closed logic. |
| 5 | **Separation between reasoning and execution** | ⚠️ PARTIAL | Swarm reasons, but there's no distinct execution agent. |
| 6 | **Visible enforcement layer** | ❌ MISSING | No blocking UI. No DeviceLog. |
| 7 | **Logging / traceability** | ⚠️ PARTIAL | Basic Python logger exists, but no structured audit trail. |
| 8 | **At least one ALLOWED action** | ❌ MISSING | No paper trade ever executes. |
| 9 | **At least one BLOCKED action** | ❌ MISSING | No blocking mechanism exists. |
| 10 | **Structured intent model** | ❌ MISSING | No formal intent definitions. |
| 11 | **Structured policy model** | ❌ MISSING | No `policy.yaml` or schema. |
| 12 | **Bounded delegation (bonus)** | ❌ MISSING | No DeviceToken. No HMAC. No delegation chain. |

> [!CAUTION]
> **We are currently 2/12 on compliance.** The Swarm Analyst (reasoning layer) works, but the entire enforcement + execution pipeline is missing. This is the critical path.

---

## Architecture: What We Must Build

```
┌─────────────────────────────────────────────────┐
│              SWARM ANALYST (EXISTING)            │
│         6-Persona Parallel LLM Reasoning        │
│              ↓ SwarmReport Object                │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│            RISK AGENT [NEW]                     │
│  1. Reads SwarmReport                           │
│  2. Checks portfolio via Alpaca API             │
│  3. Validates against policy.yaml               │
│  4. Issues HMAC-signed DeviceToken              │
│     OR blocks with reason                       │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
╔═════════════════════════════════════════════════╗
║         ARMORCLAW ENFORCEMENT ENGINE [NEW]      ║
║                                                 ║
║  Pre-execution hooks:                           ║
║    DeviceGuard  → agent scope tagging           ║
║    DevicePolicy → policy.yaml rule check        ║
║    DeviceToken  → HMAC + TTL + replay check     ║
║                                                 ║
║  Intent verification:                           ║
║    Tool approval → is tool in agent's plan?     ║
║    Prompt injection → detect injected commands  ║
║    Fail-closed → block if unverifiable          ║
║                                                 ║
║  Post-decision:                                 ║
║    DeviceLog → structured audit trail           ║
╚═════════════════════╤═══════════════════════════╝
                      │ ALLOWED? → Execute
                      │ BLOCKED? → Log + Return
                      ▼
┌─────────────────────────────────────────────────┐
│           TRADER AGENT [NEW]                    │
│  1. Receives DeviceToken                        │
│  2. Passes through ArmorClaw enforcement        │
│  3. Calls Alpaca Paper Trading API              │
│  4. Returns trade confirmation or rejection     │
└─────────────────────────────────────────────────┘
```

---

## Proposed Changes

### Component 1: Policy Engine (`DevicePolicy`)

#### [NEW] `server/swarm_analyst/src/core/policy.yaml`
The declarative policy file — the "law" of the system:
- `ticker_universe`: `["NVDA", "AAPL", "MSFT"]`
- `max_order_size`: 50
- `max_daily_exposure_usd`: 5000
- `market_hours_only`: true
- `earnings_blackout_days`: 3
- `forbidden_tools`: `["shell_exec", "http_post_external"]`
- `file_access.read_dirs`, `file_access.write_dirs`
- `data_restrictions`: `["no_pii", "no_account_numbers_in_args"]`
- `delegation.risk_to_trader`: max_quantity, ticker_lock, TTL

#### [NEW] `server/swarm_analyst/src/enforcement/device_policy.py`
- Loads and validates `policy.yaml` at startup
- Exposes `validate_action(tool_name, params, agent_role) → Allow | Block(reason)`
- Checks: ticker in universe, quantity within cap, market hours, forbidden tools, file access scope

---

### Component 2: Delegation Tokens (`DeviceToken`)

#### [NEW] `server/swarm_analyst/src/enforcement/device_token.py`
- `issue_token(issued_to, ticker, side, max_quantity, ttl_minutes) → signed_token`
- `verify_token(token) → Valid | Expired | Spent | Tampered`
- HMAC-SHA256 signing with secret from `.env`
- Token store (in-memory dict) for replay protection (mark as spent after use)
- TTL enforcement (15-minute default)

---

### Component 3: Scope Guard (`DeviceGuard`)

#### [NEW] `server/swarm_analyst/src/enforcement/device_guard.py`
- Defines per-agent tool permissions:
  - Analyst: `["market_data_fetch", "earnings_fetch", "report_write"]`
  - Risk: `["portfolio_read", "token_issue"]`
  - Trader: `["order_place", "position_check"]`
- `check_scope(agent_role, tool_name) → Allow | Block(reason)`

---

### Component 4: Audit Logger (`DeviceLog`)

#### [NEW] `server/swarm_analyst/src/enforcement/device_log.py`
- Structured log entries: `[timestamp] ✓/✗ ALLOWED/BLOCKED | agent | tool | params | rule`
- In-memory log + file persistence to `./data/audit/`
- Exposes `get_audit_trail() → List[AuditEntry]`
- Each entry includes: agent role, tool name, parameters, decision, rule cited

---

### Component 5: ArmorClaw Enforcement Engine

#### [NEW] `server/swarm_analyst/src/enforcement/armorclaw.py`
The central orchestrator that chains all Device hooks:
1. `DeviceGuard.check_scope()` → Is this agent allowed to use this tool?
2. `DevicePolicy.validate_action()` → Does the action comply with policy.yaml?
3. `DeviceToken.verify_token()` → (For Trader only) Is the delegation token valid?
4. Intent verification → Does the tool match the approved plan?
5. Prompt injection detection → Scan for injection patterns in parameters
6. `DeviceLog.log_decision()` → Record the outcome

Exposes: `enforce(agent_role, tool_name, params, token=None) → EnforcementResult`

---

### Component 6: Risk Agent

#### [NEW] `server/swarm_analyst/src/agents/risk_agent.py`
- Receives `SwarmReport` from the Analyst
- Calls Alpaca API to check current portfolio exposure
- Validates the recommendation against `DevicePolicy`
- If valid: issues a `DeviceToken` via `device_token.issue_token()`
- If invalid: returns a structured rejection with the specific rule violated

---

### Component 7: Trader Agent

#### [NEW] `server/swarm_analyst/src/agents/trader_agent.py`
- Receives `DeviceToken` from Risk Agent
- Passes through `ArmorClaw.enforce()` before any action
- If ALLOWED: calls `alpaca-py` SDK to place a paper trade
- If BLOCKED: returns the block reason (token expired, ticker mismatch, etc.)
- Returns trade confirmation or rejection

---

### Component 8: Alpaca Integration

#### [NEW] `server/swarm_analyst/src/services/alpaca_client.py`
- Initializes `TradingClient` with paper trading keys from `.env`
- `place_order(symbol, qty, side) → OrderResult`
- `get_positions() → List[Position]`
- `get_account() → AccountInfo` (for exposure calculation)

---

### Component 9: API Updates

#### [MODIFY] `server/swarm_analyst/src/main.py`
- `POST /v1/pipeline/run` — The **full pipeline** endpoint: Swarm → Risk → ArmorClaw → Trader
- `POST /v1/pipeline/attack` — Demo endpoint that feeds a poisoned input to show blocking
- `GET /v1/audit/trail` — Returns the DeviceLog audit trail
- `GET /v1/portfolio` — Returns current Alpaca positions
- `GET /v1/policy` — Returns the active policy.yaml contents
- WebSocket updates to stream enforcement decisions in real-time

#### [MODIFY] `server/swarm_analyst/pyproject.toml`
- Add dependencies: `alpaca-py`, `pyyaml`, `colorama`

#### [MODIFY] `server/swarm_analyst/.env`
- Add: `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `DEVICE_HMAC_SECRET`

---

### Component 10: Frontend — Enforcement Dashboard

#### [MODIFY] `src/components/dashboard/pipeline-dashboard.tsx`
- Add **Audit Trail Panel**: Real-time stream of `✓ ALLOWED` / `✗ BLOCKED` entries
- Add **Policy Viewer**: Shows the active `policy.yaml` rules
- Add **Token Inspector**: Shows the issued DeviceToken with its constraints
- Add **Trade Confirmation**: Shows Alpaca paper trade result
- Add **Attack Demo Button**: Triggers the poisoned input scenario

---

## User Review Required

> [!IMPORTANT]
> **Alpaca API Keys**: Do you have Alpaca Paper Trading keys (`APCA-API-KEY-ID` and `APCA-API-SECRET-KEY`)? I need these to make the Trader Agent functional. You can get them free at [alpaca.markets](https://alpaca.markets).

> [!IMPORTANT]
> **OpenClaw Native vs. OpenClaw-Compatible**: The original idea says "OpenClaw-based autonomous agent." OpenClaw is a Node.js/TypeScript framework. Our backend is Python/FastAPI. I see two options:
> 1. **Option A (Recommended)**: Build our agents as OpenClaw-compatible services that follow the OpenClaw skill pattern (`SKILL.md` format) and implement the ArmorClaw enforcement protocol natively in Python. This is what most hackathon teams do — they implement the *concepts* of OpenClaw (autonomous agents, skill system, intent enforcement) in their stack.
> 2. **Option B**: Install OpenClaw via npm and build a Node.js gateway that calls our Python backend. This adds complexity but gives us a "native" OpenClaw agent.
> 
> **My recommendation is Option A** — implement the OpenClaw agent pattern and ArmorClaw enforcement protocol in Python. The judges care about the *architecture and enforcement quality*, not whether we use the exact npm package.

---

## Open Questions

1. **Alpaca Keys**: Do you have them? If not, I can mock the final `order_place` call while keeping everything else real.
2. **OpenClaw approach**: Option A or Option B from above?
3. **Demo priority**: Should the "Attack Demo" (poisoned earnings file) be a separate button in the UI, or part of the main pipeline flow?

---

## Verification Plan

### Automated Tests
- `pytest` for DevicePolicy validation (ticker universe, size cap, market hours)
- `pytest` for DeviceToken (HMAC sign/verify, TTL expiry, replay protection)
- `pytest` for DeviceGuard (scope enforcement per agent role)

### Integration Tests
1. **Happy Path**: Swarm → Risk → ArmorClaw ALLOWS → Trader executes on Alpaca → Trade confirmed
2. **Policy Block**: Swarm recommends TSLA (not in universe) → ArmorClaw BLOCKS via DevicePolicy → DeviceLog entry
3. **Token Block**: Expired token → ArmorClaw BLOCKS via DeviceToken → DeviceLog entry
4. **Injection Block**: Poisoned file → Analyst tries `order_place` → DeviceGuard BLOCKS (wrong scope) → DeviceLog entry
5. **Audit Trail**: Full trail visible in UI with green/red entries and rule citations
