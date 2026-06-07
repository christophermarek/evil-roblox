import { Controller, OnStart } from "@flamework/core";

/**
 * Crime/action inputs. Deliberately a stub until the villain layer (M4) needs bindings.
 */
@Controller()
export class InputController implements OnStart {
	onStart() {
		print("[InputController] started");
	}
}
