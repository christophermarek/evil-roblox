import { PathfindingService } from "@rbxts/services";
import { CONFIG } from "../../shared/config";

/**
 * Wraps PathfindingService for one NPC (BUILD_PLAN §A2):
 *  - compute the path ONCE per leg (never per-frame),
 *  - follow waypoints via Humanoid:MoveTo,
 *  - on a missed/blocked waypoint, recompute up to MAX_RETRIES.
 *
 * Movement runs on its own thread; `moveTo` resolves a Promise when the leg ends, so the
 * FSM can `await` a commute without blocking the rest of the sim.
 */
export class NavAgent {
	private readonly path: Path;

	constructor(
		private readonly humanoid: Humanoid,
		private readonly root: BasePart,
	) {
		this.path = PathfindingService.CreatePath({
			AgentRadius: CONFIG.pathfinding.AGENT_RADIUS,
			AgentHeight: CONFIG.pathfinding.AGENT_HEIGHT,
			AgentCanJump: CONFIG.pathfinding.AGENT_CAN_JUMP,
			WaypointSpacing: CONFIG.pathfinding.WAYPOINT_SPACING,
		});
	}

	/** Walk to a world position. Resolves true on arrival, false if pathing failed/stuck. */
	moveTo(goal: Vector3): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			task.spawn(() => resolve(this.walk(goal, 0)));
		});
	}

	private walk(goal: Vector3, retries: number): boolean {
		const [computed] = pcall(() => this.path.ComputeAsync(this.root.Position, goal));
		if (!computed || this.path.Status !== Enum.PathStatus.Success) {
			return false;
		}

		const waypoints = this.path.GetWaypoints();
		// Skip waypoint[0] — it's the agent's current position.
		for (let i = 1; i < waypoints.size(); i++) {
			this.humanoid.MoveTo(waypoints[i].Position);
			const [reached] = this.humanoid.MoveToFinished.Wait();
			if (!reached) {
				if (retries < CONFIG.pathfinding.MAX_RETRIES) {
					task.wait(0.1);
					return this.walk(goal, retries + 1); // recompute from where we got stuck
				}
				return false;
			}
		}
		return true;
	}
}
