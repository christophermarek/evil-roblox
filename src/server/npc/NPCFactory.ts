import { Workspace } from "@rbxts/services";
import { CONFIG } from "../../shared/config";

/**
 * Builds a minimal-but-reliable Humanoid NPC rig entirely in code, so M2 needs no
 * imported character asset (those become cosmetic skins later, per BUILD_PLAN §A4).
 *
 * Recipe chosen for robustness: the HumanoidRootPart is the collider that rests on the
 * ground (HipHeight 0), with a welded head on top. Humanoid:MoveTo drives the root and
 * the welded parts follow — works with PathfindingService out of the box.
 */
/** Collision group NPCs belong to — they collide with the world but pass through each other. */
export const NPC_COLLISION_GROUP = "NPCs";

export namespace NPCFactory {
	function weld(part0: BasePart, part1: BasePart): void {
		const wc = new Instance("WeldConstraint");
		wc.Part0 = part0;
		wc.Part1 = part1;
		wc.Parent = part0;
	}

	export function create(npcName: string, spawnPos: Vector3, bodyColor: Color3): Model {
		const model = new Instance("Model");
		model.Name = npcName;

		// Body == HumanoidRootPart (collides, rests on ground).
		const root = new Instance("Part");
		root.Name = "HumanoidRootPart";
		root.Size = new Vector3(2, 3, 1);
		root.Color = bodyColor;
		root.Material = Enum.Material.SmoothPlastic;
		root.CanCollide = true;
		root.CanTouch = false;
		root.CastShadow = true;
		root.CollisionGroup = NPC_COLLISION_GROUP; // don't shove other NPCs
		root.CFrame = new CFrame(spawnPos.add(new Vector3(0, 1.5, 0)));
		root.Parent = model;

		// Head (cosmetic, welded, no collision/query per §A2 hygiene).
		const head = new Instance("Part");
		head.Name = "Head";
		head.Size = new Vector3(1.4, 1.4, 1.4);
		head.Color = Color3.fromRGB(235, 200, 160);
		head.Material = Enum.Material.SmoothPlastic;
		head.CanCollide = false;
		head.CanTouch = false;
		head.CanQuery = false;
		head.CastShadow = false;
		head.CFrame = root.CFrame.mul(new CFrame(0, 2.2, 0));
		head.Parent = model;
		weld(root, head);

		const humanoid = new Instance("Humanoid");
		humanoid.WalkSpeed = CONFIG.npc.WALK_SPEED;
		humanoid.HipHeight = 0;
		humanoid.Parent = model;

		model.PrimaryPart = root;
		model.Parent = Workspace;
		return model;
	}
}
