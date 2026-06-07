import { Controller, OnStart } from "@flamework/core";

/**
 * Camera behavior. Stub for M0 — tuned alongside the villain/escape feel later.
 */
@Controller()
export class CameraController implements OnStart {
	onStart() {
		print("[CameraController] started");
	}
}
