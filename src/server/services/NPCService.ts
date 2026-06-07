import { Service, OnStart } from "@flamework/core";
import { NPCFactory } from "../npc/NPCFactory";
import { NavAgent } from "../npc/NavAgent";
import { TownService } from "./TownService";

/**
 * Spawns and owns every NPC; runs their state machines (server authority).
 *
 * M2 checkpoint: spawns ONE shopkeeper at HomeNode_1 and walks it to the StoreNode once,
 * to prove the rig + pathfinding work. The FSM + schedule (M2.4/M2.5) replace this demo.
 */
@Service()
export class NPCService implements OnStart {
	constructor(private readonly townService: TownService) {}

	onStart() {
		print("[NPCService] started");

		const home = this.townService.getNode("HomeNode_1");
		const store = this.townService.getNode("StoreNode");
		if (home === undefined || store === undefined) {
			warn("[NPCService] missing HomeNode_1 or StoreNode — cannot spawn demo NPC");
			return;
		}

		const shopkeeper = NPCFactory.create("Shopkeeper", home.position, Color3.fromRGB(70, 110, 200));
		const humanoid = shopkeeper.FindFirstChildOfClass("Humanoid");
		const root = shopkeeper.PrimaryPart;
		if (humanoid === undefined || root === undefined) {
			warn("[NPCService] spawned rig is missing Humanoid/PrimaryPart");
			return;
		}

		const agent = new NavAgent(humanoid, root);
		print("[NPCService] demo: walking Shopkeeper HomeNode_1 → StoreNode");
		agent
			.moveTo(store.position)
			.then((ok) => print(`[NPCService] demo walk finished, reached store = ${ok}`))
			.catch((err) => warn(`[NPCService] demo walk errored: ${err}`));
	}
}
