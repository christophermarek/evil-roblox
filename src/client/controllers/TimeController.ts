import { Controller, OnStart } from "@flamework/core";
import { GlobalEvents } from "../../shared/network";

const clientEvents = GlobalEvents.createClient({});

/**
 * Holds the latest authoritative time of day pushed by the server (TimeService).
 * The HUD clock and the M4 routine "notebook" read this instead of guessing locally.
 */
@Controller()
export class TimeController implements OnStart {
	private timeOfDay = 0;
	private synced = false;

	onStart() {
		clientEvents.syncTime.connect((timeOfDay) => {
			this.timeOfDay = timeOfDay;
			if (!this.synced) {
				this.synced = true;
				print(`[TimeController] first server time received: ${string.format("%.1f", timeOfDay)}h`);
			}
		});
		print("[TimeController] started — listening for server time");
	}

	/** Latest server time of day (0–24h). */
	getTimeOfDay(): number {
		return this.timeOfDay;
	}
}
