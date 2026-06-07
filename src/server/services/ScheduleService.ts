import { Service, OnStart } from "@flamework/core";
import { NPCState, Role } from "../../shared/enums";
import { ScheduleEntry } from "../../shared/types";

/**
 * Per-role daily timetables. Each entry says "from this hour, head to this slot and settle
 * into this state". Slots (home/work/break) are resolved to concrete nodes per-NPC by
 * NPCService, so one schedule serves every NPC of a role.
 *
 * M2: just the Shopkeeper. M3 adds Resident / Teacher / Student.
 */
const SHOPKEEPER_SCHEDULE: ReadonlyArray<ScheduleEntry> = [
	{ hour: 7, state: NPCState.AtHome, slot: "home" }, // wake up at home
	{ hour: 8, state: NPCState.AtWork, slot: "work" }, // open the store
	{ hour: 12, state: NPCState.Break, slot: "break" }, // ← lunch at the park (store unguarded!)
	{ hour: 13, state: NPCState.AtWork, slot: "work" }, // back to the store
	{ hour: 18, state: NPCState.AtHome, slot: "home" }, // close up, head home
	{ hour: 22, state: NPCState.Sleep, slot: "home" }, // sleep
];

@Service()
export class ScheduleService implements OnStart {
	private readonly schedules = new Map<Role, ReadonlyArray<ScheduleEntry>>();

	onStart() {
		this.schedules.set(Role.Shopkeeper, SHOPKEEPER_SCHEDULE);
		print("[ScheduleService] started — schedules loaded for: Shopkeeper");
	}

	/** The daily timetable for a role (empty if none defined yet). */
	getSchedule(role: Role): ReadonlyArray<ScheduleEntry> {
		return this.schedules.get(role) ?? [];
	}
}
