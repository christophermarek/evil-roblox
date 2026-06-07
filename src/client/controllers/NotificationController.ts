import { Controller, OnStart } from "@flamework/core";

/**
 * Toasts: "Shopkeeper left for lunch", "You were seen!". Stub for M0 (M4).
 */
@Controller()
export class NotificationController implements OnStart {
	onStart() {
		print("[NotificationController] started");
	}
}
