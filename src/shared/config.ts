/**
 * SINGLE SOURCE OF TRUTH for all tunable values.
 * Nothing tunable should be hardcoded in a service — import it from here.
 * (Mirrors the reference project's config.ts discipline.)
 */

import { Role } from "./enums";

export const CONFIG = {
	/** Day/night clock. */
	time: {
		/**
		 * Real seconds for one full in-game day.
		 * 240 = 4 min/day (dev value so schedule transitions are watchable in playtests).
		 * Production target is ~1200 (20 min/day) — bump this up before shipping.
		 */
		DAY_LENGTH_SECONDS: 240,
		/** Hour of day the world starts at on server boot. */
		START_HOUR: 7,
	},

	/** NPC movement + AI cadence. */
	npc: {
		WALK_SPEED: 12,
		/** Seconds between FSM ticks. Per BUILD_PLAN §A2 we tick ~0.2s, not per-frame. */
		TICK_INTERVAL: 0.2,
		/**
		 * Max seconds a commute's path-compute is randomly delayed, so a rush-hour wave
		 * (many NPCs changing phase on the same hour) doesn't ComputeAsync on one frame.
		 */
		COMMUTE_STAGGER_MAX: 1.5,
		/** How close (studs) counts as "arrived" at a node. */
		ARRIVAL_RADIUS: 4,
	},

	/** Pathfinding agent params (see BUILD_PLAN §A2 — fat radius avoids corner-sticking). */
	pathfinding: {
		AGENT_RADIUS: 2, // NPC is 2 wide; fits the 8-stud sidewalks/driveways with margin
		AGENT_HEIGHT: 5,
		AGENT_CAN_JUMP: false,
		/** Coarser spacing => fewer waypoints/MoveTo round-trips per leg (cheaper at scale). */
		WAYPOINT_SPACING: 8,
		/** Seconds before a stuck NPC recomputes its path. */
		STUCK_TIMEOUT: 2,
		/** How many times a NavAgent retries (recompute) a blocked/failed leg before giving up. */
		MAX_RETRIES: 3,
		/**
		 * Pathfinding cost of walking on Grass terrain. Roads/sidewalks/driveways are
		 * carved to Concrete (default cost 1), so a high grass cost makes NPCs prefer
		 * the road network instead of cutting straight across lawns. (BUILD_PLAN §A2.)
		 */
		GRASS_COST: 20,
	},

	/** Town layout knobs (consumed by TownBuilder in M1). */
	town: {
		BASEPLATE_SIZE: 512,
		HOUSE_COUNT: 4,
	},
} as const;

/**
 * Daily schedules per role, filled in over M2 (shopkeeper) and M3 (everyone else).
 * Each entry: at `hour`, the NPC should head to a node of `kind`.
 * Left as a stub for M0 — populated in ScheduleService work.
 */
export const SCHEDULES: Partial<Record<Role, ReadonlyArray<{ hour: number; goto: string }>>> = {};
