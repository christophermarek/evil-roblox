import { OnStart, Service } from "@flamework/core";
import { Lighting, RunService, Workspace } from "@rbxts/services";
import { TimeService } from "./TimeService";
import { TownService } from "./TownService";

/** Linear interpolate a scalar. */
function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/**
 * Sets up cinematic lighting + post-processing (researched values) and drives day/night
 * dynamics from TimeService: brightness, ambient, colour grade, and switching the town's
 * lamp posts on after dark.
 *
 * Effect stack order (ColorCorrection → Bloom → DepthOfField → SunRays) follows Roblox's
 * post-processing guidance. Base Lighting props (Technology=Future, shadows, ambient) are
 * set in default.project.json; this service layers the atmospheric + dynamic pieces.
 */
@Service()
export class LightingService implements OnStart {
	private colorCorrection!: ColorCorrectionEffect;

	// Day ↔ night targets (lerped by a 0–1 "night" factor).
	private readonly dayAmbient = Color3.fromRGB(150, 155, 170);
	private readonly nightAmbient = Color3.fromRGB(40, 44, 70);
	private readonly dayTint = Color3.fromRGB(255, 248, 240);
	private readonly nightTint = Color3.fromRGB(150, 170, 220);

	constructor(
		private readonly timeService: TimeService,
		private readonly townService: TownService,
	) {}

	onStart() {
		this.createAtmosphere();
		this.createClouds();
		this.createPostProcessing();
		this.startDayNightLoop();
		print("[LightingService] started — atmosphere, clouds, post-processing, day/night online");
	}

	private createAtmosphere(): void {
		const atmosphere = new Instance("Atmosphere");
		atmosphere.Density = 0.32;
		atmosphere.Offset = 0.2;
		atmosphere.Color = Color3.fromRGB(199, 175, 130); // air tint
		atmosphere.Decay = Color3.fromRGB(106, 112, 125); // sky-to-haze blend
		atmosphere.Glare = 0.3;
		atmosphere.Haze = 1.4;
		atmosphere.Parent = Lighting;
	}

	private createClouds(): void {
		const clouds = new Instance("Clouds");
		clouds.Cover = 0.6;
		clouds.Density = 0.55;
		clouds.Color = Color3.fromRGB(255, 255, 255);
		clouds.Parent = Workspace.Terrain;
	}

	private createPostProcessing(): void {
		// 1) ColorCorrection — base mood (warm, slight contrast + saturation).
		const cc = new Instance("ColorCorrectionEffect");
		cc.Brightness = 0;
		cc.Contrast = 0.12;
		cc.Saturation = 0.08;
		cc.TintColor = this.dayTint;
		cc.Parent = Lighting;
		this.colorCorrection = cc;

		// 2) Bloom — cinematic glow.
		const bloom = new Instance("BloomEffect");
		bloom.Intensity = 0.8;
		bloom.Size = 24;
		bloom.Threshold = 1.8;
		bloom.Parent = Lighting;

		// 3) DepthOfField — subtle far falloff (kept gentle for gameplay).
		const dof = new Instance("DepthOfFieldEffect");
		dof.FarIntensity = 0.1;
		dof.FocusDistance = 55;
		dof.InFocusRadius = 130;
		dof.NearIntensity = 0;
		dof.Parent = Lighting;

		// 4) SunRays — volumetric shafts (pairs with Atmosphere.Glare).
		const sunRays = new Instance("SunRaysEffect");
		sunRays.Intensity = 0.15;
		sunRays.Spread = 0.8;
		sunRays.Parent = Lighting;
	}

	/**
	 * 0 at midday → 1 at deep night, with smooth dawn (5–7) and dusk (17–19) ramps.
	 * `hour` is fractional (0–24).
	 */
	private nightFactor(hour: number): number {
		if (hour >= 19 || hour < 5) return 1;
		if (hour >= 7 && hour < 17) return 0;
		if (hour >= 5 && hour < 7) return 1 - (hour - 5) / 2; // dawn
		return (hour - 17) / 2; // dusk
	}

	private startDayNightLoop(): void {
		let accumulator = 0;
		let lampsOn: boolean | undefined;

		RunService.Heartbeat.Connect((dt) => {
			accumulator += dt;
			if (accumulator < 0.3) return;
			accumulator = 0;

			const n = this.nightFactor(this.timeService.getTimeOfDay());

			Lighting.Brightness = lerp(2.6, 0.5, n);
			Lighting.OutdoorAmbient = this.dayAmbient.Lerp(this.nightAmbient, n);
			this.colorCorrection.TintColor = this.dayTint.Lerp(this.nightTint, n);
			this.colorCorrection.Brightness = lerp(0, -0.04, n);

			// Switch lamp posts on/off only on change (avoid churn).
			const shouldLight = n > 0.5;
			if (shouldLight !== lampsOn) {
				lampsOn = shouldLight;
				for (const light of this.townService.getNightLights()) {
					light.Enabled = shouldLight;
				}
			}
		});
	}
}
