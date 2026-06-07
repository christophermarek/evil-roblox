import { Service, OnStart } from "@flamework/core";
import { PhysicsService, RunService } from "@rbxts/services";
import { CONFIG } from "../../shared/config";
import { ROLES, POPULATION, RosterEntry } from "../../shared/roles";
import { NodeSlot } from "../../shared/types";
import { NPCAgent } from "../npc/NPCAgent";
import { NPCFactory, NPC_COLLISION_GROUP } from "../npc/NPCFactory";
import { ScheduleService } from "./ScheduleService";
import { TimeService } from "./TimeService";
import { TownService } from "./TownService";

/** Random horizontal offset so co-located NPCs don't spawn/stack on the exact same stud. */
function jitter(radius: number): Vector3 {
	return new Vector3((math.random() - 0.5) * 2 * radius, 0, (math.random() - 0.5) * 2 * radius);
}

/**
 * Spawns and owns the town's population; ticks every NPC's state machine (server authority).
 * Role data (schedule, work/break node, colour) and the roster come from shared `roles.ts`.
 */
@Service()
export class NPCService implements OnStart {
	private readonly agents = new Array<NPCAgent>();

	constructor(
		private readonly townService: TownService,
		private readonly scheduleService: ScheduleService,
		private readonly timeService: TimeService,
	) {}

	onStart() {
		print("[NPCService] started");
		this.setupCollisionGroup();
		this.spawnPopulation();
		print(`[NPCService] spawned ${this.agents.size()} NPCs`);
		this.startTickLoop();
	}

	/** NPCs collide with the world but not each other (no shoving / clumping). */
	private setupCollisionGroup(): void {
		pcall(() => {
			PhysicsService.RegisterCollisionGroup(NPC_COLLISION_GROUP);
			PhysicsService.CollisionGroupSetCollidable(NPC_COLLISION_GROUP, NPC_COLLISION_GROUP, false);
		});
	}

	/** Expand POPULATION (shared) into one roster entry per NPC for the current house count. */
	private buildRoster(): Array<RosterEntry> {
		const roster = new Array<RosterEntry>();
		for (const entry of POPULATION.unique) roster.push(entry);
		for (let home = 1; home <= CONFIG.town.HOUSE_COUNT; home++) {
			for (const role of POPULATION.perHouse) roster.push({ role, homeIndex: home });
		}
		return roster;
	}

	private spawnPopulation(): void {
		let index = 0;
		for (const entry of this.buildRoster()) {
			index++;
			const cfg = ROLES[entry.role];
			const home = this.townService.getNode(`HomeNode_${entry.homeIndex}`);
			const work = this.townService.getNode(cfg.workNode);
			const park = this.townService.getNode(cfg.breakNode);
			if (home === undefined || work === undefined || park === undefined) {
				warn(`[NPCService] skipping ${entry.role} — missing home/work/break node`);
				continue;
			}

			// Personal jitter applied to every destination, so crowds spread out rather
			// than piling on one stud at the school / park / a shared house.
			const offset = jitter(7);
			const spawnPos = home.position.add(offset);
			const npcName = `${entry.role}_${index}`;

			const model = NPCFactory.create(npcName, spawnPos, cfg.color);
			const humanoid = model.FindFirstChildOfClass("Humanoid");
			const root = model.PrimaryPart;
			if (humanoid === undefined || root === undefined) {
				warn(`[NPCService] ${npcName} rig missing Humanoid/PrimaryPart`);
				continue;
			}

			const nodeMap = new Map<NodeSlot, Vector3>();
			nodeMap.set("home", spawnPos);
			nodeMap.set("work", work.position.add(offset));
			nodeMap.set("break", park.position.add(offset));

			this.agents.push(
				new NPCAgent(npcName, model, humanoid, root, this.scheduleService.getSchedule(entry.role), nodeMap),
			);
		}
	}

	/**
	 * One Heartbeat connection ticks all agents on a fixed interval (BUILD_PLAN §A2 — not
	 * per-frame). Agents only pathfind on phase changes, so this stays cheap at this scale.
	 */
	private startTickLoop(): void {
		let accumulator = 0;
		RunService.Heartbeat.Connect((dt) => {
			accumulator += dt;
			if (accumulator < CONFIG.npc.TICK_INTERVAL) return;
			const elapsed = accumulator;
			accumulator = 0;

			const hour = this.timeService.getHour();
			for (const agent of this.agents) {
				agent.update(hour, elapsed);
			}
		});
	}
}
