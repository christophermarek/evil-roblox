/**
 * Shared type definitions. The node graph types here are the *map contract*:
 * geometry (parts now, meshes later) is cosmetic, but node names/positions are stable.
 */

import { NodeKind, Role } from "./enums";

/** A named anchor in the town that NPCs route between. */
export interface TownNode {
	name: string;
	kind: NodeKind;
	position: Vector3;
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
