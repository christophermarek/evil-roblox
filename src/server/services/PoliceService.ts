import { Service, OnStart } from "@flamework/core";

/**
 * Spawns and controls cop NPCs: patrol, investigate reports, chase the player.
 * Stub for M0 — implemented in M5.
 */
@Service()
export class PoliceService implements OnStart {
	onStart() {
		print("[PoliceService] started");
	}
}
