import { Service, OnStart } from "@flamework/core";
import { Lighting, RunService } from "@rbxts/services";
import { CONFIG } from "../../shared/config";
import { GlobalEvents } from "../../shared/network";

const serverEvents = GlobalEvents.createServer({});

/**
 * Authoritative day/night clock. Owns the compressed in-game day, advances it every
 * Heartbeat, and drives Lighting so the sky tracks the hour. NPC schedules read
 * `getTimeOfDay()` each tick — the single clock everyone agrees on (server authority).
 */
@Service()
export class TimeService implements OnStart {
	/** Current time of day in hours, 0–24 (float). */
	private timeOfDay: number = CONFIG.time.START_HOUR;
	private lastLoggedHour = -1;

	onStart() {
		this.timeOfDay = CONFIG.time.START_HOUR;
		Lighting.ClockTime = this.timeOfDay;

		const hoursPerSecond = 24 / CONFIG.time.DAY_LENGTH_SECONDS;
		print(
			`[TimeService] started — ${CONFIG.time.DAY_LENGTH_SECONDS}s/day, starting at ` +
				`${string.format("%02d:00", CONFIG.time.START_HOUR)}`,
		);

		// Advance the clock every frame (cheap), but only push the replicated
		// Lighting.ClockTime a few times a second — per-frame writes are wasted work.
		let writeAccumulator = 0;
		let broadcastAccumulator = 0;
		Lighting.ClockTime = this.timeOfDay;
		serverEvents.syncTime.broadcast(this.timeOfDay);
		RunService.Heartbeat.Connect((dt) => {
			this.timeOfDay = (this.timeOfDay + dt * hoursPerSecond) % 24;

			writeAccumulator += dt;
			if (writeAccumulator >= 0.2) {
				writeAccumulator = 0;
				Lighting.ClockTime = this.timeOfDay;
			}

			// Broadcast the authoritative time to clients (HUD/routine UI) ~once a second.
			broadcastAccumulator += dt;
			if (broadcastAccumulator >= 1) {
				broadcastAccumulator = 0;
				serverEvents.syncTime.broadcast(this.timeOfDay);
			}

			const hour = math.floor(this.timeOfDay);
			if (hour !== this.lastLoggedHour) {
				this.lastLoggedHour = hour;
				print(`[TimeService] ${string.format("%02d:00", hour)}`);
			}
		});
	}

	/** Time of day in hours (0–24, fractional). */
	getTimeOfDay(): number {
		return this.timeOfDay;
	}

	/** Whole hour of the day (0–23). */
	getHour(): number {
		return math.floor(this.timeOfDay);
	}
}
