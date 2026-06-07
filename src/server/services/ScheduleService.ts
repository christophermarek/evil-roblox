import { Service, OnStart } from "@flamework/core";
import { Role } from "../../shared/enums";
import { ROLES } from "../../shared/roles";
import { ScheduleEntry } from "../../shared/types";

/**
 * Server-side access point for role schedules. The data itself lives in shared `roles.ts`
 * (single source of truth, also readable by the client routine "notebook"); this service
 * is the place to layer any runtime schedule logic later (events, holidays, etc.).
 */
@Service()
export class ScheduleService implements OnStart {
	onStart() {
		print("[ScheduleService] started — schedules sourced from shared/roles.ts");
	}

	/** The daily timetable for a role. */
	getSchedule(role: Role): ReadonlyArray<ScheduleEntry> {
		return ROLES[role].schedule;
	}
}
