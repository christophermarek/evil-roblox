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
}
