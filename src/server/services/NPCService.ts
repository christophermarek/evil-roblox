import { Service, OnStart } from "@flamework/core";
import { RunService } from "@rbxts/services";
import { CONFIG } from "../../shared/config";
import { Role } from "../../shared/enums";
import { NodeSlot } from "../../shared/types";
import { NPCAgent } from "../npc/NPCAgent";
import { NPCFactory } from "../npc/NPCFactory";
import { ScheduleService } from "./ScheduleService";
import { TimeService } from "./TimeService";
import { TownService } from "./TownService";

/**
 * Spawns and owns every NPC; ticks their state machines (server authority).
 *
 * M2: one Shopkeeper living a full daily schedule. The tick loop already iterates a list,
 * so M3 just spawns more agents into it.
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
		this.spawnShopkeeper();
		this.startTickLoop();
	}

	private spawnShopkeeper(): void {
		const home = this.townService.getNode("HomeNode_1");
		const store = this.townService.getNode("StoreNode");
		const park = this.townService.getNode("ParkNode");
		if (home === undefined || store === undefined || park === undefined) {
			warn("[NPCService] missing a required node (HomeNode_1 / StoreNode / ParkNode)");
			return;
		}

		const model = NPCFactory.create("Shopkeeper", home.position, Color3.fromRGB(70, 110, 200));
		const humanoid = model.FindFirstChildOfClass("Humanoid");
		const root = model.PrimaryPart;
		if (humanoid === undefined || root === undefined) {
			warn("[NPCService] spawned rig missing Humanoid/PrimaryPart");
			return;
		}

		const nodeMap = new Map<NodeSlot, Vector3>();
		nodeMap.set("home", home.position);
		nodeMap.set("work", store.position);
		nodeMap.set("break", park.position);

		const schedule = this.scheduleService.getSchedule(Role.Shopkeeper);
		this.agents.push(new NPCAgent("Shopkeeper", model, humanoid, root, schedule, nodeMap));
		print("[NPCService] spawned Shopkeeper (home=HomeNode_1, work=Store, lunch=Park)");
	}

	/**
	 * One Heartbeat connection ticks all agents on a fixed interval (BUILD_PLAN §A2 — not
	 * per-frame). Per-agent jitter spreads their path computes so they don't spike together.
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
