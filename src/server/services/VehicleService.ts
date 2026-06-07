import { Service, OnStart } from "@flamework/core";

/**
 * Cars driving routes on the road grid + hijacking. Stub for M0 — implemented in M5.
 */
@Service()
export class VehicleService implements OnStart {
	onStart() {
		print("[VehicleService] started");
	}
}
