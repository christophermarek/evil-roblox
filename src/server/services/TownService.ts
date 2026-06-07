import { Service, OnStart } from "@flamework/core";

/**
 * Builds the town and owns the queryable node graph (the map contract).
 * Stub for M0 — real TownBuilder + node registry land in M1.
 */
@Service()
export class TownService implements OnStart {
	onStart() {
		print("[TownService] started");
	}
}
