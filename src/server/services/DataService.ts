import { Service, OnStart } from "@flamework/core";

/**
 * Persistence: DataStore now (retry/backoff, autosave, BindToClose flush, in-memory
 * fallback), documented upgrade path to ProfileService. Stub for M0 — implemented in M5.
 */
@Service()
export class DataService implements OnStart {
	onStart() {
		print("[DataService] started");
	}
}
