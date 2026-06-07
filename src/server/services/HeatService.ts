import { Service, OnStart } from "@flamework/core";

/**
 * Wanted level (0-5 skulls): rises with witnessed/loud crimes, decays when lying low,
 * drives police escalation tiers. Stub for M0 — implemented in M4.
 */
@Service()
export class HeatService implements OnStart {
	onStart() {
		print("[HeatService] started");
	}
}
