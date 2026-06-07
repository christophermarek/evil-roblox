import { Service, OnStart } from "@flamework/core";
import { PhysicsService, RunService } from "@rbxts/services";
import { CONFIG } from "../../shared/config";
import { Role } from "../../shared/enums";
import { NodeSlot } from "../../shared/types";
import { NPCAgent } from "../npc/NPCAgent";
import { NPCFactory, NPC_COLLISION_GROUP } from "../npc/NPCFactory";
import { ScheduleService } from "./ScheduleService";
import { TimeService } from "./TimeService";
import { TownService } from "./TownService";

/** Per-NPC home assignment; work/break nodes are derived from the role. */
interface RosterEntry {
	role: Role;
	home: string;
}

/** Body colour per role so the crowd reads at a glance. */
const ROLE_COLOR: ReadonlyMap<Role, Color3> = new Map<Role, Color3>([
	[Role.Shopkeeper, Color3.fromRGB(70, 110, 200)], // blue
	[Role.Teacher, Color3.fromRGB(150, 90, 190)], // purple
	[Role.Resident, Color3.fromRGB(210, 140, 70)], // orange
	[Role.Student, Color3.fromRGB(90, 180, 90)], // green
]);

/** Random horizontal offset so co-located NPCs don't spawn/stack on the exact same stud. */
function jitter(radius: number): Vector3 {
	return new Vector3((math.random() - 0.5) * 2 * radius, 0, (math.random() - 0.5) * 2 * radius);
}

/**
 * Spawns and owns the town's population; ticks every NPC's state machine (server authority).
 * One fixed-interval Heartbeat loop drives them all (BUILD_PLAN §A2).
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

	/** Which node a role works at during the day. */
	private workNodeName(role: Role): string {
		if (role === Role.Shopkeeper) return "StoreNode";
		if (role === Role.Teacher || role === Role.Student) return "SchoolNode";
		return "ParkNode"; // Resident: out and about
	}

	private buildRoster(): Array<RosterEntry> {
		const roster = new Array<RosterEntry>();
		roster.push({ role: Role.Shopkeeper, home: "HomeNode_1" });
		roster.push({ role: Role.Teacher, home: "HomeNode_2" });
		// one resident per house
		for (let i = 1; i <= CONFIG.town.HOUSE_COUNT; i++) {
			roster.push({ role: Role.Resident, home: `HomeNode_${i}` });
		}
		// two students per house
		for (let i = 1; i <= CONFIG.town.HOUSE_COUNT; i++) {
			roster.push({ role: Role.Student, home: `HomeNode_${i}` });
			roster.push({ role: Role.Student, home: `HomeNode_${i}` });
		}
		return roster;
	}

	private spawnPopulation(): void {
		const roster = this.buildRoster();
		const park = this.townService.getNode("ParkNode");
		if (park === undefined) {
			warn("[NPCService] ParkNode missing — aborting population spawn");
			return;
		}

		let index = 0;
		for (const entry of roster) {
			index++;
			const home = this.townService.getNode(entry.home);
			const work = this.townService.getNode(this.workNodeName(entry.role));
			if (home === undefined || work === undefined) {
				warn(`[NPCService] skipping ${entry.role} — missing home/work node`);
				continue;
			}

			// Personal jitter applied to every destination, so crowds spread out rather
			// than piling on one stud at the school / park / a shared house.
			const offset = jitter(7);
			const spawnPos = home.position.add(offset);
			const npcName = `${entry.role}_${index}`;
			const color = ROLE_COLOR.get(entry.role) ?? Color3.fromRGB(200, 200, 200);

			const model = NPCFactory.create(npcName, spawnPos, color);
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

			const schedule = this.scheduleService.getSchedule(entry.role);
			this.agents.push(new NPCAgent(npcName, model, humanoid, root, schedule, nodeMap));
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
