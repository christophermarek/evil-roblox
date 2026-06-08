import { OnStart, Service } from "@flamework/core";
import { InsertService, Workspace } from "@rbxts/services";

/** The user's uploaded tree pack (https://create.roblox.com/store/asset/99681671190153). */
const TREE_PACK_ASSET_ID = 99681671190153;

/** How many trees to scatter in the background forest ring. */
const TREE_COUNT = 240;

// Keep this rectangle (the town play area) clear of trees.
const CLEAR_X_HALF = 240;
const CLEAR_Z_MIN = -115;
const CLEAR_Z_MAX = 100;
/** Trees scatter out to here (kept inside the grass terrain footprint). */
const MAP_HALF = 480;

/**
 * Loads the tree-pack asset, finds the individual tree templates inside it, and plants a
 * dense background forest around the town to sell a "town in the woods" look. Runs after the
 * town is built (TownService builds in OnInit; this is OnStart).
 */
@Service()
export class ForestService implements OnStart {
	onStart() {
		const templates = this.loadTreeTemplates();
		if (templates.size() === 0) {
			warn("[ForestService] no tree templates found in the pack — skipping forest");
			return;
		}
		print(`[ForestService] loaded ${templates.size()} tree template(s); planting forest...`);
		this.plantForest(templates);
	}

	/** Load the pack and collect every tree (Model or MeshPart), descending through folders. */
	private loadTreeTemplates(): Array<Model | BasePart> {
		const [ok, result] = pcall(() => InsertService.LoadAsset(TREE_PACK_ASSET_ID));
		if (!ok) {
			warn(`[ForestService] LoadAsset(${TREE_PACK_ASSET_ID}) failed: ${result}`);
			return [];
		}
		return collectTemplates(result as Instance);
	}

	private plantForest(templates: Array<Model | BasePart>): void {
		const forest = new Instance("Folder");
		forest.Name = "Forest";
		forest.Parent = Workspace;

		let planted = 0;
		let attempts = 0;
		const maxAttempts = TREE_COUNT * 6;
		while (planted < TREE_COUNT && attempts < maxAttempts) {
			attempts++;
			const x = (math.random() - 0.5) * 2 * MAP_HALF;
			const z = (math.random() - 0.5) * 2 * MAP_HALF;
			// Skip anything inside the town play area.
			if (math.abs(x) < CLEAR_X_HALF && z > CLEAR_Z_MIN && z < CLEAR_Z_MAX) continue;

			const template = templates[math.random(0, templates.size() - 1)];
			this.plantOne(template, new Vector3(x, 0, z), forest);
			planted++;
		}
		print(`[ForestService] planted ${planted} trees in the background forest`);
	}

	private plantOne(template: Model | BasePart, pos: Vector3, parent: Instance): void {
		const clone = template.Clone();
		const angle = math.random() * math.pi * 2;
		const scale = 0.8 + math.random() * 0.9; // 0.8–1.7× for natural variety

		if (clone.IsA("Model")) {
			clone.ScaleTo(scale);
			// Sit the base on the ground (y = 0) regardless of the model's authored origin.
			const [boxCFrame, boxSize] = clone.GetBoundingBox();
			const baseToPivot = clone.GetPivot().Position.Y - (boxCFrame.Position.Y - boxSize.Y / 2);
			clone.PivotTo(new CFrame(pos.X, baseToPivot, pos.Z).mul(CFrame.Angles(0, angle, 0)));
		} else {
			clone.Size = clone.Size.mul(scale);
			clone.CFrame = new CFrame(pos.X, clone.Size.Y / 2, pos.Z).mul(CFrame.Angles(0, angle, 0));
		}

		// Background scenery: anchored, no collision, no shadow cost.
		for (const inst of clone.IsA("Model") ? clone.GetDescendants() : [clone]) {
			if (inst.IsA("BasePart")) {
				inst.Anchored = true;
				inst.CanCollide = false;
				inst.CastShadow = false;
			}
		}
		clone.Parent = parent;
	}
}

/** Recursively collect tree templates: whole Models and standalone MeshParts, through folders. */
function collectTemplates(root: Instance): Array<Model | BasePart> {
	const out = new Array<Model | BasePart>();
	for (const child of root.GetChildren()) {
		if (child.IsA("Model")) {
			out.push(child);
		} else if (child.IsA("MeshPart") || child.IsA("BasePart")) {
			out.push(child);
		} else if (child.IsA("Folder") || child.IsA("Configuration")) {
			for (const nested of collectTemplates(child)) out.push(nested);
		}
	}
	return out;
}
