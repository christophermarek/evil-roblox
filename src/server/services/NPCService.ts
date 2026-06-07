import { Service, OnStart } from "@flamework/core";

/**
 * Spawns and owns every NPC; runs their state machines (server authority).
 * Stub for M0 — rig spawning in M2.2, full population in M3.3.
 */
@Service()
export class NPCService implements OnStart {
	onStart() {
		print("[NPCService] started");
	}
}
