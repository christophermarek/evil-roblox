import { OnStart, Service } from "@flamework/core";
import { ReplicatedStorage, Workspace } from "@rbxts/services";

/** The house model you place (in ReplicatedStorage, like the tree pack). */
const HOUSE_MODEL_NAME = "house_1";
/** Workspace folder of house-zone Models, each with a `baseplate` part + a `front` part. */
const ZONES_FOLDER_NAME = "HouseZones";

/**
 * Places your custom house model at hand-authored zones. Each zone is a Model in
 * Workspace.`HouseZones` containing:
 *   • a baseplate part — its footprint sizes the house and its position sits it on the ground,
 *   • a part named `front` — the house is rotated so its front faces this part.
 *
 * The house is uniformly scaled to fit the baseplate (so the baseplate is a true WYSIWYG
 * guide), undistorted, base on the baseplate, oriented toward `front`.
 */
@Service()
export class HouseService implements OnStart {
	onStart() {
		const template = this.findHouse();
		if (template === undefined) {
			warn(`[HouseService] no "${HOUSE_MODEL_NAME}" model found in ReplicatedStorage/Workspace.`);
			return;
		}

		const zones = this.findZones();
		if (zones.size() === 0) {
			warn(`[HouseService] no "${ZONES_FOLDER_NAME}" folder of Models in Workspace — nothing placed.`);
			return;
		}

		let placed = 0;
		const housesFolder = new Instance("Folder");
		housesFolder.Name = "Houses";
		housesFolder.Parent = Workspace;

		for (const zone of zones) {
			if (this.placeOne(template, zone, housesFolder)) placed++;
		}
		print(`[HouseService] placed ${placed}/${zones.size()} house(s) from ${template.Name}`);
	}

	private placeOne(template: Model, zone: Model, parent: Instance): boolean {
		const [base, front] = getZoneParts(zone);
		if (base === undefined || front === undefined) {
			warn(`[HouseService] zone "${zone.Name}" needs a baseplate part + a part named "front" — skipped.`);
			return false;
		}

		const clone = template.Clone();

		// Uniform scale so the house fits the baseplate footprint without distortion.
		const [, naturalSize] = clone.GetBoundingBox();
		const scale = math.min(base.Size.X / naturalSize.X, base.Size.Z / naturalSize.Z);
		clone.ScaleTo(scale);

		// Sit the base on top of the baseplate regardless of authored origin.
		const [boxCFrame, boxSize] = clone.GetBoundingBox();
		const baseToPivot = clone.GetPivot().Position.Y - (boxCFrame.Position.Y - boxSize.Y / 2);
		const groundY = base.Position.Y + base.Size.Y / 2;

		// Orient: the house's front (-Z / LookVector) points from the baseplate toward `front`.
		const toFront = new Vector3(front.Position.X - base.Position.X, 0, front.Position.Z - base.Position.Z);
		const dir = toFront.Magnitude > 0.05 ? toFront.Unit : new Vector3(0, 0, -1);
		const pos = new Vector3(base.Position.X, groundY + baseToPivot, base.Position.Z);
		clone.PivotTo(CFrame.lookAt(pos, pos.add(dir)));

		for (const inst of clone.GetDescendants()) {
			if (inst.IsA("BasePart")) inst.Anchored = true; // keep authored collisions; just anchor
		}
		clone.Parent = parent;

		// Hide the zone markers during play.
		for (const inst of zone.GetDescendants()) {
			if (inst.IsA("BasePart")) {
				inst.Transparency = 1;
				inst.CanCollide = false;
			}
		}
		return true;
	}

	private findHouse(): Model | undefined {
		const direct = ReplicatedStorage.FindFirstChild(HOUSE_MODEL_NAME) ?? Workspace.FindFirstChild(HOUSE_MODEL_NAME);
		if (direct !== undefined && direct.IsA("Model")) return direct;
		for (const child of ReplicatedStorage.GetChildren()) {
			if (child.IsA("Model") && string.lower(child.Name).find("house")[0] !== undefined) return child;
		}
		return undefined;
	}

	private findZones(): Array<Model> {
		const folder = Workspace.FindFirstChild(ZONES_FOLDER_NAME);
		if (folder === undefined) return [];
		const zones = new Array<Model>();
		for (const child of folder.GetChildren()) {
			if (child.IsA("Model")) zones.push(child);
		}
		return zones;
	}
}

/** Find the baseplate + front parts in a zone model. `front` by name; baseplate = the other part. */
function getZoneParts(zone: Model): LuaTuple<[BasePart | undefined, BasePart | undefined]> {
	let base: BasePart | undefined;
	let front: BasePart | undefined;
	for (const inst of zone.GetDescendants()) {
		if (!inst.IsA("BasePart")) continue;
		const name = string.lower(inst.Name);
		if (name.find("front")[0] !== undefined) {
			front = inst;
		} else if (base === undefined || name.find("base")[0] !== undefined) {
			base = inst;
		}
	}
	return $tuple(base, front);
}
