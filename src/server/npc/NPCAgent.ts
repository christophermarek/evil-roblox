import { NPCState } from "../../shared/enums";
import { NodeSlot, ScheduleEntry } from "../../shared/types";
import { NavAgent } from "./NavAgent";
import { StateHandlers, StateMachine } from "./StateMachine";

/**
 * One living NPC: owns its model + NavAgent + a StateMachine, and drives behavior from a
 * daily schedule. The schedule says "at hour H, be at slot S in state X"; when the active
 * phase changes the agent commutes (pathfinds) to the new slot, then settles into X.
 *
 * States: Commuting (travelling) + the settled states AtHome / AtWork / Break / Sleep.
 * Reactive states (Fleeing, …) plug into the same machine in M4.
 */
export class NPCAgent {
	readonly fsm: StateMachine<NPCState, NPCAgent>;
	private readonly navAgent: NavAgent;

	private currentEntry?: ScheduleEntry;
	private settledState: NPCState = NPCState.AtHome;
	private targetSlot: NodeSlot = "home";
	private arrived = false;

	constructor(
		readonly npcName: string,
		readonly model: Model,
		humanoid: Humanoid,
		private readonly root: BasePart,
		private readonly schedule: ReadonlyArray<ScheduleEntry>,
		private readonly nodePositions: ReadonlyMap<NodeSlot, Vector3>,
	) {
		this.navAgent = new NavAgent(humanoid, root);
		this.fsm = new StateMachine<NPCState, NPCAgent>(this, npcName);
		this.registerStates();
	}

	/** Called each tick by NPCService with the current in-game hour. */
	update(hour: number, dt: number): void {
		const entry = activeEntry(this.schedule, hour);
		if (entry !== undefined && entry !== this.currentEntry) {
			this.currentEntry = entry;
			this.settledState = entry.state;
			this.targetSlot = entry.slot;
			this.beginCommute(); // NavAgent auto-cancels any in-progress walk
			this.fsm.transition(NPCState.Commuting);
		}
		this.fsm.update(dt);
	}

	private positionFor(slot: NodeSlot): Vector3 {
		return this.nodePositions.get(slot) ?? this.root.Position;
	}

	private beginCommute(): void {
		this.arrived = false;
		this.navAgent
			.moveTo(this.positionFor(this.targetSlot))
			.then(() => {
				this.arrived = true;
			})
			.catch(() => {
				this.arrived = true; // give up gracefully; settle where we are
			});
	}

	private registerStates(): void {
		this.fsm.addState(NPCState.Commuting, {
			onUpdate: () => {
				if (this.arrived) this.fsm.transition(this.settledState);
			},
		});

		// Settled states are idle for now (idle anims / store-open logic land in M3/M4).
		const idle: StateHandlers<NPCAgent> = {};
		this.fsm.addState(NPCState.AtHome, idle);
		this.fsm.addState(NPCState.AtWork, idle);
		this.fsm.addState(NPCState.Break, idle);
		this.fsm.addState(NPCState.Sleep, idle);
	}
}

/**
 * The active schedule entry for `hour`: the last entry whose hour ≤ now. Before the day's
 * first entry, wrap to the final entry (yesterday's last phase carries over, e.g. Sleep).
 * Assumes `schedule` is sorted ascending by hour.
 */
function activeEntry(schedule: ReadonlyArray<ScheduleEntry>, hour: number): ScheduleEntry | undefined {
	if (schedule.size() === 0) return undefined;
	let chosen = schedule[schedule.size() - 1];
	for (const entry of schedule) {
		if (entry.hour <= hour) chosen = entry;
	}
	return chosen;
}
