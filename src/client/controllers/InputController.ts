import { Controller, OnStart } from "@flamework/core";
import { Players, UserInputService } from "@rbxts/services";
import { CONFIG } from "../../shared/config";

/**
 * Player input. Movement is client-owned (responsive), so sprint just adjusts the local
 * character's WalkSpeed while Shift is held. Crime/action inputs land here in M4.
 */
@Controller()
export class InputController implements OnStart {
	private sprinting = false;

	onStart() {
		UserInputService.InputBegan.Connect((input, processed) => {
			if (processed) return;
			if (input.KeyCode === Enum.KeyCode.LeftShift || input.KeyCode === Enum.KeyCode.RightShift) {
				this.sprinting = true;
				this.applySpeed();
			}
		});

		UserInputService.InputEnded.Connect((input) => {
			if (input.KeyCode === Enum.KeyCode.LeftShift || input.KeyCode === Enum.KeyCode.RightShift) {
				this.sprinting = false;
				this.applySpeed();
			}
		});

		// Re-assert walk speed on (re)spawn so a fresh character starts at the right speed.
		const player = Players.LocalPlayer;
		player.CharacterAdded.Connect(() => {
			this.sprinting = false;
			this.applySpeed();
		});

		print("[InputController] started — hold Shift to sprint");
	}

	private applySpeed(): void {
		const humanoid = Players.LocalPlayer.Character?.FindFirstChildOfClass("Humanoid");
		if (humanoid !== undefined) {
			humanoid.WalkSpeed = this.sprinting ? CONFIG.player.SPRINT_SPEED : CONFIG.player.WALK_SPEED;
		}
	}
}
