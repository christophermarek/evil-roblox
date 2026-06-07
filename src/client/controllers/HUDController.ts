import { Controller, OnStart } from "@flamework/core";

/**
 * Roact HUD: heat skulls, money, notoriety, current objective. Stub for M0 (M4).
 */
@Controller()
export class HUDController implements OnStart {
	onStart() {
		print("[HUDController] started");
	}
}
