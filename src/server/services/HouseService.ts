import { OnStart, Service } from "@flamework/core";
import { ReplicatedStorage, Workspace } from "@rbxts/services";

/** The house model you place (in ReplicatedStorage, like the tree pack). */
const HOUSE_MODEL_NAME = "house_1";
/** Workspace folder of house-zone Models, each with a `baseplate` part + a `front` part. */
const ZONES_FOLDER_NAME = "HouseZones";
/** Child model whose parts get a per-house random colour. */
const SIDING_MODEL_NAME = "Siding";
/**
 * Extra yaw (degrees) always added after aligning the house's front to the zone's `front`.
 * The Front Door marker sits 90° off the door's actual facing, so +90 brings the door to
 * the front. If houses end up backwards/sideways, change this (90 / -90 / 180).
 */
const HOUSE_FRONT_YAW_DEG = -90;

/** Pleasant house-siding colours; each house picks one at random. */
const SIDING_COLORS: ReadonlyArray<Color3> = [
	Color3.fromRGB(228, 228, 220), // white
	Color3.fromRGB(210, 196, 160), // beige
	Color3.fromRGB(150, 180, 200), // light blue
	Color3.fromRGB(150, 175, 140), // sage green
	Color3.fromRGB(226, 202, 120), // pale yellow
	Color3.fromRGB(170, 170, 176), // gray
	Color3.fromRGB(176, 92, 80), // barn red
	Color3.fromRGB(190, 150, 120), // tan
	Color3.fromRGB(120, 150, 172), // steel blue
	Color3.fromRGB(176, 132, 170), // dusty mauve
];

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
		recolorSiding(clone);

		// Uniform scale so the house fits the baseplate footprint without distortion.
		const [, naturalSize] = clone.GetBoundingBox();
		const scale = math.min(base.Size.X / naturalSize.X, base.Size.Z / naturalSize.Z);
		clone.ScaleTo(scale);

		// Sit the base on top of the baseplate regardless of authored origin.
		const [boxCFrame, boxSize] = clone.GetBoundingBox();
		const baseToPivot = clone.GetPivot().Position.Y - (boxCFrame.Position.Y - boxSize.Y / 2);
		const groundY = base.Position.Y + base.Size.Y / 2;

		// Desired world facing: from the baseplate toward the zone's `front` part.
		const toFront = new Vector3(front.Position.X - base.Position.X, 0, front.Position.Z - base.Position.Z);
		const desired = toFront.Magnitude > 0.05 ? toFront.Unit : new Vector3(0, 0, -1);

		// The house's OWN front: from a Front/Door marker inside it (precise), else assume -Z
		// plus the manual offset. Rotate the house so its front lines up with `desired`.
		const marker = houseFrontDir(clone);
		const nativeFront = marker ?? flattenDir(clone.GetPivot().LookVector);
		const yaw = signedYaw(nativeFront, desired) + math.rad(HOUSE_FRONT_YAW_DEG);

		const pos = new Vector3(base.Position.X, groundY + baseToPivot, base.Position.Z);
		const worldRot = CFrame.Angles(0, yaw, 0).mul(clone.GetPivot().Rotation);
		clone.PivotTo(new CFrame(pos).mul(worldRot));

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

/** Project a direction onto the horizontal plane (returns a unit vector, or -Z if degenerate). */
function flattenDir(v: Vector3): Vector3 {
	const flat = new Vector3(v.X, 0, v.Z);
	return flat.Magnitude > 1e-3 ? flat.Unit : new Vector3(0, 0, -1);
}

/** Signed yaw (radians, about +Y) that rotates direction `from` onto direction `to`. */
function signedYaw(from: Vector3, to: Vector3): number {
	const a = flattenDir(from);
	const b = flattenDir(to);
	return math.atan2(a.Cross(b).Y, a.Dot(b));
}

/** The house's own front direction, from a `Front`/`Door` marker part relative to its centre. */
function houseFrontDir(house: Model): Vector3 | undefined {
	const [boxCFrame] = house.GetBoundingBox();
	const center = boxCFrame.Position;
	for (const inst of house.GetDescendants()) {
		if (!inst.IsA("BasePart")) continue;
		const name = string.lower(inst.Name);
		if (name.find("front")[0] !== undefined || name.find("door")[0] !== undefined) {
			const dir = new Vector3(inst.Position.X - center.X, 0, inst.Position.Z - center.Z);
			if (dir.Magnitude > 0.1) return dir.Unit;
		}
	}
	return undefined;
}

/** Give a house a random siding colour: every BasePart inside its `Siding` model. */
function recolorSiding(house: Model): void {
	const siding = house.FindFirstChild(SIDING_MODEL_NAME);
	if (siding === undefined) return;
	const color = SIDING_COLORS[math.random(0, SIDING_COLORS.size() - 1)];
	for (const inst of siding.GetDescendants()) {
		if (inst.IsA("BasePart")) inst.Color = color;
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
