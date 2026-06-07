# Evil Robloxia — Build Plan (M0 → M3, loop-able)

> Companion to [DESIGN.md](DESIGN.md). This is the **execution** plan: discrete, ordered
> steps with a Definition of Done (DoD) per step so we can loop one step at a time until
> M3 (a living town) is finished. Research-backed decisions are in §A; the loop is in §B.

---

## §A. Design Practices & Decisions (researched)

These are settled calls — don't re-litigate while looping.

### A1. NPC AI = State Machine (FSM)
- Each NPC runs a finite state machine. Each schedule phase is a **state** with
  `onEnter()`, `onUpdate(dt)`, `onExit()`. Central `NPCStateMachine` handles transitions.
- States (M2/M3): `AtHome`, `Commuting`, `AtWork`, `Break`, `Leisure`, `Sleep`.
  Reactive states (M4): `Suspicious`, `Fleeing`, `CallingPolice`.
- Transitions are driven by **time-of-day** (from `TimeService`) and arrival events.
- Utility AI (numeric scoring of competing needs) is deliberately **deferred** to post-M4
  — overkill for schedules, adds per-frame cost. *(Source: AI Behavior Frameworks)*

### A2. Pathfinding performance rules
- **Never** `ComputeAsync` per frame. Compute **once per leg** (node→node); recompute only
  when the path is `Blocked` or the goal moved significantly.
- **Stagger** path computes across NPCs with small random jitter to avoid frame spikes.
- Set `AgentRadius` a touch *larger* than the NPC's real width to stop corner-sticking;
  set `AgentCanJump`, `WaypointSpacing`, and `Costs` (sidewalks cheap, roads expensive).
- Tick NPC AI on a fixed **~0.2s** accumulator loop (not `RenderStepped`), staggered.
- NPC model hygiene: `CanQuery`/`CanTouch` off on cosmetic parts, `CastShadow` off on
  small parts, collisions only where needed. *(Source: Roblox Pathfinding docs + devforum)*

### A3. Building & world performance
- Build the town as a **modular kit**: reusable parts/models, same `MeshId`+`TextureId`
  reused so the engine batches draw calls. Keep an eye on part count.
- Turn on **StreamingEnabled** from M1 (`StreamingMinRadius`/`StreamingTargetRadius`),
  so the town scales without killing load time/memory.
- M1 builds the town from **code-placed Parts** (a `TownBuilder` module) so the map is in
  git via Rojo and reproducible. Swap in mesh models later without touching logic — the
  **node graph** (anchor positions) is the contract, not the geometry.
  *(Source: Roblox build best-practices + Improve performance docs)*

### A4. Asset sources (when we move past gray-box)
- ✅ **Official & safe**: Roblox Marketplace **free Synty packs**, the **Ultimate Low-Poly
  Asset Pack** (buildings/streets/vegetation), Roblox **NPC Kit**.
- ⚠️ **Avoid**: random Toolbox "free models" — backdoor/malware risk. Prefer curated
  (KW Studio, ClearlyDev, BuiltByBit) or external (Sketchfab, Poly Haven) imported as
  MeshParts you control.
- Rule: models are **cosmetic skins** dropped onto code-defined nodes; never let an
  imported model carry scripts into the place.

### A5. Authority & networking (from DESIGN §6)
- NPCs, witnessing, crime validation, heat, economy → **server**. Player movement → client.
- All client→server requests go through the typed `network.ts` contract; server validates.

---

## §B. The Loop (M0 → M3)

Work **one step at a time**, top to bottom. For each step: implement → meet the DoD →
check it off → move to the next. Every code step ends with `npm run build` clean. Steps
marked **[Studio]** need a manual look in Roblox Studio (sync via Rojo, press Play).

### M0 — Scaffold  *(foundation; no gameplay yet)*

- [x] **M0.1 git + ignore** — `git init`; `.gitignore` for `out/`, `node_modules/`,
  `*.rbxl`, `*.rbxlx`, `.DS_Store`. First commit. **DoD:** `git status` clean, `out/` ignored.
- [x] **M0.2 npm + deps** — `package.json`; install `roblox-ts`, `@flamework/core`,
  `@flamework/networking`, `@rbxts/services`, `@rbxts/types`, `rbxts-transformer-flamework`,
  `rojo` (or rely on global). **DoD:** `npm install` succeeds.
- [ ] **M0.3 tsconfig** — strict mode, JSX=Roact, Flamework transformer plugin, `outDir: out`.
  **DoD:** `npx rbxtsc` runs with no source files yet (no errors).
- [ ] **M0.4 Rojo project** — `default.project.json` mapping `out/shared`→ReplicatedStorage,
  `out/server`→ServerScriptService, `out/client`→StarterPlayerScripts, plus a `Workspace`
  with `StreamingEnabled = true`. **DoD:** `rojo serve` starts; `.gitignore` covers locks.
- [ ] **M0.5 src tree + Flamework bootstrap** — create `src/{shared,server,client}` and the
  stub files from DESIGN §6 (services/controllers as empty `@Service`/`@Controller` classes
  with `OnStart`). Add `server/runtime.server.ts` + `client/runtime.client.ts` calling
  `Flamework.addPaths(...)` + `Flamework.ignite()`. **DoD:** `npm run build` clean.
- [ ] **M0.6 dev script + smoke test [Studio]** — `npm run dev` = `rbxtsc -w` + `rojo serve`
  concurrently. Sync to Studio, Play. **DoD:** each service/controller prints a `[Service] started`
  log on run — proves Flamework DI + Rojo pipeline work end to end.

**M0 exit:** project compiles, syncs, ignites; repo committed.

### M1 — Static town  *(the "to start with" milestone)*

- [ ] **M1.1 config + enums** — `shared/config.ts` (DAY_LENGTH, NPC_WALK_SPEED, node names,
  tick rate) and `shared/enums.ts` (Role, NPCState, TimeOfDay). **DoD:** imported, builds.
- [ ] **M1.2 node graph types** — `shared/types.ts`: `TownNode { name, position, kind }`,
  building/house descriptors. The **node graph is the map contract**. **DoD:** builds.
- [ ] **M1.3 TownBuilder — baseplate + roads** — code-placed Parts: large baseplate, a simple
  road grid with sidewalks. Anchored, collision-tuned per A2/A3. **DoD [Studio]:** flat town
  ground + roads visible.
- [ ] **M1.4 TownBuilder — General Store** — one store building (walls, door gap, sign, floor)
  as a reusable function. Place a `StoreNode` anchor at its entrance. **DoD [Studio]:** store
  stands on the map with a visible entrance.
- [ ] **M1.5 TownBuilder — houses** — a `makeHouse()` function; place 4 houses in a residential
  row, each with a `HomeNode_#` anchor at its door. **DoD [Studio]:** 4 houses + store + roads
  form a readable little town.
- [ ] **M1.6 TownService registers nodes** — `TownService` builds the town on `OnStart`,
  collects every anchor into a queryable node registry (`getNode(name)`, `getNodesByKind`).
  **DoD:** server log lists all registered nodes (StoreNode, HomeNode_1..4, etc.).

**M1 exit:** a static, readable town exists in code, with a queryable node graph. Commit.

### M2 — One believable NPC  *(the "looks real" proof)*

- [ ] **M2.1 TimeService** — authoritative compressed clock (DAY_LENGTH from config), exposes
  `getTimeOfDay()` (0–24), fires an event on phase changes, drives `Lighting.ClockTime`.
  **DoD [Studio]:** sky visibly cycles day→night over DAY_LENGTH; log prints the hour.
- [ ] **M2.2 NPC rig + spawner** — `NPCService` spawns one R15 NPC (NPC Kit / cloned rig) at a
  HomeNode. Apply model hygiene from A2. **DoD [Studio]:** a humanoid NPC stands at a house.
- [ ] **M2.3 Pathfinding mover** — a `NavAgent` helper: `moveTo(node)` using PathfindingService
  per A2 (compute once, follow waypoints, handle `Blocked`/stuck, jittered). **DoD [Studio]:**
  NPC walks from its house to the StoreNode smoothly, around corners, no sticking.
- [ ] **M2.4 FSM core** — `NPCStateMachine` with `onEnter/onUpdate/onExit`; implement
  `AtHome`, `Commuting`, `AtWork`, `Break`, `Sleep`. **DoD:** state transitions log correctly.
- [ ] **M2.5 ScheduleService (shopkeeper)** — a shopkeeper timetable (wake 7 → store 8 →
  **lunch 12** → store 13 → home 18 → sleep 22). ScheduleService maps time-of-day → desired
  node; FSM consumes it. **DoD [Studio]:** the shopkeeper autonomously walks home→store→leaves
  at noon→returns→home at night, looping across days. **← M2 is the realism proof.**

**M2 exit:** one NPC lives a believable day on a real clock. Commit.

### M3 — Living town  *(population + roles + school)*

- [ ] **M3.1 Role schedules** — add timetables for `Resident`, `Teacher`, `Student`, plus
  generic leisure. Factor schedules into data (per-role tables in config/shared). **DoD:** each
  role resolves a desired node for any time-of-day.
- [ ] **M3.2 School building + nodes** — TownBuilder adds a school with `SchoolNode`(s).
  **DoD [Studio]:** school stands in town with entrance anchors.
- [ ] **M3.3 Population spawn** — `NPCService` spawns N NPCs (e.g. 4 families + shopkeeper +
  teacher + ~6 students) assigned homes/work. Performance per A2 (staggered ticks, batched).
  **DoD [Studio]:** ~15–20 NPCs populate the town without frame drops.
- [ ] **M3.4 Commute waves** — students flood to school at 08:30 and **out at 15:00** (the
  street-crowd moment); residents commute; evening `Leisure` sends idlers to the ParkNode.
  **DoD [Studio]:** visible rush-hour waves — believable crowd movement, not random wandering.
- [ ] **M3.5 Day/night ambience + tuning** — lighting/ambience tied to TimeService; tune walk
  speeds, tick rate, and schedule offsets so it reads naturally. Add a small `Leisure` wander
  so NPCs aren't statues when "off". **DoD [Studio]:** stand still and watch — the town feels
  alive and plausible across a full day.

**M3 exit:** a self-running, believable town. This is the foundation the villain layer (M4+)
sits on. Commit + tag `m3-living-town`.

---

## §C. Looping protocol
- One checkbox per loop iteration. Implement → `npm run build` → meet DoD → check it → commit.
- `[Studio]` steps: sync via `npm run dev`, press Play, verify the DoD visually, then proceed.
- If a step balloons, split it — keep iterations small and shippable.
- Keep `config.ts` the single source of tuning; never hardcode tunables in services.
