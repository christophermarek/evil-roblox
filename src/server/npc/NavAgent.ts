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
	/** Bumped on every new moveTo/cancel so stale walk threads abort themselves. */
	private generation = 0;

	constructor(
		private readonly humanoid: Humanoid,
		private readonly root: BasePart,
	) {
		this.path = PathfindingService.CreatePath({
			AgentRadius: CONFIG.pathfinding.AGENT_RADIUS,
			AgentHeight: CONFIG.pathfinding.AGENT_HEIGHT,
			AgentCanJump: CONFIG.pathfinding.AGENT_CAN_JUMP,
			WaypointSpacing: CONFIG.pathfinding.WAYPOINT_SPACING,
			// Make grass expensive so NPCs prefer the carved Concrete road network.
			Costs: {
				Grass: CONFIG.pathfinding.GRASS_COST,
			},
		});
	}

	/** Walk to a world position. Resolves true on arrival, false if pathing failed/stuck. */
	moveTo(goal: Vector3): Promise<boolean> {
		const gen = ++this.generation; // supersede any in-progress walk
		return new Promise<boolean>((resolve) => {
			task.spawn(() => resolve(this.walk(goal, 0, gen)));
		});
	}

	/** Stop the current walk where the NPC stands. */
	cancel(): void {
		this.generation++;
		this.humanoid.MoveTo(this.root.Position);
	}

	/** Within ARRIVAL_RADIUS of the goal counts as arrived (crowds/jitter rarely hit the exact stud). */
	private atGoal(goal: Vector3): boolean {
		return this.root.Position.sub(goal).Magnitude <= CONFIG.npc.ARRIVAL_RADIUS;
	}

	/**
	 * Move to one waypoint, but cap the wait at STUCK_TIMEOUT (default Humanoid:MoveTo waits
	 * 8s before giving up — too long when an NPC is wedged on a threshold). Returns whether
	 * the waypoint was reached; a timeout returns false so walk() recomputes.
	 */
	private moveStep(target: Vector3, gen: number): boolean {
		this.humanoid.MoveTo(target);
		let reached = false;
		let done = false;
		const conn = this.humanoid.MoveToFinished.Connect((r) => {
			reached = r;
			done = true;
		});
		const deadline = os.clock() + CONFIG.pathfinding.STUCK_TIMEOUT;
		while (!done && os.clock() < deadline && gen === this.generation) task.wait();
		conn.Disconnect();
		return reached;
	}

	private walk(goal: Vector3, retries: number, gen: number): boolean {
		if (gen !== this.generation) return false;
		if (this.atGoal(goal)) return true; // already there

		const [computed] = pcall(() => this.path.ComputeAsync(this.root.Position, goal));
		if (gen !== this.generation) return false;
		if (!computed || this.path.Status !== Enum.PathStatus.Success) {
			return false;
		}

		const waypoints = this.path.GetWaypoints();
		// Skip waypoint[0] — it's the agent's current position.
		for (let i = 1; i < waypoints.size(); i++) {
			if (gen !== this.generation) return false; // a newer moveTo took over
			if (this.atGoal(goal)) return true; // close enough; stop early
			const reached = this.moveStep(waypoints[i].Position, gen);
			if (gen !== this.generation) return false;
			if (!reached) {
				if (retries < CONFIG.pathfinding.MAX_RETRIES) {
					task.wait(0.1);
					return this.walk(goal, retries + 1, gen); // recompute from where we got stuck
				}
				return false;
			}
		}
		return true;
	}
}
