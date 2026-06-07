/**
 * Typed client<->server networking contract (Flamework Networking).
 * Empty for M0 — events are added as the villain layer (M4+) needs them.
 * Keeping the contract here means both sides compile against the same shape.
 */

import { Networking } from "@flamework/networking";

interface ClientToServerEvents {
	// e.g. requestCrime(type: CrimeType, targetId: string)  — added in M4
}

interface ServerToClientEvents {
	/** Server broadcasts the authoritative time of day (0–24h) for HUD / routine UI. */
	syncTime: (timeOfDay: number) => void;
	// e.g. heatChanged(level: number)  — added in M4
}

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
