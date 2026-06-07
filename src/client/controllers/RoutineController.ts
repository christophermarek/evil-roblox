import { Controller, OnStart } from "@flamework/core";

/**
 * The "notebook": surfaces learned NPC routines so the player can plan heists. Stub (M5).
 */
@Controller()
export class RoutineController implements OnStart {
	onStart() {
		print("[RoutineController] started");
	}
}
