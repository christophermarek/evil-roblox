import { Service, OnStart } from "@flamework/core";

/**
 * Server-side witnessing: raycast line-of-sight checks deciding which NPCs see a crime.
 * Stub for M0 — implemented in the villain layer (M4).
 */
@Service()
export class PerceptionService implements OnStart {
	onStart() {
		print("[PerceptionService] started");
	}
}
