import { Service, OnStart } from "@flamework/core";

/**
 * Authoritative day/night clock. Owns the compressed in-game day and will broadcast
 * time-of-day to drive every NPC schedule + Lighting. Stub for M0 (real clock in M2.1).
 */
@Service()
export class TimeService implements OnStart {
	onStart() {
		print("[TimeService] started");
	}
}
