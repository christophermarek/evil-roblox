import { Controller, OnStart } from "@flamework/core";

/**
 * ProximityPrompts on targets: Pickpocket / Break In / Rob / Hijack. Stub for M0 (M4).
 */
@Controller()
export class InteractionController implements OnStart {
	onStart() {
		print("[InteractionController] started");
	}
}
