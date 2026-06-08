import { OnStart, Service } from "@flamework/core";
import { InsertService, ReplicatedStorage, Workspace } from "@rbxts/services";

/** Fallback only — used if ReplicatedStorage.TreePack isn't present. */
const TREE_PACK_ASSET_ID = 99681671190153;

/** Name of the model you drop into ReplicatedStorage (preferred source of trees). */
const TREE_PACK_NAME = "TreePack";
/** Name of the Workspace folder of zone Parts that mark where the forest goes. */
const ZONES_FOLDER_NAME = "ForestZones";

/** Roughly one tree per this many square studs of zone area. */
const STUDS_PER_TREE = 220;
const MAX_TREES_PER_ZONE = 500;

/**
 * Plants a background forest from the user's tree pack.
 *
 * Placement is driven by Studio: put a `TreePack` model in ReplicatedStorage and a
 * `ForestZones` folder of Parts in Workspace, and trees are scattered ONLY on top of those
 * zone parts (so they never collide with the town). Each zone's tree count scales with its
 * area; trees get random rotation + scale and are anchored / non-colliding.
 */
@Service()
export class ForestService implements OnStart {
	onStart() {
		const templates = this.findTemplates();
		if (templates.size() === 0) {
			warn(`[ForestService] no trees found. Put your pack in ReplicatedStorage as "${TREE_PACK_NAME}".`);
			return;
		}

		const zones = this.findZones();
		if (zones.size() === 0) {
			warn(`[ForestService] no "${ZONES_FOLDER_NAME}" folder of Parts in Workspace — nothing planted.`);
			print(`[ForestService] (Add a Workspace folder "${ZONES_FOLDER_NAME}" with Parts marking forest areas.)`);
			return;
		}

		print(`[ForestService] ${templates.size()} tree template(s), ${zones.size()} zone(s) — planting...`);
		this.plant(templates, zones);
	}

	/** Prefer a hand-placed ReplicatedStorage.TreePack; fall back to LoadAsset. */
	private findTemplates(): Array<Model | BasePart> {
		const packInRS = ReplicatedStorage.FindFirstChild(TREE_PACK_NAME);
		if (packInRS !== undefined) {
			const found = new Array<Model | BasePart>();
			collectTemplates(packInRS, found);
			print(`[ForestService] using ReplicatedStorage.${TREE_PACK_NAME}`);
			return found;
		}

		const [ok, result] = pcall(() => InsertService.LoadAsset(TREE_PACK_ASSET_ID));
		if (!ok) {
			warn(`[ForestService] LoadAsset fallback failed: ${result}`);
			return [];
		}
		const found = new Array<Model | BasePart>();
		collectTemplates(result as Instance, found);
		return found;
	}

	private findZones(): Array<BasePart> {
		const folder = Workspace.FindFirstChild(ZONES_FOLDER_NAME);
		if (folder === undefined) return [];
		const zones = new Array<BasePart>();
		for (const child of folder.GetChildren()) {
			if (child.IsA("BasePart")) zones.push(child);
		}
		return zones;
	}

	private plant(templates: Array<Model | BasePart>, zones: Array<BasePart>): void {
		const forest = new Instance("Folder");
		forest.Name = "Forest";
		forest.Parent = Workspace;

		let total = 0;
		for (const zone of zones) {
			const area = zone.Size.X * zone.Size.Z;
			const count = math.clamp(math.floor(area / STUDS_PER_TREE), 1, MAX_TREES_PER_ZONE);
			const topY = zone.Position.Y + zone.Size.Y / 2;
			const halfX = zone.Size.X / 2;
			const halfZ = zone.Size.Z / 2;

			for (let i = 0; i < count; i++) {
				// Random point within the zone's footprint (assumes axis-aligned zones).
				const x = zone.Position.X + (math.random() - 0.5) * 2 * halfX;
				const z = zone.Position.Z + (math.random() - 0.5) * 2 * halfZ;
				const template = templates[math.random(0, templates.size() - 1)];
				plantOne(template, x, z, topY, forest);
				total++;
			}

			// Hide the marker so it doesn't show during play.
			zone.Transparency = 1;
			zone.CanCollide = false;
		}
		print(`[ForestService] planted ${total} trees across ${zones.size()} zone(s)`);
	}
}

function plantOne(template: Model | BasePart, x: number, z: number, groundY: number, parent: Instance): void {
	const clone = template.Clone();
	const angle = math.random() * math.pi * 2;
	const scale = 0.8 + math.random() * 0.9; // 0.8–1.7×

	if (clone.IsA("Model")) {
		clone.ScaleTo(scale);
		const [boxCFrame, boxSize] = clone.GetBoundingBox();
		const baseToPivot = clone.GetPivot().Position.Y - (boxCFrame.Position.Y - boxSize.Y / 2);
		clone.PivotTo(new CFrame(x, groundY + baseToPivot, z).mul(CFrame.Angles(0, angle, 0)));
		for (const inst of clone.GetDescendants()) {
			if (inst.IsA("BasePart")) {
				inst.Anchored = true;
				inst.CanCollide = false;
				inst.CastShadow = false;
			}
		}
	} else {
		clone.Size = clone.Size.mul(scale);
		clone.CFrame = new CFrame(x, groundY + clone.Size.Y / 2, z).mul(CFrame.Angles(0, angle, 0));
		clone.Anchored = true;
		clone.CanCollide = false;
		clone.CastShadow = false;
	}
	clone.Parent = parent;
}

/**
 * Collect INDIVIDUAL trees from a pack. A tree is a MeshPart, or a "leaf" Model (one with
 * parts but no child Models). Groups (Models/Folders containing child Models) are descended
 * into — so we never clone the whole pack as a single template.
 */
function collectTemplates(root: Instance, out: Array<Model | BasePart>): void {
	for (const child of root.GetChildren()) {
		if (child.IsA("MeshPart")) {
			out.push(child);
		} else if (child.IsA("Model")) {
			let hasChildModel = false;
			for (const c of child.GetChildren()) {
				if (c.IsA("Model")) {
					hasChildModel = true;
					break;
				}
			}
			if (hasChildModel) {
				collectTemplates(child, out); // a group of trees → descend
			} else {
				out.push(child); // a single tree
			}
		} else if (child.IsA("Folder")) {
			collectTemplates(child, out);
		}
	}
}
