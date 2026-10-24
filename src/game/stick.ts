/** Virtual joystick state, written by the HUD scene and read by the game scene. */
export const stick = { x: 0, y: 0, active: false };

export function resetStick(): void {
  stick.x = 0;
  stick.y = 0;
  stick.active = false;
}
