import { Workspace } from "@rbxts/services";
import { CONFIG } from "../../shared/config";
import { NodeKind } from "../../shared/enums";
import { TownNode } from "../../shared/types";
import { createPart } from "./Parts";
import { Props } from "./Props";

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
	schoolWall: Color3.fromRGB(178, 90, 78),
	schoolRoof: Color3.fromRGB(120, 60, 52),
	trunk: Color3.fromRGB(96, 64, 40),
	leaves: Color3.fromRGB(74, 130, 64),
	door: Color3.fromRGB(92, 64, 40),
	sign: Color3.fromRGB(40, 40, 48),
	node: Color3.fromRGB(255, 230, 0),
};

/** Per-house wall+roof color pairs so the residential row isn't a row of clones. */
const HOUSE_PALETTES: ReadonlyArray<{ wall: Color3; roof: Color3 }> = [
	{ wall: Color3.fromRGB(196, 174, 137), roof: Color3.fromRGB(122, 72, 52) },
	{ wall: Color3.fromRGB(176, 186, 192), roof: Color3.fromRGB(70, 84, 96) },
	{ wall: Color3.fromRGB(158, 178, 150), roof: Color3.fromRGB(86, 70, 58) },
	{ wall: Color3.fromRGB(206, 160, 150), roof: Color3.fromRGB(108, 60, 56) },
	{ wall: Color3.fromRGB(214, 198, 150), roof: Color3.fromRGB(96, 80, 64) },
	{ wall: Color3.fromRGB(150, 162, 184), roof: Color3.fromRGB(72, 64, 88) },
];

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
	/** Lights (lamp posts, etc.) that LightingService switches on at night. */
	export const nightLights = new Array<Light>();

	export function build(): { model: Model; nodes: ReadonlyArray<TownNode>; nightLights: ReadonlyArray<Light> } {
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

		const addNodes = (built: ReadonlyArray<TownNode>) => {
			for (const n of built) nodes.push(n);
		};

		// South side, road-connected via driveways / the connector road. West→East:
		//   Bank — Store — Park(centre) — School — Cafe.
		addNodes(
			buildShell(
				new Vector3(-140, 0, -46),
				46,
				32,
				20,
				Color3.fromRGB(150, 150, 158),
				Color3.fromRGB(86, 88, 96),
				Enum.Material.Concrete,
				12,
				"Bank",
				NodeKind.Bank,
				Color3.fromRGB(40, 90, 64),
				town,
			),
		);
		addNodes(buildStore(new Vector3(-55, 0, -45), town));
		addNodes(buildSchool(new Vector3(55, 0, -45), town));
		addNodes(
			buildShell(
				new Vector3(145, 0, -44),
				36,
				26,
				14,
				Color3.fromRGB(196, 152, 110),
				Color3.fromRGB(120, 78, 66),
				Enum.Material.WoodPlanks,
				10,
				"Cafe",
				NodeKind.Cafe,
				Color3.fromRGB(150, 70, 40),
				town,
			),
		);
		addNodes(buildPark(town));

		// Houses: a row north of the road, doors facing -Z (toward the road).
		for (let i = 0; i < CONFIG.town.HOUSE_COUNT; i++) {
			addNodes(buildHouse(houseCenter(i), i + 1, town));
		}

		addRoadMarkings(town);
		decorateStreets(town);

		// Drop a visible marker at every node.
		for (const node of nodes) createNodeMarker(node, nodesFolder);

		return { model: town, nodes, nightLights };
	}

	/** Build a building's interior node (NPC destination / loot) + entrance node (at the door,
	 *  on the road side) for the M4 perception/crime layer. */
	function buildingNodes(
		interiorName: string,
		entranceName: string,
		kind: NodeKind,
		center: Vector3,
		d: number,
	): Array<TownNode> {
		const facing = center.Z >= 0 ? -1 : 1; // door faces toward the road (z = 0)
		return [
			{ name: interiorName, kind, position: center.add(new Vector3(0, 3, 0)), spot: "interior" },
			{
				name: entranceName,
				kind,
				position: center.add(new Vector3(0, 3, facing * (d / 2 + 6))),
				spot: "entrance",
			},
		];
	}

	/** Center of house `i` (0-based) in the north residential row — the one source of truth
	 *  for house positions, shared by build() and decorateStreets so they never desync. */
	function houseCenter(i: number): Vector3 {
		const { HOUSE_COUNT, HOUSE_SPACING, HOUSE_ROW_Z } = CONFIG.town;
		const startX = -((HOUSE_COUNT - 1) * HOUSE_SPACING) / 2;
		return new Vector3(startX + i * HOUSE_SPACING, 0, HOUSE_ROW_Z);
	}

	/** Generic rectangular building shell (used for landmark buildings without AI nodes). */
	function buildShell(
		center: Vector3,
		w: number,
		d: number,
		h: number,
		wallColor: Color3,
		roofColor: Color3,
		wallMaterial: Enum.Material,
		doorGap: number,
		name: string,
		nodeKind: NodeKind,
		signColor: Color3 | undefined,
		parent: Instance,
	): Array<TownNode> {
		const model = new Instance("Model");
		model.Name = name;
		model.Parent = parent;

		clearGrass(center.X, center.Z, w, d);
		const doorZ = center.Z + d / 2; // south-row buildings: door faces +Z (the road)
		const roadEdge = -ROAD_WIDTH / 2;
		pavement(
			new Vector3(center.X, ROAD_Y, (doorZ + roadEdge) / 2),
			new Vector2(12, roadEdge - doorZ),
			COLOR.sidewalk,
			`${name}Walk`,
			model,
		);

		createPart({
			size: new Vector3(w, 0.4, d),
			position: center.add(new Vector3(0, 0.2, 0)),
			color: COLOR.sidewalk,
			material: Enum.Material.Concrete,
			name: "Floor",
			parent: model,
		});
		createPart({
			size: new Vector3(w, h, 1),
			position: center.add(new Vector3(0, h / 2 + 0.4, -d / 2)),
			color: wallColor,
			material: wallMaterial,
			name: "WallBack",
			parent: model,
		});
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(1, h, d),
				position: center.add(new Vector3(dx * (w / 2), h / 2 + 0.4, 0)),
				color: wallColor,
				material: wallMaterial,
				name: "WallSide",
				parent: model,
			});
		}
		const sideW = (w - doorGap) / 2;
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(sideW, h, 1),
				position: center.add(new Vector3(dx * (doorGap / 2 + sideW / 2), h / 2 + 0.4, d / 2)),
				color: wallColor,
				material: wallMaterial,
				name: "WallFront",
				parent: model,
			});
		}
		createPart({
			size: new Vector3(w + 2, 1, d + 2),
			position: center.add(new Vector3(0, h + 0.4, 0)),
			color: roofColor,
			name: "Roof",
			parent: model,
		});
		if (signColor !== undefined) {
			createPart({
				size: new Vector3(w * 0.6, 4, 0.5),
				position: center.add(new Vector3(0, h - 1, d / 2 + 0.6)),
				color: signColor,
				material: Enum.Material.Neon,
				canCollide: false,
				name: "Sign",
				parent: model,
			});
		}
		addBuildingDetail(model, center, w, h, d, doorGap, {
			windows: true,
			awning: signColor !== undefined,
			chimney: false,
		});

		return buildingNodes(`${name}Node`, `${name}Entrance`, nodeKind, center, d);
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

		const roadLen = 460;

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

	/**
	 * A pitched gable roof (ridge running along X) built from two mirrored WedgeParts,
	 * with a slight eave overhang. `baseY` is the top of the walls.
	 */
	function gableRoof(center: Vector3, w: number, d: number, baseY: number, height: number, color: Color3, parent: Instance): void {
		const ww = w + 2;
		const halfD = (d + 2) / 2;
		for (const side of [1, -1]) {
			const wedge = new Instance("WedgePart");
			wedge.Anchored = true;
			wedge.Size = new Vector3(ww, height, halfD);
			wedge.Color = color;
			wedge.Material = Enum.Material.Slate;
			wedge.CanCollide = true;
			wedge.TopSurface = Enum.SurfaceType.Smooth;
			wedge.BottomSurface = Enum.SurfaceType.Smooth;
			const base = new CFrame(center.X, baseY + height / 2, center.Z + side * (halfD / 2));
			// side=+1: default wedge (tall face at -Z = ridge) slopes to +Z eave.
			// side=-1: rotate 180° about Y so the tall face points +Z (ridge), sloping to -Z.
			wedge.CFrame = side === 1 ? base : base.mul(CFrame.Angles(0, math.pi, 0));
			wedge.Parent = parent;
		}
	}

	/**
	 * Facade detail shared by all buildings: door trim, framed windows on the side + back
	 * walls, optional entrance awning, optional chimney. The front (door) wall is left clear.
	 */
	function addBuildingDetail(
		model: Instance,
		center: Vector3,
		w: number,
		h: number,
		d: number,
		doorGap: number,
		opts: { windows: boolean; awning: boolean; chimney: boolean },
	): void {
		const FLOOR_TOP = 0.4;
		const facing = center.Z >= 0 ? -1 : 1; // door faces toward the road (z = 0)
		const trim = Color3.fromRGB(60, 52, 44);

		// Eave/cornice line: a thin wider band capping the walls (decorative, above head).
		createPart({
			size: new Vector3(w + 1.2, 0.8, d + 1.2),
			position: center.add(new Vector3(0, FLOOR_TOP + h + 0.1, 0)),
			color: trim,
			canCollide: false,
			name: "Cornice",
			parent: model,
		});

		// Door header + jambs framing the entrance.
		createPart({
			size: new Vector3(doorGap + 2, 1, 1.4),
			position: center.add(new Vector3(0, FLOOR_TOP + h - 0.5, facing * (d / 2))),
			color: trim,
			canCollide: false,
			name: "DoorHeader",
			parent: model,
		});
		for (const s of [-1, 1]) {
			createPart({
				size: new Vector3(0.7, h - 1, 1.4),
				position: center.add(new Vector3(s * (doorGap / 2), FLOOR_TOP + (h - 1) / 2, facing * (d / 2))),
				color: trim,
				canCollide: false,
				name: "DoorJamb",
				parent: model,
			});
		}

		// A flat stoop step just outside the door (flush, walkable).
		createPart({
			size: new Vector3(doorGap + 2, 0.4, 3),
			position: center.add(new Vector3(0, 0.2, facing * (d / 2 + 1.5))),
			color: Color3.fromRGB(150, 146, 140),
			material: Enum.Material.Concrete,
			name: "Stoop",
			parent: model,
		});

		if (opts.windows) {
			const wy = FLOOR_TOP + h * 0.55;
			const paneH = math.min(4, h * 0.4);
			for (const sx of [-1, 1]) {
				const count = math.max(1, math.floor(d / 12));
				for (let i = 0; i < count; i++) {
					const zz = -d / 2 + (d / (count + 1)) * (i + 1);
					Props.window(center.add(new Vector3(sx * (w / 2), wy, zz)), "x", math.min(4, d / (count + 2)), paneH, model);
				}
			}
			const backZ = -facing * (d / 2);
			const countB = math.max(1, math.floor(w / 12));
			for (let i = 0; i < countB; i++) {
				const xx = -w / 2 + (w / (countB + 1)) * (i + 1);
				Props.window(center.add(new Vector3(xx, wy, backZ)), "z", math.min(4, w / (countB + 2)), paneH, model);
			}
		}

		if (opts.awning) {
			Props.awning(center.add(new Vector3(0, FLOOR_TOP + h * 0.5, facing * (d / 2 + 2.5))), facing, doorGap + 8, model);
		}
		if (opts.chimney) {
			Props.chimney(center.add(new Vector3(w * 0.28, FLOOR_TOP + h, -d * 0.2)), model);
		}
	}

	/** General Store — the first big rob target. Door faces +Z (the road). */
	function buildStore(center: Vector3, parent: Instance): Array<TownNode> {
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
			size: new Vector3(w, 0.4, d),
			position: center.add(new Vector3(0, 0.2, 0)),
			color: COLOR.sidewalk,
			material: Enum.Material.Concrete,
			name: "Floor",
			parent: model,
		});
		// back wall (north, +Z)  — solid
		createPart({
			size: new Vector3(w, h, t),
			position: center.add(new Vector3(0, h / 2 + 0.4, -d / 2)),
			color: COLOR.storeWall,
			name: "WallBack",
			parent: model,
		});
		// side walls
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(t, h, d),
				position: center.add(new Vector3(dx * (w / 2), h / 2 + 0.4, 0)),
				color: COLOR.storeWall,
				name: "WallSide",
				parent: model,
			});
		}
		// front wall (toward road, +Z) with a central door gap
		const doorGap = 12;
		const sideW = (w - doorGap) / 2;
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(sideW, h, t),
				position: center.add(new Vector3(dx * (doorGap / 2 + sideW / 2), h / 2 + 0.4, d / 2)),
				color: COLOR.storeWall,
				name: "WallFront",
				parent: model,
			});
		}
		// roof
		createPart({
			size: new Vector3(w + 2, t, d + 2),
			position: center.add(new Vector3(0, h + 0.4, 0)),
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

		addBuildingDetail(model, center, w, h, d, doorGap, { windows: true, awning: true, chimney: false });

		return buildingNodes("StoreNode", "StoreEntrance", NodeKind.Store, center, d);
	}

	/** A house with an owning family. Door faces -Z (toward the road). */
	function buildHouse(center: Vector3, index: number, parent: Instance): Array<TownNode> {
		const model = new Instance("Model");
		model.Name = `House_${index}`;
		model.Parent = parent;

		const w = 22;
		const d = 22;
		const h = 12;
		const t = 1;
		const palette = HOUSE_PALETTES[(index - 1) % HOUSE_PALETTES.size()];
		const wallColor = palette.wall;
		const roofColor = palette.roof;

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
			size: new Vector3(w, 0.4, d),
			position: center.add(new Vector3(0, 0.2, 0)),
			color: COLOR.door,
			material: Enum.Material.WoodPlanks,
			name: "Floor",
			parent: model,
		});
		// back wall (north, +Z)
		createPart({
			size: new Vector3(w, h, t),
			position: center.add(new Vector3(0, h / 2 + 0.4, d / 2)),
			color: wallColor,
			name: "WallBack",
			parent: model,
		});
		// side walls
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(t, h, d),
				position: center.add(new Vector3(dx * (w / 2), h / 2 + 0.4, 0)),
				color: wallColor,
				name: "WallSide",
				parent: model,
			});
		}
		// front wall (toward road, -Z) with a door gap
		const doorGap = 8;
		const sideW = (w - doorGap) / 2;
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(sideW, h, t),
				position: center.add(new Vector3(dx * (doorGap / 2 + sideW / 2), h / 2 + 0.4, -d / 2)),
				color: wallColor,
				name: "WallFront",
				parent: model,
			});
		}
		// Pitched gable roof (two wedges) for a real house silhouette.
		gableRoof(center, w, d, 0.4 + h, 8, roofColor, model);

		addBuildingDetail(model, center, w, h, d, doorGap, { windows: true, awning: false, chimney: true });

		return buildingNodes(`HomeNode_${index}`, `HomeEntrance_${index}`, NodeKind.Home, center, d);
	}

	/** The School — work node for the Teacher and all Students. Door faces +Z (the road). */
	function buildSchool(center: Vector3, parent: Instance): Array<TownNode> {
		const model = new Instance("Model");
		model.Name = "School";
		model.Parent = parent;

		const w = 50;
		const d = 34;
		const h = 16;
		const t = 1;

		clearGrass(center.X, center.Z, w, d);
		const doorZ = center.Z + d / 2;
		const roadEdge = -ROAD_WIDTH / 2;
		pavement(
			new Vector3(center.X, ROAD_Y, (doorZ + roadEdge) / 2),
			new Vector2(14, roadEdge - doorZ),
			COLOR.sidewalk,
			"SchoolWalk",
			model,
		);

		createPart({
			size: new Vector3(w, 0.4, d),
			position: center.add(new Vector3(0, 0.2, 0)),
			color: COLOR.sidewalk,
			material: Enum.Material.Concrete,
			name: "Floor",
			parent: model,
		});
		createPart({
			size: new Vector3(w, h, t),
			position: center.add(new Vector3(0, h / 2 + 0.4, -d / 2)),
			color: COLOR.schoolWall,
			material: Enum.Material.Brick,
			name: "WallBack",
			parent: model,
		});
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(t, h, d),
				position: center.add(new Vector3(dx * (w / 2), h / 2 + 0.4, 0)),
				color: COLOR.schoolWall,
				material: Enum.Material.Brick,
				name: "WallSide",
				parent: model,
			});
		}
		const doorGap = 14;
		const sideW = (w - doorGap) / 2;
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(sideW, h, t),
				position: center.add(new Vector3(dx * (doorGap / 2 + sideW / 2), h / 2 + 0.4, d / 2)),
				color: COLOR.schoolWall,
				material: Enum.Material.Brick,
				name: "WallFront",
				parent: model,
			});
		}
		createPart({
			size: new Vector3(w + 2, t, d + 2),
			position: center.add(new Vector3(0, h + 0.4, 0)),
			color: COLOR.schoolRoof,
			name: "Roof",
			parent: model,
		});
		createPart({
			size: new Vector3(w * 0.6, 4, 0.5),
			position: center.add(new Vector3(0, h - 1, d / 2 + 0.6)),
			color: COLOR.sign,
			material: Enum.Material.Neon,
			canCollide: false,
			name: "Sign",
			parent: model,
		});

		addBuildingDetail(model, center, w, h, d, doorGap, { windows: true, awning: true, chimney: false });

		return buildingNodes("SchoolNode", "SchoolEntrance", NodeKind.School, center, d);
	}

	/** A leafy tree: square trunk + spherical foliage. Trunk is a small pathfinding obstacle. */
	function tree(pos: Vector3, parent: Instance): void {
		createPart({
			size: new Vector3(2, 8, 2),
			position: pos.add(new Vector3(0, 4, 0)),
			color: COLOR.trunk,
			material: Enum.Material.Wood,
			name: "Trunk",
			parent,
		});
		const leaves = createPart({
			size: new Vector3(10, 10, 10),
			position: pos.add(new Vector3(0, 11, 0)),
			color: COLOR.leaves,
			material: Enum.Material.Grass,
			canCollide: false,
			name: "Leaves",
			parent,
		});
		leaves.Shape = Enum.PartType.Ball;
	}

	/** A park bench (just a seat slab — cosmetic, walkable-around). */
	function bench(pos: Vector3, parent: Instance): void {
		createPart({
			size: new Vector3(6, 1, 2),
			position: pos.add(new Vector3(0, 2, 0)),
			color: COLOR.trunk,
			material: Enum.Material.WoodPlanks,
			name: "Bench",
			parent,
		});
	}

	/**
	 * The Park / town square — the communal leisure + lunch node. Sits at the south end of
	 * the connector road (so it's road-connected and close to everything), with trees and
	 * benches flanking the path. Lawn is left as grass terrain.
	 */
	function buildPark(parent: Instance): Array<TownNode> {
		const model = new Instance("Model");
		model.Name = "Park";
		model.Parent = parent;

		const cz = -52;
		for (const dx of [-26, 26]) {
			tree(new Vector3(dx, 0, cz + 8), model);
			tree(new Vector3(dx, 0, cz - 8), model);
		}
		bench(new Vector3(-16, 0, -42), model);
		bench(new Vector3(16, 0, -42), model);

		// A fountain centerpiece, a little playground, beds and hedges.
		Props.fountain(new Vector3(0, 0, -52), model);
		Props.slide(new Vector3(-30, 0, -62), model);
		Props.swingSet(new Vector3(28, 0, -60), model);
		Props.flowerBed(new Vector3(-14, 0, -60), 8, 3, model);
		Props.flowerBed(new Vector3(14, 0, -60), 8, 3, model);
		Props.hedge(new Vector3(0, 0, -70), 60, true, model); // back hedge along the south edge
		for (const rx of [-34, 34]) Props.rock(new Vector3(rx, 0, -46), 2.5, model);

		// Node on the connector road, at the park entrance.
		return [{ name: "ParkNode", kind: NodeKind.Park, position: new Vector3(0, 3, -40), spot: "interior" }];
	}

	/** Road centre-line dashes + a zebra crosswalk at the central intersection. */
	function addRoadMarkings(parent: Instance): void {
		const folder = new Instance("Folder");
		folder.Name = "RoadMarkings";
		folder.Parent = parent;
		const y = 0.25; // just above the asphalt (road top = 0.2)
		const dash = Color3.fromRGB(228, 212, 120);
		const white = Color3.fromRGB(235, 235, 235);

		// Centre dashes along the main road (skip the intersection zone).
		for (let x = -132; x <= 132; x += 12) {
			if (math.abs(x) < 16) continue;
			createPart({
				size: new Vector3(5, 0.08, 0.7),
				position: new Vector3(x, y, 0),
				color: dash,
				canCollide: false,
				name: "Dash",
				parent: folder,
			});
		}
		// Centre dashes along the connector road.
		for (let z = -60; z <= 60; z += 12) {
			if (math.abs(z) < 16) continue;
			createPart({
				size: new Vector3(0.7, 0.08, 5),
				position: new Vector3(0, y, z),
				color: dash,
				canCollide: false,
				name: "Dash",
				parent: folder,
			});
		}
		// Zebra crosswalk across the main road at the intersection (x = 0).
		for (let z = -10; z <= 10; z += 2.6) {
			createPart({
				size: new Vector3(9, 0.08, 1.2),
				position: new Vector3(0, y, z),
				color: white,
				canCollide: false,
				name: "Crosswalk",
				parent: folder,
			});
		}
	}

	/** Street furniture: lamp posts (night-lights), mailboxes, bins, hydrants, signs, etc. */
	function decorateStreets(parent: Instance): void {
		const folder = new Instance("Folder");
		folder.Name = "StreetDetail";
		folder.Parent = parent;

		// House X positions derived from the single source of truth (no desync at any count).
		const houseXs: Array<number> = [];
		for (let i = 0; i < CONFIG.town.HOUSE_COUNT; i++) houseXs.push(houseCenter(i).X);
		const span = math.ceil((CONFIG.town.HOUSE_COUNT - 1) * CONFIG.town.HOUSE_SPACING * 0.5) + 30;

		// Lamp posts down both sides of the main road (registered as night-lights).
		for (let x = -span; x <= span; x += 40) {
			for (const z of [-20.5, 20.5]) {
				nightLights.push(Props.lampPost(new Vector3(x, 0, z), folder));
			}
		}

		// One mailbox + a bush + a flower bed at each house.
		for (const hx of houseXs) {
			Props.mailbox(new Vector3(hx - 6, 0, 21), folder);
			Props.bush(new Vector3(hx + 9, 0, 36), folder);
			Props.flowerBed(new Vector3(hx, 0, 33), 12, 2.5, folder);
		}

		// Bins + hydrants along the sidewalks.
		Props.trashCan(new Vector3(-40, 0, 20.5), folder);
		Props.trashCan(new Vector3(40, 0, 20.5), folder);
		Props.trashCan(new Vector3(-20, 0, -20.5), folder);
		Props.trashCan(new Vector3(20, 0, -20.5), folder);
		Props.hydrant(new Vector3(-110, 0, 20.5), folder);
		Props.hydrant(new Vector3(108, 0, -20.5), folder);

		// Stop signs at the intersection, bus stop, and some cones by the school.
		Props.stopSign(new Vector3(16, 0, 16), folder, 0);
		Props.stopSign(new Vector3(-16, 0, -16), folder, 180);
		Props.busStop(new Vector3(-108, 0, 21), folder);
		Props.cone(new Vector3(40, 0, -28), folder);
		Props.cone(new Vector3(44, 0, -28), folder);
		Props.cone(new Vector3(48, 0, -28), folder);

		// Bushes + flower beds fronting the store and school.
		Props.flowerBed(new Vector3(-55, 0, -31), 16, 2.5, folder);
		Props.flowerBed(new Vector3(55, 0, -30), 18, 2.5, folder);
		for (const bx of [-72, -38]) Props.bush(new Vector3(bx, 0, -31), folder);
		for (const bx of [38, 72]) Props.bush(new Vector3(bx, 0, -30), folder);

		// Parked cars at the curb (on the road edge, z = ±9, NOT on the sidewalk).
		const carColors = [
			Color3.fromRGB(180, 60, 55),
			Color3.fromRGB(50, 80, 150),
			Color3.fromRGB(60, 60, 66),
			Color3.fromRGB(210, 200, 190),
		];
		Props.car(new Vector3(-170, 0, 9), carColors[0], folder);
		Props.car(new Vector3(-95, 0, -9), carColors[1], folder);
		Props.car(new Vector3(-15, 0, 9), carColors[2], folder);
		Props.car(new Vector3(75, 0, -9), carColors[3], folder);
		Props.car(new Vector3(150, 0, 9), carColors[1], folder);
		Props.car(new Vector3(190, 0, -9), carColors[0], folder);

		// Power poles + wires running along the far north verge, spanning the town width.
		const poleZ = 26;
		const poleXs: Array<number> = [];
		for (let x = -span; x <= span; x += 65) poleXs.push(x);
		for (const px of poleXs) Props.powerPole(new Vector3(px, 0, poleZ), folder);
		for (let i = 0; i < poleXs.size() - 1; i++) {
			Props.wire(new Vector3(poleXs[i], 23, poleZ), new Vector3(poleXs[i + 1], 23, poleZ), folder);
		}

		// Low picket fences framing each front yard (gap left for the driveway).
		for (const hx of houseXs) {
			Props.fenceRun(new Vector3(hx - 12, 0, 24), new Vector3(hx - 5, 0, 24), folder);
			Props.fenceRun(new Vector3(hx + 5, 0, 24), new Vector3(hx + 12, 0, 24), folder);
			Props.fenceRun(new Vector3(hx - 12, 0, 24), new Vector3(hx - 12, 0, 34), folder);
			Props.fenceRun(new Vector3(hx + 12, 0, 24), new Vector3(hx + 12, 0, 34), folder);
		}
	}
}
