import { createPart } from "./Parts";

/**
 * Reusable street-furniture / set-dressing props (BUILD_PLAN Stage 2). Each builder places
 * a small cluster of parts at a position. Lamp posts return their PointLight so the caller
 * can register it as a night-light (switched on after dark by LightingService).
 */
export namespace Props {
	const C = {
		metalDark: Color3.fromRGB(48, 50, 55),
		lampGlass: Color3.fromRGB(255, 240, 200),
		binGreen: Color3.fromRGB(46, 84, 60),
		binLid: Color3.fromRGB(36, 64, 46),
		hydrantRed: Color3.fromRGB(170, 40, 36),
		mailBlue: Color3.fromRGB(40, 70, 150),
		signRed: Color3.fromRGB(180, 36, 36),
		signWhite: Color3.fromRGB(235, 235, 235),
		coneOrange: Color3.fromRGB(225, 110, 40),
		bush: Color3.fromRGB(70, 120, 60),
		soil: Color3.fromRGB(78, 56, 40),
		shelter: Color3.fromRGB(120, 130, 140),
	};
	const flowerColors = [
		Color3.fromRGB(220, 80, 90),
		Color3.fromRGB(235, 200, 70),
		Color3.fromRGB(150, 90, 200),
		Color3.fromRGB(235, 130, 60),
	];

	/** A street lamp: pole + arm + glowing head with a PointLight (off until night). */
	export function lampPost(pos: Vector3, parent: Instance): PointLight {
		createPart({
			size: new Vector3(0.6, 16, 0.6),
			position: pos.add(new Vector3(0, 8, 0)),
			color: C.metalDark,
			material: Enum.Material.Metal,
			name: "LampPole",
			parent,
		});
		const head = createPart({
			size: new Vector3(2.4, 1, 2.4),
			position: pos.add(new Vector3(0, 16, 0)),
			color: C.lampGlass,
			material: Enum.Material.Neon,
			canCollide: false,
			name: "LampHead",
			parent,
		});
		const light = new Instance("PointLight");
		light.Color = Color3.fromRGB(255, 224, 170);
		light.Range = 22;
		light.Brightness = 2.4;
		light.Enabled = false; // LightingService switches it on at night
		light.Parent = head;
		return light;
	}

	export function trashCan(pos: Vector3, parent: Instance): void {
		const body = createPart({
			size: new Vector3(3, 4, 3),
			position: pos.add(new Vector3(0, 2, 0)),
			color: C.binGreen,
			material: Enum.Material.Metal,
			name: "TrashCan",
			parent,
		});
		body.Shape = Enum.PartType.Cylinder;
		body.CFrame = new CFrame(pos.add(new Vector3(0, 2, 0))).mul(CFrame.Angles(0, 0, math.rad(90)));
		createPart({
			size: new Vector3(3.4, 0.6, 3.4),
			position: pos.add(new Vector3(0, 4.2, 0)),
			color: C.binLid,
			material: Enum.Material.Metal,
			canCollide: false,
			name: "TrashLid",
			parent,
		});
	}

	export function hydrant(pos: Vector3, parent: Instance): void {
		createPart({
			size: new Vector3(1.6, 3, 1.6),
			position: pos.add(new Vector3(0, 1.5, 0)),
			color: C.hydrantRed,
			material: Enum.Material.Metal,
			name: "Hydrant",
			parent,
		});
		createPart({
			size: new Vector3(1, 0.8, 1),
			position: pos.add(new Vector3(0, 3.2, 0)),
			color: C.hydrantRed,
			material: Enum.Material.Metal,
			canCollide: false,
			name: "HydrantCap",
			parent,
		});
		for (const dx of [-1, 1]) {
			createPart({
				size: new Vector3(0.8, 0.8, 0.8),
				position: pos.add(new Vector3(dx * 1, 1.6, 0)),
				color: C.hydrantRed,
				material: Enum.Material.Metal,
				canCollide: false,
				name: "HydrantNozzle",
				parent,
			});
		}
	}

	export function mailbox(pos: Vector3, parent: Instance): void {
		createPart({
			size: new Vector3(0.6, 4, 0.6),
			position: pos.add(new Vector3(0, 2, 0)),
			color: C.metalDark,
			material: Enum.Material.Metal,
			name: "MailPost",
			parent,
		});
		createPart({
			size: new Vector3(1.6, 1.6, 3),
			position: pos.add(new Vector3(0, 4.2, 0)),
			color: C.mailBlue,
			material: Enum.Material.Metal,
			canCollide: false,
			name: "Mailbox",
			parent,
		});
	}

	/** A stop sign (octagonal-ish red plate on a post). `faceY` rotates it to face traffic. */
	export function stopSign(pos: Vector3, parent: Instance, faceY = 0): void {
		createPart({
			size: new Vector3(0.5, 10, 0.5),
			position: pos.add(new Vector3(0, 5, 0)),
			color: C.metalDark,
			material: Enum.Material.Metal,
			name: "SignPost",
			parent,
		});
		const plate = createPart({
			size: new Vector3(4, 4, 0.3),
			position: pos.add(new Vector3(0, 9, 0)),
			color: C.signRed,
			material: Enum.Material.SmoothPlastic,
			canCollide: false,
			name: "StopSign",
			parent,
		});
		plate.CFrame = new CFrame(pos.add(new Vector3(0, 9, 0))).mul(CFrame.Angles(0, math.rad(faceY), math.rad(45)));
	}

	export function cone(pos: Vector3, parent: Instance): void {
		const body = createPart({
			size: new Vector3(2, 3, 2),
			position: pos.add(new Vector3(0, 1.5, 0)),
			color: C.coneOrange,
			material: Enum.Material.SmoothPlastic,
			canCollide: false,
			name: "Cone",
			parent,
		});
		body.Shape = Enum.PartType.Cylinder;
		body.CFrame = new CFrame(pos.add(new Vector3(0, 1.5, 0))).mul(CFrame.Angles(0, 0, math.rad(90)));
		createPart({
			size: new Vector3(2.6, 0.3, 2.6),
			position: pos.add(new Vector3(0, 0.2, 0)),
			color: C.coneOrange,
			canCollide: false,
			name: "ConeBase",
			parent,
		});
	}

	/** A leafy bush blob (decorative, non-colliding). */
	export function bush(pos: Vector3, parent: Instance): void {
		const b = createPart({
			size: new Vector3(4.5, 3.5, 4.5),
			position: pos.add(new Vector3(0, 1.6, 0)),
			color: C.bush,
			material: Enum.Material.Grass,
			canCollide: false,
			name: "Bush",
			parent,
		});
		b.Shape = Enum.PartType.Ball;
	}

	/** A rectangular flower bed: soil slab + scattered colourful blooms. */
	export function flowerBed(pos: Vector3, sizeX: number, sizeZ: number, parent: Instance): void {
		createPart({
			size: new Vector3(sizeX, 1, sizeZ),
			position: pos.add(new Vector3(0, 0.5, 0)),
			color: C.soil,
			material: Enum.Material.Ground,
			name: "FlowerBed",
			parent,
		});
		const count = math.floor((sizeX * sizeZ) / 6);
		for (let i = 0; i < count; i++) {
			const fx = (math.random() - 0.5) * (sizeX - 1);
			const fz = (math.random() - 0.5) * (sizeZ - 1);
			const bloom = createPart({
				size: new Vector3(0.8, 1.4, 0.8),
				position: pos.add(new Vector3(fx, 1.4, fz)),
				color: flowerColors[i % flowerColors.size()],
				material: Enum.Material.Neon,
				canCollide: false,
				name: "Flower",
				parent,
			});
			bloom.Shape = Enum.PartType.Ball;
		}
	}

	/** A small bus-stop shelter: two posts + roof + a bench. */
	export function busStop(pos: Vector3, parent: Instance): void {
		for (const dx of [-3, 3]) {
			createPart({
				size: new Vector3(0.5, 8, 0.5),
				position: pos.add(new Vector3(dx, 4, -1.5)),
				color: C.shelter,
				material: Enum.Material.Metal,
				name: "ShelterPost",
				parent,
			});
		}
		createPart({
			size: new Vector3(8, 0.4, 4),
			position: pos.add(new Vector3(0, 8, -0.5)),
			color: C.shelter,
			material: Enum.Material.Metal,
			name: "ShelterRoof",
			parent,
		});
		createPart({
			size: new Vector3(7, 0.6, 1.4),
			position: pos.add(new Vector3(0, 2, -2)),
			color: Color3.fromRGB(90, 96, 104),
			material: Enum.Material.Metal,
			name: "ShelterBench",
			parent,
		});
	}

	// ── Stage 3/4: facade + nature + vehicles ──────────────────────────────────

	/** A detailed window: frame + glass + muntin cross + sill + shutters. `normalAxis` is
	 *  the wall's facing axis. All cosmetic (non-colliding). */
	export function window(center: Vector3, normalAxis: "x" | "z", paneW: number, paneH: number, parent: Instance): void {
		const onX = normalAxis === "x";
		const frameColor = Color3.fromRGB(72, 60, 50);
		const frameSize = onX ? new Vector3(0.5, paneH + 1, paneW + 1) : new Vector3(paneW + 1, paneH + 1, 0.5);
		const glassSize = onX ? new Vector3(0.7, paneH, paneW) : new Vector3(paneW, paneH, 0.7);
		createPart({ size: frameSize, position: center, color: frameColor, material: Enum.Material.Wood, canCollide: false, name: "WindowFrame", parent });
		createPart({
			size: glassSize,
			position: center,
			color: Color3.fromRGB(150, 190, 220),
			material: Enum.Material.Glass,
			transparency: 0.45,
			reflectance: 0.15,
			canCollide: false,
			name: "WindowGlass",
			parent,
		});
		// Muntin cross (vertical + horizontal bar).
		const vBar = onX ? new Vector3(0.8, paneH, 0.2) : new Vector3(0.2, paneH, 0.8);
		const hBar = onX ? new Vector3(0.8, 0.2, paneW) : new Vector3(paneW, 0.2, 0.8);
		createPart({ size: vBar, position: center, color: frameColor, material: Enum.Material.Wood, canCollide: false, name: "Muntin", parent });
		createPart({ size: hBar, position: center, color: frameColor, material: Enum.Material.Wood, canCollide: false, name: "Muntin", parent });
		// Sill ledge under the glass.
		const sillSize = onX ? new Vector3(1, 0.4, paneW + 1.4) : new Vector3(paneW + 1.4, 0.4, 1);
		createPart({
			size: sillSize,
			position: center.add(new Vector3(0, -paneH / 2 - 0.4, 0)),
			color: Color3.fromRGB(120, 112, 100),
			material: Enum.Material.Concrete,
			canCollide: false,
			name: "WindowSill",
			parent,
		});
		// Shutters flanking the glass.
		const shutterColor = Color3.fromRGB(66, 92, 80);
		const shutterSize = onX ? new Vector3(0.35, paneH, paneW * 0.42) : new Vector3(paneW * 0.42, paneH, 0.35);
		for (const s of [-1, 1]) {
			const off = onX ? new Vector3(0.1, 0, s * (paneW / 2 + paneW * 0.24)) : new Vector3(s * (paneW / 2 + paneW * 0.24), 0, 0.1);
			createPart({ size: shutterSize, position: center.add(off), color: shutterColor, material: Enum.Material.WoodPlanks, canCollide: false, name: "Shutter", parent });
		}
	}

	/** A sloped fabric awning over an entrance, tilting down toward the road (±Z). */
	export function awning(center: Vector3, facing: number, width: number, parent: Instance): void {
		const p = createPart({
			size: new Vector3(width, 0.4, 5),
			position: center,
			color: Color3.fromRGB(170, 60, 60),
			material: Enum.Material.Fabric,
			canCollide: false,
			name: "Awning",
			parent,
		});
		p.CFrame = new CFrame(center).mul(CFrame.Angles(math.rad(facing * 22), 0, 0));
	}

	/** A brick chimney on a roof (tall enough to poke through a gable). */
	export function chimney(pos: Vector3, parent: Instance): void {
		createPart({
			size: new Vector3(2.5, 9, 2.5),
			position: pos.add(new Vector3(0, 4.5, 0)),
			color: Color3.fromRGB(120, 70, 60),
			material: Enum.Material.Brick,
			name: "Chimney",
			parent,
		});
		createPart({
			size: new Vector3(3, 0.6, 3),
			position: pos.add(new Vector3(0, 9.2, 0)),
			color: Color3.fromRGB(60, 60, 64),
			canCollide: false,
			name: "ChimneyCap",
			parent,
		});
	}

	/** An axis-aligned picket-fence run between two points (decorative, non-colliding). */
	export function fenceRun(from: Vector3, to: Vector3, parent: Instance): void {
		const alongX = math.abs(to.X - from.X) >= math.abs(to.Z - from.Z);
		const length = alongX ? math.abs(to.X - from.X) : math.abs(to.Z - from.Z);
		if (length < 1) return;
		const mid = from.add(to).div(2);
		const railColor = Color3.fromRGB(228, 226, 216);
		createPart({
			size: alongX ? new Vector3(length, 0.4, 0.3) : new Vector3(0.3, 0.4, length),
			position: mid.add(new Vector3(0, 2.4, 0)),
			color: railColor,
			material: Enum.Material.Wood,
			canCollide: false,
			name: "FenceRail",
			parent,
		});
		const pickets = math.max(1, math.floor(length / 2));
		for (let i = 0; i <= pickets; i++) {
			const f = i / pickets;
			const px = alongX ? from.X + (to.X - from.X) * f : from.X;
			const pz = alongX ? from.Z : from.Z + (to.Z - from.Z) * f;
			createPart({
				size: new Vector3(0.4, 4, 0.4),
				position: new Vector3(px, 2, pz),
				color: railColor,
				material: Enum.Material.Wood,
				// Pickets are solid (close enough together that pathfinding treats the run as
				// a barrier with AgentRadius 2.5) so NPCs route around, not through, fences.
				canCollide: true,
				name: "Picket",
				parent,
			});
		}
	}

	/** A long, solid hedge box (a barrier NPCs path around). */
	export function hedge(center: Vector3, length: number, alongX: boolean, parent: Instance): void {
		createPart({
			size: alongX ? new Vector3(length, 3, 2) : new Vector3(2, 3, length),
			position: center.add(new Vector3(0, 1.5, 0)),
			color: Color3.fromRGB(60, 110, 55),
			material: Enum.Material.Grass,
			canCollide: true,
			name: "Hedge",
			parent,
		});
	}

	/** A mossy boulder. */
	export function rock(pos: Vector3, scale: number, parent: Instance): void {
		const r = createPart({
			size: new Vector3(scale, scale * 0.7, scale),
			position: pos.add(new Vector3(0, scale * 0.3, 0)),
			color: Color3.fromRGB(120, 120, 125),
			material: Enum.Material.Slate,
			canCollide: false,
			name: "Rock",
			parent,
		});
		r.Shape = Enum.PartType.Ball;
	}

	/** A simple parked car (faces ±X, along the main road). Body + cabin + glass + wheels. */
	export function car(pos: Vector3, color: Color3, parent: Instance): void {
		createPart({
			size: new Vector3(14, 3, 6),
			position: pos.add(new Vector3(0, 2.5, 0)),
			color,
			material: Enum.Material.SmoothPlastic,
			reflectance: 0.05,
			name: "CarBody",
			parent,
		});
		createPart({
			size: new Vector3(7, 3, 5.4),
			position: pos.add(new Vector3(-0.5, 5, 0)),
			color,
			material: Enum.Material.SmoothPlastic,
			name: "CarCabin",
			parent,
		});
		createPart({
			size: new Vector3(7.2, 1.8, 5.6),
			position: pos.add(new Vector3(-0.5, 5.2, 0)),
			color: Color3.fromRGB(40, 50, 62),
			material: Enum.Material.Glass,
			transparency: 0.25,
			reflectance: 0.2,
			canCollide: false,
			name: "CarGlass",
			parent,
		});
		for (const dx of [-4.5, 4.5]) {
			for (const dz of [-3, 3]) {
				const wheel = createPart({
					size: new Vector3(1.2, 2.4, 2.4),
					position: pos.add(new Vector3(dx, 1, dz)),
					color: Color3.fromRGB(26, 26, 30),
					material: Enum.Material.SmoothPlastic,
					canCollide: false,
					name: "Wheel",
					parent,
				});
				wheel.Shape = Enum.PartType.Cylinder;
				wheel.CFrame = new CFrame(pos.add(new Vector3(dx, 1, dz))).mul(CFrame.Angles(0, math.rad(90), 0));
			}
		}
		for (const dz of [-2, 2]) {
			createPart({
				size: new Vector3(0.4, 1, 1.2),
				position: pos.add(new Vector3(7, 2.5, dz)),
				color: Color3.fromRGB(255, 250, 210),
				material: Enum.Material.Neon,
				canCollide: false,
				name: "Headlight",
				parent,
			});
		}
	}

	/** A wooden utility pole with a crossarm. Wires are added by the caller between poles. */
	export function powerPole(pos: Vector3, parent: Instance): void {
		createPart({
			size: new Vector3(1, 26, 1),
			position: pos.add(new Vector3(0, 13, 0)),
			color: Color3.fromRGB(86, 64, 46),
			material: Enum.Material.Wood,
			name: "PolePost",
			parent,
		});
		createPart({
			size: new Vector3(0.8, 0.8, 9),
			position: pos.add(new Vector3(0, 23, 0)),
			color: Color3.fromRGB(86, 64, 46),
			material: Enum.Material.Wood,
			canCollide: false,
			name: "PoleCrossarm",
			parent,
		});
	}

	/** A thin sagging-less wire span between two points (along X or Z). */
	export function wire(from: Vector3, to: Vector3, parent: Instance): void {
		const alongX = math.abs(to.X - from.X) >= math.abs(to.Z - from.Z);
		const length = alongX ? math.abs(to.X - from.X) : math.abs(to.Z - from.Z);
		createPart({
			size: alongX ? new Vector3(length, 0.12, 0.12) : new Vector3(0.12, 0.12, length),
			position: from.add(to).div(2),
			color: Color3.fromRGB(20, 20, 22),
			material: Enum.Material.SmoothPlastic,
			canCollide: false,
			name: "Wire",
			parent,
		});
	}

	/** A marble fountain: ring basin + water disc + center column. */
	export function fountain(pos: Vector3, parent: Instance): void {
		const basin = createPart({
			size: new Vector3(2, 13, 13),
			position: pos.add(new Vector3(0, 1, 0)),
			color: Color3.fromRGB(185, 185, 190),
			material: Enum.Material.Marble,
			name: "FountainBasin",
			parent,
		});
		basin.Shape = Enum.PartType.Cylinder;
		basin.CFrame = new CFrame(pos.add(new Vector3(0, 1, 0))).mul(CFrame.Angles(0, 0, math.rad(90)));
		const water = createPart({
			size: new Vector3(0.6, 11, 11),
			position: pos.add(new Vector3(0, 1.7, 0)),
			color: Color3.fromRGB(90, 150, 200),
			material: Enum.Material.Glass,
			transparency: 0.3,
			reflectance: 0.2,
			canCollide: false,
			name: "FountainWater",
			parent,
		});
		water.Shape = Enum.PartType.Cylinder;
		water.CFrame = new CFrame(pos.add(new Vector3(0, 1.7, 0))).mul(CFrame.Angles(0, 0, math.rad(90)));
		createPart({
			size: new Vector3(2, 5, 2),
			position: pos.add(new Vector3(0, 3.5, 0)),
			color: Color3.fromRGB(185, 185, 190),
			material: Enum.Material.Marble,
			name: "FountainColumn",
			parent,
		});
	}

	/** A playground slide: raised platform on legs + an angled ramp. */
	export function slide(pos: Vector3, parent: Instance): void {
		createPart({
			size: new Vector3(4, 0.4, 4),
			position: pos.add(new Vector3(0, 6, 0)),
			color: Color3.fromRGB(210, 180, 60),
			material: Enum.Material.Plastic,
			name: "SlideTop",
			parent,
		});
		for (const dx of [-1.8, 1.8]) {
			for (const dz of [-1.8, 1.8]) {
				createPart({
					size: new Vector3(0.4, 6, 0.4),
					position: pos.add(new Vector3(dx, 3, dz)),
					color: Color3.fromRGB(160, 160, 170),
					material: Enum.Material.Metal,
					canCollide: false,
					name: "SlideLeg",
					parent,
				});
			}
		}
		const ramp = createPart({
			size: new Vector3(3, 0.4, 9),
			position: pos.add(new Vector3(0, 3.6, 5)),
			color: Color3.fromRGB(220, 80, 80),
			material: Enum.Material.Plastic,
			canCollide: false,
			name: "SlideRamp",
			parent,
		});
		ramp.CFrame = new CFrame(pos.add(new Vector3(0, 3.6, 5))).mul(CFrame.Angles(math.rad(34), 0, 0));
	}

	/** A swing set: top bar on two A-frames + two hanging seats. */
	export function swingSet(pos: Vector3, parent: Instance): void {
		createPart({
			size: new Vector3(0.5, 0.5, 10),
			position: pos.add(new Vector3(0, 8, 0)),
			color: Color3.fromRGB(160, 60, 60),
			material: Enum.Material.Metal,
			name: "SwingBar",
			parent,
		});
		for (const dz of [-4.5, 4.5]) {
			for (const dx of [-2, 2]) {
				const leg = createPart({
					size: new Vector3(0.4, 9, 0.4),
					position: pos.add(new Vector3(dx, 4, dz)),
					color: Color3.fromRGB(160, 60, 60),
					material: Enum.Material.Metal,
					canCollide: false,
					name: "SwingLeg",
					parent,
				});
				leg.CFrame = new CFrame(pos.add(new Vector3(dx, 4, dz))).mul(CFrame.Angles(0, 0, math.rad(dx > 0 ? 12 : -12)));
			}
		}
		for (const dz of [-2, 2]) {
			createPart({
				size: new Vector3(2, 0.3, 0.8),
				position: pos.add(new Vector3(0, 2.5, dz)),
				color: Color3.fromRGB(40, 40, 46),
				material: Enum.Material.Plastic,
				canCollide: false,
				name: "SwingSeat",
				parent,
			});
			createPart({
				size: new Vector3(0.12, 5, 0.12),
				position: pos.add(new Vector3(0, 5, dz)),
				color: Color3.fromRGB(60, 60, 64),
				canCollide: false,
				name: "SwingChain",
				parent,
			});
		}
	}
}
