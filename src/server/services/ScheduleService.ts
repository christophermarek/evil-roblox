import { Service, OnStart } from "@flamework/core";

/**
 * Per-role timetables: maps time-of-day -> the node an NPC should be heading to.
 * Stub for M0 — shopkeeper schedule in M2.5, all roles in M3.1.
 */
@Service()
export class ScheduleService implements OnStart {
	onStart() {
		print("[ScheduleService] started");
	}
}
