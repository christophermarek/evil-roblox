import { Service, OnStart } from "@flamework/core";

/**
 * THE AUTHORITY for crimes: validates every client-requested crime attempt and awards
 * loot. Never trusts the client. Stub for M0 — implemented in M4.
 */
@Service()
export class CrimeService implements OnStart {
	onStart() {
		print("[CrimeService] started");
	}
}
