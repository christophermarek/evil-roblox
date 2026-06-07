import { Workspace } from "@rbxts/services";
import { CONFIG } from "../../shared/config";
import { NodeKind } from "../../shared/enums";
import { TownNode } from "../../shared/types";

/**
 * Builds the static town from code-placed Parts (BUILD_PLAN §A3): the map lives in git
 * via Rojo and is fully reproducible. Geometry is a *cosmetic skin* over the node graph —
 * swapping in mesh models later won't change the node names/positions the AI routes between.
 *
 * Returns the Town model + the list of TownNodes it created (the map contract).
 *
 * Layout (top-down, +Z is "north"):
 *
 *      House_1   House_2   House_3   House_4      (z = +45, doors face the road)
 *   ───────────────────────────────────────────  main road  (z = 0, along X)
 *                    STORE                         (z = -45, door faces the road)
 */

// ── palette ──────────────────────────────────────────────────────────────────
const COLOR = {
	grass: Color3.fromRGB(106, 142, 75),
	road: Color3.fromRGB(58, 58, 64),
	sidewalk: Color3.fromRGB(165, 165, 165),
	houseWall: Color3.fromRGB(196, 174, 137),
	houseRoof: Color3.fromRGB(122, 72, 52),
	storeWall: Color3.fromRGB(170, 120, 90),
	storeRoof: Color3.fromRGB(70, 90, 120),
	door: Color3.fromRGB(92, 64, 40),
	sign: Color3.fromRGB(40, 40, 48),
	node: Color3.fromRGB(255, 230, 0),
};

interface PartProps {
	size: Vector3;
	position: Vector3;
	color: Color3;
	parent: Instance;
	material?: Enum.Material;
	canCollide?: boolean;
	transparency?: number;
	name?: string;
}

/** All static geometry shares this hygiene: anchored, no Touched events, query == collide. */
function createPart(props: PartProps): Part {
	const part = new Instance("Part");
	part.Anchored = true;
	part.Size = props.size;
	part.Position = props.position;
	part.Color = props.color;
	part.Material = props.material ?? Enum.Material.SmoothPlastic;
	part.CanCollide = props.canCollide ?? true;
	part.CanTouch = false; // we never use .Touched on static geometry
	// Perception raycasts (M4) only care about solid sight-blockers; match collision.
	part.CanQuery = props.canCollide ?? true;
	part.Transparency = props.transparency ?? 0;
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
	if (props.name !== undefined) part.Name = props.name;
	part.Parent = props.parent;
	return part;
}

/**
 * Replace grass terrain with Concrete in a footprint (top at y=0) so 3D grass blades
 * don't poke through roads/building floors, AND so pathfinding sees a cheap surface here
 * (grass is costed high in NavAgent — concrete corridors become the preferred route).
 */
function clearGrass(centerX: number, centerZ: number, sizeX: number, sizeZ: number): void {
	const depth = 16;
	Workspace.Terrain.FillBlock(
		new CFrame(centerX, -depth / 2, centerZ),
		new Vector3(sizeX, depth, sizeZ),
		Enum.Material.Concrete,
	);
}

/** Lay a flat pavement part AND carve the grass beneath it (roads, sidewalks, driveways). */
function pavement(center: Vector3, sizeXZ: Vector2, color: Color3, name: string, parent: Instance): void {
	createPart({
		size: new Vector3(sizeXZ.X, 0.2, sizeXZ.Y),
		position: center,
		color,
		material: Enum.Material.Asphalt,
		name,
		parent,
	});
	clearGrass(center.X, center.Z, sizeXZ.X, sizeXZ.Y);
}

/** A small, walkable marker part at a node (debug aid + a concrete pathfinding target). */
function createNodeMarker(node: TownNode, parent: Instance): void {
	createPart({
		size: new Vector3(2, 0.2, 2),
		position: node.position.sub(new Vector3(0, node.position.Y - 0.1, 0)),
		color: COLOR.node,
		material: Enum.Material.Neon,
		canCollide: false,
		transparency: 0.4,
		name: node.name,
		parent,
	});
}

export namespace TownBuilder {
	/**
	 * Construct the whole town. Clears any default Studio Baseplate first so the
	 * result is identical whether run in Studio or from a `rojo build` place file.
	 */
	export function build(): { model: Model; nodes: ReadonlyArray<TownNode> } {
		// Reproducibility: drop Studio's stock baseplate + any prior terrain/town.
		Workspace.FindFirstChild("Baseplate")?.Destroy();
		Workspace.FindFirstChild("Town")?.Destroy();
		Workspace.Terrain.Clear();

		const town = new Instance("Model");
		town.Name = "Town";
		town.Parent = Workspace;

		const nodesFolder = new Instance("Folder");
		nodesFolder.Name = "Nodes";
		nodesFolder.Parent = town;

		const nodes = new Array<TownNode>();

		buildGround();
		buildRoads(town);

		// Store: south of the road, door facing +Z (toward the road).
		nodes.push(buildStore(new Vector3(0, 0, -45), town));

		// Houses: a row north of the road, doors facing -Z (toward the road).
		const count = CONFIG.town.HOUSE_COUNT;
		const startX = -((count - 1) * 50) / 2; // centre the row on X
		for (let i = 0; i < count; i++) {
			const center = new Vector3(startX + i * 50, 0, 45);
			nodes.push(buildHouse(center, i + 1, town));
		}

		// Park leisure node (geometry expands in M3; the anchor exists now).
		const parkPos = new Vector3(110, 0, 45);
		nodes.push({ name: "ParkNode", kind: NodeKind.Park, position: parkPos.add(new Vector3(0, 3, 0)) });

		// Drop a visible marker at every node.
		for (const node of nodes) createNodeMarker(node, nodesFolder);

		return { model: town, nodes };
	}

	// ── pieces ────────────────────────────────────────────────────────────────

	/**
	 * Real Roblox Terrain (not a Part) so we get proper 3D grass blades.
	 * A flat grass slab whose top surface sits at y = 0, so buildings still sit on top.
	 */
	function buildGround(): void {
		const terrain = Workspace.Terrain;
		const size = CONFIG.town.BASEPLATE_SIZE;
		const depth = 16;
		terrain.FillBlock(
			new CFrame(0, -depth / 2, 0), // centre below ground -> top at y = 0
			new Vector3(size, depth, size),
			Enum.Material.Grass,
		);
		// 3D grass blades render by default on Grass-material terrain (client graphics
		// quality permitting) — no extra flag needed in this API version.
	}

	const ROAD_WIDTH = 24;
	const ROAD_Y = 0.1;
	/** Inner edge of the sidewalks (= edge of the main road). */
	const SIDEWALK_Z = ROAD_WIDTH / 2 + 4; // 16

	function buildRoads(parent: Instance): void {
		const roads = new Instance("Folder");
		roads.Name = "Roads";
		roads.Parent = parent;

		const roadLen = 280;

		// Main east–west road along X at z = 0, with sidewalks flanking it.
		pavement(new Vector3(0, ROAD_Y, 0), new Vector2(roadLen, ROAD_WIDTH), COLOR.road, "MainRoad", roads);
		for (const dz of [-1, 1]) {
			pavement(
				new Vector3(0, ROAD_Y, dz * SIDEWALK_Z),
				new Vector2(roadLen, 8),
				COLOR.sidewalk,
				"Sidewalk",
				roads,
			);
		}

		// North–south connector road at x = 0, linking the house row and the store.
		pavement(new Vector3(0, ROAD_Y, 0), new Vector2(ROAD_WIDTH, 130), COLOR.road, "ConnectorRoad", roads);
	}

	/** General Store — the first big rob target. Door faces +Z (the road). */
	function buildStore(center: Vector3, parent: Instance): TownNode {
		const model = new Instance("Model");
		model.Name = "GeneralStore";
		model.Parent = parent;

		const w = 40;
		const d = 30;
		const h = 14;
		const t = 1;

		// Carve grass out from under the building, and pave a walk from the door (+Z face,
		// facing the road) to the road's south edge so NPCs have a cheap connected route.
		clearGrass(center.X, center.Z, w, d);
		const doorZ = center.Z + d / 2; // -30, the road-facing face
		const roadEdge = -ROAD_WIDTH / 2; // -12, south edge of the main road
		pavement(
			new Vector3(center.X, ROAD_Y, (doorZ + roadEdge) / 2),
			new Vector2(12, roadEdge - doorZ),
			COLOR.sidewalk,
			"StoreWalk",
			model,
		);

		// floor
		createPart({
			size: new Vector3(w, 1, d),
			position: center.add(new Vector3(0, 0.5, 0)),
			color: COLOR.sidewalk,
			material: Enum.Material.Concrete,
			name: "Floor",
			parent: model,
		});
		// back wall (north, +Z)  — solid
		createPart({
			size: new Vector3(w, h, t),
			position: center.add(new Vector3(0, h / 2 + 1, -d / 2)),
			color: COLOR.storeWall,
			name: "WallBack",
			parent: model,
		});
		// side walls
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(t, h, d),
				position: center.add(new Vector3(dx * (w / 2), h / 2 + 1, 0)),
				color: COLOR.storeWall,
				name: "WallSide",
				parent: model,
			});
		}
		// front wall (toward road, +Z) with a central door gap
		const doorGap = 8;
		const sideW = (w - doorGap) / 2;
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(sideW, h, t),
				position: center.add(new Vector3(dx * (doorGap / 2 + sideW / 2), h / 2 + 1, d / 2)),
				color: COLOR.storeWall,
				name: "WallFront",
				parent: model,
			});
		}
		// roof
		createPart({
			size: new Vector3(w + 2, t, d + 2),
			position: center.add(new Vector3(0, h + 1, 0)),
			color: COLOR.storeRoof,
			name: "Roof",
			parent: model,
		});
		// sign
		createPart({
			size: new Vector3(w * 0.7, 4, 0.5),
			position: center.add(new Vector3(0, h - 1, d / 2 + 0.6)),
			color: COLOR.sign,
			material: Enum.Material.Neon,
			canCollide: false,
			name: "Sign",
			parent: model,
		});

		// Node just outside the door, on the road side.
		return {
			name: "StoreNode",
			kind: NodeKind.Store,
			position: center.add(new Vector3(0, 3, d / 2 + 6)),
		};
	}

	/** A house with an owning family. Door faces -Z (toward the road). */
	function buildHouse(center: Vector3, index: number, parent: Instance): TownNode {
		const model = new Instance("Model");
		model.Name = `House_${index}`;
		model.Parent = parent;

		const w = 22;
		const d = 22;
		const h = 12;
		const t = 1;

		// Carve grass from under the house + pave a driveway from the door (-Z face) to
		// the road's north edge, so each home connects to the road network cheaply.
		clearGrass(center.X, center.Z, w, d);
		const doorZ = center.Z - d / 2; // 34, the road-facing face
		const roadEdge = ROAD_WIDTH / 2; // 12, north edge of the main road
		pavement(
			new Vector3(center.X, ROAD_Y, (doorZ + roadEdge) / 2),
			new Vector2(8, doorZ - roadEdge),
			COLOR.sidewalk,
			"Driveway",
			model,
		);

		// floor
		createPart({
			size: new Vector3(w, 1, d),
			position: center.add(new Vector3(0, 0.5, 0)),
			color: COLOR.door,
			material: Enum.Material.WoodPlanks,
			name: "Floor",
			parent: model,
		});
		// back wall (north, +Z)
		createPart({
			size: new Vector3(w, h, t),
			position: center.add(new Vector3(0, h / 2 + 1, d / 2)),
			color: COLOR.houseWall,
			name: "WallBack",
			parent: model,
		});
		// side walls
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(t, h, d),
				position: center.add(new Vector3(dx * (w / 2), h / 2 + 1, 0)),
				color: COLOR.houseWall,
				name: "WallSide",
				parent: model,
			});
		}
		// front wall (toward road, -Z) with a door gap
		const doorGap = 6;
		const sideW = (w - doorGap) / 2;
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(sideW, h, t),
				position: center.add(new Vector3(dx * (doorGap / 2 + sideW / 2), h / 2 + 1, -d / 2)),
				color: COLOR.houseWall,
				name: "WallFront",
				parent: model,
			});
		}
		// pitched-ish roof (single slab, kept cheap)
		createPart({
			size: new Vector3(w + 2, t, d + 2),
			position: center.add(new Vector3(0, h + 1, 0)),
			color: COLOR.houseRoof,
			material: Enum.Material.Slate,
			name: "Roof",
			parent: model,
		});

		// Node just outside the door, on the road side (-Z).
		return {
			name: `HomeNode_${index}`,
			kind: NodeKind.Home,
			position: center.add(new Vector3(0, 3, -(d / 2) - 5)),
		};
	}
}
