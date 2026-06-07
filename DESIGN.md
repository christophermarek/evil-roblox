# Evil Robloxia — Game Design & Technical Plan

> A side-of-town **villain sandbox**. The town is innocent and alive; NPCs follow
> believable daily routines. You are the bad guy. The whole game is about *learning
> those routines and exploiting them* — rob the store when the shopkeeper breaks for
> lunch, burgle a house while the family is at school/work, hijack a car on its route,
> then outrun the heat.

---

## 1. The Fantasy & Why It Works

**Core fantasy:** "I am the one thing this peaceful town isn't ready for."

The design bet: *NPC schedules are the gameplay, not the backdrop.* In most town games
the AI walking around is set dressing. Here it's the puzzle. Every crime has an optimal
window defined by who is where and when. A great player is one who has *read the town*.

This gives us a clean reason to invest heavily in believable AI (which is what you
asked for) — the realism directly powers the fun.

## 2. Core Loop

```
OBSERVE routines  →  PICK a target & window  →  COMMIT the crime  →
   manage WITNESSES/HEAT  →  ESCAPE  →  SPEND loot on upgrades  →  bigger targets
```

- **Observe** — watch where NPCs go and when. The HUD/notebook tracks learned routines.
- **Pick** — an empty house, the store at lunch, a lone NPC in an alley, a parked car.
- **Commit** — context proximity-prompt actions (Pickpocket / Break In / Rob / Hijack).
- **Heat** — witnesses raise a GTA-style wanted level; police escalate.
- **Escape** — break line of sight, ditch the disguise, lie low until heat decays.
- **Spend** — dirty money buys tools (lockpick, crowbar, disguises, faster getaway)
  and unlocks bigger scores. Notoriety = XP/progression.

## 3. The Town (Map)

A compact, readable town on a baseplate. Built as a Rojo-synced model + code-placed props.

Zones:
- **Residential** — 4–8 houses, each with an owning family of NPCs (home node).
- **Commercial** — General Store (rob target #1), later: bank, gas station, diner.
- **School** — students + a teacher; big crowd-spawn at start/end of day (cover + chaos).
- **Town Square / Park** — leisure node; where idle NPCs wander in the evening.
- **Police Station** — cop spawn + patrol origin; where you get taken if busted.
- **Roads** — a simple grid. Cars drive routes on them; some parked (hijack targets).
- **Alleys / blind spots** — low-witness zones; better for crimes, lower payout risk.

Everything is **node-based**: named anchor points (`HomeNode`, `StoreNode`, `SchoolNode`,
`ParkNode`, `WorkNode_*`) that the schedule system routes NPCs between via pathfinding.

## 4. NPC AI — the heart of the game

Server-authoritative. NPC positions and decisions live on the server so the player can't
spoof them (same authority posture as a competitive combat game).

### 4.1 Agent model
Each NPC has:
- **Role**: `Resident | Shopkeeper | Teacher | Student | Cop`
- **Home node**, **Work node**, optional **leisure preference**
- **Schedule**: a timetable keyed to in-game time-of-day
- **State machine**: `AtHome → Commuting → AtWork → Break/Lunch → Commuting → Leisure → Sleep`
  plus reactive states: `Suspicious → Fleeing → CallingPolice → Cowering`
- **Needs/personality (later)**: bravery (flee vs. confront), nosiness (witness radius)

### 4.2 Navigation
- Roblox `PathfindingService:CreatePath` → waypoints → `Humanoid:MoveTo`, with
  recompute-on-block and a stuck timeout. Doors/links via PathfindingModifiers later.
- NPCs route between named nodes; commuting uses sidewalks where possible.

### 4.3 The clock
- `TimeService` owns an authoritative compressed day. **1 in-game day ≈ 20 real minutes**
  (tunable). It broadcasts `timeOfDay` (0–24h) and drives lighting + all schedules.
- Example daily timetable (Shopkeeper):
  - 07:00 wake at home
  - 08:00 commute to store → open
  - **12:00 leave for lunch at the diner/park  ← the rob-the-store window**
  - 13:00 return to store
  - 18:00 close, commute home
  - 22:00 sleep
- Students: home → school 08:30, dismissed 15:00 (street floods — cover + pickpocket
  opportunities), home, park in evening.

### 4.4 Perception & witnessing (villain interaction)
- `PerceptionService` does **server-side** vision checks: for each crime event, which
  NPCs have line-of-sight (raycast) within a role-based cone/radius?
- Witnessing raises that NPC's suspicion and the player's **Heat**. Distance, lighting
  (night = lower detection), and disguises modify it.
- Reaction by personality: flee → run to a safe node and `CallPolice`, or cower.

## 5. "Evil" Mechanics

| Crime | Best window (routine exploit) | Reward | Risk |
|---|---|---|---|
| Pickpocket | NPC alone, in alley, at night | low cash | low if unseen |
| Burgle house | family at work/school (empty) | mid cash + items | alarm/neighbor |
| Rob store | shopkeeper at lunch | high cash | high heat |
| Hijack car | parked, or stopped at light | vehicle + escape | very high heat |
| Vandalism/pranks | anytime (chaos sandbox) | notoriety | medium |
| Bank heist (late game) | requires tools + planning | huge | maximum |

- **Heat / Wanted level**: 0–5 "skulls". Rises with witnessed/loud crimes, decays when
  unseen and lying low. Drives police response tier.
- **Police**: `PoliceService` spawns/controls cop NPCs that patrol, investigate reports,
  and chase. Higher heat → more cops, faster, roadblocks later.
- **Disguises / lie-low**: spend or hide to shed heat — the "escape" half of the loop.
- **Economy**: dirty money → tools & unlocks; **Notoriety** → progression tiers that
  unlock bigger targets and town reactions (more cautious NPCs, better locks).

## 6. Technical Architecture (Flamework)

Mirrors your reference project's clean layering. Source in `src/`, compiled Luau in `out/`.

```
src/
├─ shared/
│  ├─ config.ts        // ALL tuning: day length, walk speed, schedules, heat, payouts
│  ├─ types.ts         // shared interfaces (NPC state, crime, save data)
│  ├─ enums.ts         // Role, NPCState, CrimeType, TimeOfDay
│  └─ network.ts       // Flamework typed client↔server contract
├─ server/services/
│  ├─ TimeService.ts        // authoritative day/night clock; broadcasts timeOfDay
│  ├─ TownService.ts        // reads map nodes, owns town layout
│  ├─ NPCService.ts         // spawns & owns all NPCs; runs state machines
│  ├─ ScheduleService.ts    // per-role timetables → "where should you be now?"
│  ├─ PerceptionService.ts  // server-side witnessing (raycast LoS)
│  ├─ CrimeService.ts       // validates crime attempts, awards loot (AUTHORITY)
│  ├─ HeatService.ts        // wanted level, decay, escalation tiers
│  ├─ PoliceService.ts      // cop spawning, patrol, chase
│  ├─ VehicleService.ts     // cars on routes, hijacking
│  ├─ EconomyService.ts     // money, notoriety, upgrades
│  └─ DataService.ts        // persistence: DataStore now → ProfileService later
└─ client/controllers/
   ├─ InputController.ts        // crime/action inputs
   ├─ InteractionController.ts  // ProximityPrompts: Pickpocket/Break In/Rob/Hijack
   ├─ HUDController.ts          // Roact: heat skulls, money, notoriety, objective
   ├─ RoutineController.ts      // "notebook": surfaces learned NPC routines
   ├─ NotificationController.ts // "Shopkeeper left for lunch", "You were seen!"
   └─ CameraController.ts
```

**Authority rule:** movement of the *player* is client-owned (responsive), but **NPCs,
witnessing, crime validation, heat, and economy are server-owned**. Client requests an
action; server decides if it's legal and what it pays. Same security posture as a
competitive combat game — never trust the client for loot or "did they see me".

## 7. Data / Persistence
- `DataService`: retry w/ exponential backoff, autosave, `BindToClose` flush, in-memory
  fallback when DataStores are off (Studio/unpublished) — same robustness as your ref project.
- Saves: money, notoriety tier, owned tools/upgrades, unlock flags.
- Documented upgrade path to **ProfileService** (session-locking) before production.

## 8. Tech Stack & Tooling
- **TypeScript 5.x strict** → Luau via **roblox-ts (rbxtsc)**
- **Flamework** DI/lifecycle + typed networking
- **Rojo** filesystem→.rbxl sync
- **Roact** for UI
- `npm run dev` = `rbxtsc -w` + `rojo serve` concurrently
- **git from day one**, `.gitignore` for `out/`, `node_modules/`, `*.rbxl`/`*.rbxlx` locks

## 9. Build Milestones

**M0 — Scaffold** (foundation)
git init + .gitignore · npm + roblox-ts + Flamework + Rojo · folder structure ·
empty services/controllers wired into Flamework · `default.project.json` · builds & syncs.

**M1 — Static town** ← *your "to start with" milestone*
Baseplate · road · General Store building · a few houses · named map nodes
(`HomeNode`, `StoreNode`…). NPCs spawn and stand.

**M2 — One believable NPC**
`TimeService` day cycle + lighting · one Shopkeeper walks Home→Store→lunch→Home on
schedule via PathfindingService. *This is the "looks real" proof.*

**M3 — Living town**
Full population & roles · school with crowd in/out · residents commuting · evening park
wander · day/night. The town feels alive on its own.

**M4 — Villain core**
Proximity-prompt crimes (pickpocket, burgle, rob) · `PerceptionService` witnessing ·
`HeatService` skulls · loot → money · HUD. *Now it's a game.*

**M5 — Escalation & systems**
Police chase · cars + hijacking · economy/upgrades/disguises · persistence ·
routine "notebook".

**M6 — Polish**
Animations, sounds, UI pass, balancing, the "evil" identity (music, lighting, tone).

## 10. Immediate Next Step (M0)
Scaffold the project: git + npm + roblox-ts + Flamework + Rojo, the `src/` tree above
with stub services that compile and sync, then M1's baseplate-with-store-and-houses.
