import { OnStart, Service } from "@flamework/core";
import { ReplicatedStorage, Workspace } from "@rbxts/services";

/** The house model you place (in ReplicatedStorage, like the tree pack). */
const HOUSE_MODEL_NAME = "house_1";
/** Workspace folder of Parts that mark where (and which rotation) each house goes. */
const ZONES_FOLDER_NAME = "HouseZones";

/**
 * Places your custom house model at hand-authored zones — one house per Part in a Workspace
 * `HouseZones` folder. Each house is placed at its NATURAL size (no distortion), centered on
 * the zone part, sitting on the ground, and rotated to match the part's orientation.
 *
 * On boot it prints the house's footprint so you can size the zone parts to match (for
 * visualizing the layout in Studio).
 */
@Service()
export class HouseService implements OnStart {
	onStart() {
		const template = this.findHouse();
		if (template === undefined) {
			warn(`[HouseService] no "${HOUSE_MODEL_NAME}" model found in ReplicatedStorage/Workspace.`);
			return;
		}

		const size = template.GetExtentsSize();
		print(
			`[HouseService] ${template.Name} footprint ≈ ${math.floor(size.X + 0.5)} x ` +
				`${math.floor(size.Z + 0.5)} studs (height ${math.floor(size.Y + 0.5)}). ` +
				`→ make each ${ZONES_FOLDER_NAME} part this size to match.`,
		);

		const zones = this.findZones();
		if (zones.size() === 0) {
			warn(`[HouseService] no "${ZONES_FOLDER_NAME}" folder of Parts in Workspace — nothing placed.`);
			return;
		}

		this.place(template, zones);
	}

	private findHouse(): Model | undefined {
		const direct = ReplicatedStorage.FindFirstChild(HOUSE_MODEL_NAME) ?? Workspace.FindFirstChild(HOUSE_MODEL_NAME);
		if (direct !== undefined && direct.IsA("Model")) return direct;
		for (const child of ReplicatedStorage.GetChildren()) {
			if (child.IsA("Model") && string.lower(child.Name).find("house")[0] !== undefined) return child;
		}
		return undefined;
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

	private place(template: Model, zones: Array<BasePart>): void {
		const folder = new Instance("Folder");
		folder.Name = "Houses";
		folder.Parent = Workspace;

		for (const zone of zones) {
			const clone = template.Clone();

			// Sit the base on the ground (zone part's bottom) regardless of authored origin.
			const [boxCFrame, boxSize] = clone.GetBoundingBox();
			const baseToPivot = clone.GetPivot().Position.Y - (boxCFrame.Position.Y - boxSize.Y / 2);
			const groundY = zone.Position.Y - zone.Size.Y / 2;
			const [, yaw] = zone.CFrame.ToEulerAnglesYXZ(); // match the part's facing

			clone.PivotTo(
				new CFrame(zone.Position.X, groundY + baseToPivot, zone.Position.Z).mul(CFrame.Angles(0, yaw, 0)),
			);

			for (const inst of clone.GetDescendants()) {
				if (inst.IsA("BasePart")) inst.Anchored = true; // keep authored collisions; just anchor
			}
			clone.Parent = folder;

			// Hide the marker during play.
			zone.Transparency = 1;
			zone.CanCollide = false;
		}
		print(`[HouseService] placed ${zones.size()} house(s) from ${template.Name}`);
	}
}
