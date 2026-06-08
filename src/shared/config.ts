/**
 * SINGLE SOURCE OF TRUTH for all tunable scalar values.
 * Nothing tunable should be hardcoded in a service — import it from here.
 * (Role schedules / population live in `roles.ts`, also shared.)
 */

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
		AGENT_RADIUS: 2.5, // wall clearance to stop corner-clipping; still fits 8-stud paths
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

	/** Player movement (client-owned). */
	player: {
		WALK_SPEED: 16,
		SPRINT_SPEED: 30,
	},

	/** Town layout knobs (consumed by TownBuilder). */
	town: {
		BASEPLATE_SIZE: 1024,
		HOUSE_COUNT: 8,
		/** Stud spacing between adjacent houses in a row. */
		HOUSE_SPACING: 50,
		/** Z of the (north) residential row centers. */
		HOUSE_ROW_Z: 45,
	},
} as const;
