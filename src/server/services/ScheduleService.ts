import { Service, OnStart } from "@flamework/core";
import { NPCState, Role } from "../../shared/enums";
import { ScheduleEntry } from "../../shared/types";

/**
 * Per-role daily timetables. Each entry says "from this hour, head to this slot and settle
 * into this state". Slots (home/work/break) are resolved to concrete nodes per-NPC by
 * NPCService, so one schedule serves every NPC of a role.
 *
 * Timings are staggered across roles to create believable rush-hour WAVES:
 *  - 08:00 everyone commutes to work/school (morning rush)
 *  - 15:00 students flood OUT of school to the park (the street-crowd moment)
 *  - 18:00 everyone heads home (evening rush)
 */
const SHOPKEEPER_SCHEDULE: ReadonlyArray<ScheduleEntry> = [
	{ hour: 7, state: NPCState.AtHome, slot: "home" },
	{ hour: 8, state: NPCState.AtWork, slot: "work" }, // open the store
	{ hour: 12, state: NPCState.Break, slot: "break" }, // lunch at the park ← store unguarded
	{ hour: 14, state: NPCState.AtWork, slot: "work" }, // back to the store
	{ hour: 18, state: NPCState.AtHome, slot: "home" },
	{ hour: 22, state: NPCState.Sleep, slot: "home" },
];

const TEACHER_SCHEDULE: ReadonlyArray<ScheduleEntry> = [
	{ hour: 7, state: NPCState.AtHome, slot: "home" },
	{ hour: 8, state: NPCState.AtWork, slot: "work" }, // teach at school
	{ hour: 16, state: NPCState.Break, slot: "break" }, // unwind at the park after class
	{ hour: 18, state: NPCState.AtHome, slot: "home" },
	{ hour: 22, state: NPCState.Sleep, slot: "home" },
];

const STUDENT_SCHEDULE: ReadonlyArray<ScheduleEntry> = [
	{ hour: 7, state: NPCState.AtHome, slot: "home" },
	{ hour: 8, state: NPCState.AtWork, slot: "work" }, // school
	{ hour: 15, state: NPCState.Break, slot: "break" }, // after-school play at the park ← the WAVE
	{ hour: 18, state: NPCState.AtHome, slot: "home" },
	{ hour: 21, state: NPCState.Sleep, slot: "home" },
];

const RESIDENT_SCHEDULE: ReadonlyArray<ScheduleEntry> = [
	{ hour: 7, state: NPCState.AtHome, slot: "home" },
	{ hour: 9, state: NPCState.AtWork, slot: "work" }, // out and about (park / town)
	{ hour: 12, state: NPCState.AtHome, slot: "home" }, // home for lunch
	{ hour: 14, state: NPCState.AtWork, slot: "work" },
	{ hour: 18, state: NPCState.AtHome, slot: "home" },
	{ hour: 22, state: NPCState.Sleep, slot: "home" },
];

@Service()
export class ScheduleService implements OnStart {
	private readonly schedules = new Map<Role, ReadonlyArray<ScheduleEntry>>();

	onStart() {
		this.schedules.set(Role.Shopkeeper, SHOPKEEPER_SCHEDULE);
		this.schedules.set(Role.Teacher, TEACHER_SCHEDULE);
		this.schedules.set(Role.Student, STUDENT_SCHEDULE);
		this.schedules.set(Role.Resident, RESIDENT_SCHEDULE);
		print("[ScheduleService] started — schedules loaded for Shopkeeper/Teacher/Student/Resident");
	}

	/** The daily timetable for a role (empty if none defined yet). */
	getSchedule(role: Role): ReadonlyArray<ScheduleEntry> {
		return this.schedules.get(role) ?? [];
	}
}
