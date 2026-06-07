import { Service, OnStart } from "@flamework/core";

/**
 * Dirty money, notoriety, and upgrade purchases. Stub for M0 — implemented in M5.
 */
@Service()
export class EconomyService implements OnStart {
	onStart() {
		print("[EconomyService] started");
	}
}
