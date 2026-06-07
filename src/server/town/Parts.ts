/**
 * Shared low-level part factory used by TownBuilder and the Props module.
 * Centralises the perf hygiene (BUILD_PLAN §A2): anchored, no Touched, query == collide.
 */
export interface PartProps {
	size: Vector3;
	position: Vector3;
	color: Color3;
	parent: Instance;
	material?: Enum.Material;
	canCollide?: boolean;
	transparency?: number;
	reflectance?: number;
	shape?: Enum.PartType;
	cframe?: CFrame; // if set, overrides position (for rotated parts)
	name?: string;
}

export function createPart(props: PartProps): Part {
	const part = new Instance("Part");
	part.Anchored = true;
	part.Size = props.size;
	if (props.cframe !== undefined) {
		part.CFrame = props.cframe;
	} else {
		part.Position = props.position;
	}
	part.Color = props.color;
	part.Material = props.material ?? Enum.Material.SmoothPlastic;
	part.CanCollide = props.canCollide ?? true;
	part.CanTouch = false; // we never use .Touched on static geometry
	// Perception raycasts (M4) only care about solid sight-blockers; match collision.
	part.CanQuery = props.canCollide ?? true;
	part.Transparency = props.transparency ?? 0;
	part.Reflectance = props.reflectance ?? 0;
	if (props.shape !== undefined) part.Shape = props.shape;
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
	if (props.name !== undefined) part.Name = props.name;
	part.Parent = props.parent;
	return part;
}
