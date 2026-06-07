import { Service, OnInit } from "@flamework/core";
import { NodeKind } from "../../shared/enums";
import { TownNode } from "../../shared/types";
import { TownBuilder } from "../town/TownBuilder";

/**
 * Builds the town on boot and owns the queryable node graph (the map contract).
 * Other services (Schedule, NPC) ask TownService "where is StoreNode?" rather than
 * touching geometry — so geometry can change without touching AI.
 *
 * Builds in OnInit (which Flamework completes for ALL services before any OnStart) so
 * the node registry is guaranteed ready before NPCService spawns anyone.
 */
@Service()
export class TownService implements OnInit {
	private readonly nodes = new Map<string, TownNode>();
	private nightLights: ReadonlyArray<Light> = [];

	onInit() {
		const built = TownBuilder.build();
		for (const node of built.nodes) {
			this.nodes.set(node.name, node);
		}
		this.nightLights = built.nightLights;
		print(`[TownService] built town with ${this.nodes.size()} nodes, ${this.nightLights.size()} night lights`);
	}

	/** Lights that should switch on at night (lamp posts, etc.). */
	getNightLights(): ReadonlyArray<Light> {
		return this.nightLights;
	}

	/** Look up a node by name, e.g. "StoreNode" or "HomeNode_1". */
	getNode(name: string): TownNode | undefined {
		return this.nodes.get(name);
	}

	/** All nodes of a given kind, e.g. every Home node. */
	getNodesByKind(kind: NodeKind): Array<TownNode> {
		const result = new Array<TownNode>();
		for (const [, node] of this.nodes) {
			if (node.kind === kind) result.push(node);
		}
		return result;
	}

	/** All registered nodes. */
	getAllNodes(): Array<TownNode> {
		const result = new Array<TownNode>();
		for (const [, node] of this.nodes) result.push(node);
		return result;
	}
}
