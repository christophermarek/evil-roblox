/**
 * SHARED single source of truth for NPC roles + town population.
 *
 * Each role's schedule, workplace, leisure spot, and colour live here (not buried in a
 * server service) so they're tunable in one place AND readable by the client — the M4
 * villain "notebook" that surfaces learned routines reads the same data.
 */

import { NPCState, Role } from "./enums";
import { ScheduleEntry } from "./types";

export interface RoleConfig {
	/** Daily timetable (sorted by hour). */
	readonly schedule: ReadonlyArray<ScheduleEntry>;
	/** Node name resolved for the "work" slot. */
	readonly workNode: string;
	/** Node name resolved for the "break"/leisure slot. */
	readonly breakNode: string;
	/** Body colour so the crowd reads at a glance. */
	readonly color: Color3;
}

const PARK = "ParkNode";

export const ROLES: Record<Role, RoleConfig> = {
	// Timings are staggered across roles to create believable rush-hour waves:
	//   08:00 everyone to work/school · 15:00 students flood to the park · 18:00 home.
	[Role.Shopkeeper]: {
		workNode: "StoreNode",
		breakNode: PARK,
		color: Color3.fromRGB(70, 110, 200),
		schedule: [
			{ hour: 7, state: NPCState.AtHome, slot: "home" },
			{ hour: 8, state: NPCState.AtWork, slot: "work" }, // open the store
			{ hour: 12, state: NPCState.Break, slot: "break" }, // lunch ← store unguarded
			{ hour: 14, state: NPCState.AtWork, slot: "work" },
			{ hour: 18, state: NPCState.AtHome, slot: "home" },
			{ hour: 22, state: NPCState.Sleep, slot: "home" },
		],
	},
	[Role.Teacher]: {
		workNode: "SchoolNode",
		breakNode: PARK,
		color: Color3.fromRGB(150, 90, 190),
		schedule: [
			{ hour: 7, state: NPCState.AtHome, slot: "home" },
			{ hour: 8, state: NPCState.AtWork, slot: "work" },
			{ hour: 16, state: NPCState.Break, slot: "break" },
			{ hour: 18, state: NPCState.AtHome, slot: "home" },
			{ hour: 22, state: NPCState.Sleep, slot: "home" },
		],
	},
	[Role.Student]: {
		workNode: "SchoolNode",
		breakNode: PARK,
		color: Color3.fromRGB(90, 180, 90),
		schedule: [
			{ hour: 7, state: NPCState.AtHome, slot: "home" },
			{ hour: 8, state: NPCState.AtWork, slot: "work" },
			{ hour: 15, state: NPCState.Break, slot: "break" }, // after-school ← the wave
			{ hour: 18, state: NPCState.AtHome, slot: "home" },
			{ hour: 21, state: NPCState.Sleep, slot: "home" },
		],
	},
	[Role.Resident]: {
		workNode: PARK, // out and about during the day
		breakNode: PARK,
		color: Color3.fromRGB(210, 140, 70),
		schedule: [
			{ hour: 7, state: NPCState.AtHome, slot: "home" },
			{ hour: 9, state: NPCState.AtWork, slot: "work" },
			{ hour: 12, state: NPCState.AtHome, slot: "home" }, // home for lunch
			{ hour: 14, state: NPCState.AtWork, slot: "work" },
			{ hour: 18, state: NPCState.AtHome, slot: "home" },
			{ hour: 22, state: NPCState.Sleep, slot: "home" },
		],
	},
	// Cop has no daily schedule yet — PoliceService drives them in M5.
	[Role.Cop]: {
		workNode: "PoliceStation",
		breakNode: PARK,
		color: Color3.fromRGB(60, 70, 120),
		schedule: [],
	},
};

/** One NPC to spawn: a role assigned to a house (1-based index). */
export interface RosterEntry {
	readonly role: Role;
	readonly homeIndex: number;
}

/**
 * Town population composition. `unique` NPCs get specific houses; `perHouse` roles are
 * spawned once for every house. Total scales with CONFIG.town.HOUSE_COUNT.
 */
export const POPULATION = {
	unique: [
		{ role: Role.Shopkeeper, homeIndex: 1 },
		{ role: Role.Teacher, homeIndex: 2 },
	] as ReadonlyArray<RosterEntry>,
	perHouse: [Role.Resident, Role.Student, Role.Student] as ReadonlyArray<Role>,
};
