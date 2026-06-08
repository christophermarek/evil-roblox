import { Controller, OnStart } from "@flamework/core";
import { Players } from "@rbxts/services";

/**
 * Locks the camera to first person. `CameraMode.LockFirstPerson` forces first-person view
 * and prevents zooming out to third person; it's a player property so it persists across
 * respawns (no need to re-apply on CharacterAdded).
 */
@Controller()
export class CameraController implements OnStart {
	onStart() {
		Players.LocalPlayer.CameraMode = Enum.CameraMode.LockFirstPerson;
		print("[CameraController] started — locked to first person");
	}
}
