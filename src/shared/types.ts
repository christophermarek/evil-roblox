/**
 * Shared type definitions. The node graph types here are the *map contract*:
 * geometry (parts now, meshes later) is cosmetic, but node names/positions are stable.
 */

import { NodeKind, NPCState, Role } from "./enums";

/** A named anchor in the town that NPCs route between. */
export interface TownNode {
	name: string;
	kind: NodeKind;
	position: Vector3;
}

/** A symbolic destination slot, resolved per-NPC to a concrete node (home/work/break). */
export type NodeSlot = "home" | "work" | "break";

/** One phase of a daily routine: at `hour`, head to `slot` and settle into `state`. */
export interface ScheduleEntry {
	/** Hour of day (0–23) this phase begins. */
	hour: number;
	/** Settled state the NPC adopts once it arrives at the slot. */
	state: NPCState;
	/** Which of the NPC's assigned nodes to head to. */
	slot: NodeSlot;
}

/** Spawn descriptor for an NPC (assigned home/work + role). */
export interface NPCSpawnInfo {
	role: Role;
	homeNode: string;
	workNode?: string;
}

/** Persisted per-player save data (DataService, M5). Stubbed now. */
export interface PlayerSaveData {
	money: number;
	notoriety: number;
	ownedUpgrades: ReadonlyArray<string>;
}

export const DEFAULT_SAVE_DATA: PlayerSaveData = {
	money: 0,
	notoriety: 0,
	ownedUpgrades: [],
};
