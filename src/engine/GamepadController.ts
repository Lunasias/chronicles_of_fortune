export interface GamepadCallbacks {
  onConfirm?: () => void;      // Button 0 (A / Cross)
  onCancel?: () => void;       // Button 1 (B / Circle)
  onSecondary?: () => void;    // Button 2 (X / Square)
  onSpecial?: () => void;      // Button 3 (Y / Triangle)
  onPrev?: () => void;         // Button 4 (L1 / LB)
  onNext?: () => void;         // Button 5 (R1 / RB)
  onSelect?: () => void;       // Button 8 (Select / Share / Back)
  onStart?: () => void;        // Button 9 (Start / Options / Menu)
  onDpadUp?: () => void;       // Button 12 (D-pad Up)
  onDpadDown?: () => void;     // Button 13 (D-pad Down)
  onDpadLeft?: () => void;     // Button 14 (D-pad Left)
  onDpadRight?: () => void;    // Button 15 (D-pad Right)
  onPan?: (dx: number, dy: number) => void; // Analog stick pan
  onZoom?: (delta: number) => void;         // Triggers / Bumpers zoom
}

export class GamepadController {
  private callbacks: GamepadCallbacks;
  private prevButtonStates: boolean[] = [];
  private activeGamepadIndex: number | null = null;
  private deadzone: number = 0.22;
  private panSpeed: number = 18;
  private toastTimeout: number | null = null;

  constructor(callbacks: GamepadCallbacks = {}) {
    this.callbacks = callbacks;
    this.setupListeners();
  }

  public setCallbacks(callbacks: GamepadCallbacks) {
    this.callbacks = callbacks;
  }

  private setupListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      this.activeGamepadIndex = e.gamepad.index;
      const cleanName = e.gamepad.id.replace(/\(.*?\)/g, '').trim() || 'Controller';
      this.showGamepadToast(`🎮 เชื่อมต่อคอนโทรลเลอร์แล้ว: ${cleanName}`);
    });

    window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
      if (this.activeGamepadIndex === e.gamepad.index) {
        this.activeGamepadIndex = null;
      }
      this.showGamepadToast('🎮 ตัดการเชื่อมต่อคอนโทรลเลอร์');
    });
  }

  public showGamepadToast(msg: string) {
    if (typeof document === 'undefined') return;
    const toast = document.getElementById('gamepadToast');
    const toastText = document.getElementById('gamepadToastText');
    if (!toast || !toastText) return;

    toastText.innerText = msg;
    toast.classList.remove('hidden', 'opacity-0', '-translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');

    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = window.setTimeout(() => {
      toast.classList.add('opacity-0', '-translate-y-2');
      window.setTimeout(() => {
        toast.classList.add('hidden');
      }, 350);
      this.toastTimeout = null;
    }, 3200);
  }

  public isGamepadAvailable(): boolean {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return false;
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] !== null) return true;
    }
    return false;
  }

  public update() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;

    const gamepads = navigator.getGamepads();
    let pad: Gamepad | null = null;

    if (this.activeGamepadIndex !== null && gamepads[this.activeGamepadIndex]) {
      pad = gamepads[this.activeGamepadIndex];
    } else {
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] !== null) {
          pad = gamepads[i];
          this.activeGamepadIndex = i;
          break;
        }
      }
    }

    if (!pad) return;

    // 1. Process Buttons (edge triggered for discrete actions)
    const buttons = pad.buttons;
    for (let i = 0; i < buttons.length; i++) {
      const isPressed = buttons[i].pressed;
      const wasPressed = this.prevButtonStates[i] || false;

      if (isPressed && !wasPressed) {
        this.handleButtonPress(i);
      }
      this.prevButtonStates[i] = isPressed;
    }

    // 2. Analog Sticks (continuous panning)
    if (pad.axes.length >= 2 && this.callbacks.onPan) {
      const rawX = pad.axes[0];
      const rawY = pad.axes[1];
      const magX = Math.abs(rawX) > this.deadzone ? rawX : 0;
      const magY = Math.abs(rawY) > this.deadzone ? rawY : 0;

      if (magX !== 0 || magY !== 0) {
        this.callbacks.onPan(magX * this.panSpeed, magY * this.panSpeed);
      }
    }

    // 3. Triggers / Secondary stick zoom
    if (pad.axes.length >= 4 && this.callbacks.onZoom) {
      const zoomAxis = pad.axes[3];
      if (Math.abs(zoomAxis) > 0.3) {
        this.callbacks.onZoom(-zoomAxis * 0.05);
      }
    }
  }

  private handleButtonPress(buttonIndex: number) {
    switch (buttonIndex) {
      case 0: // A / Cross
        this.callbacks.onConfirm?.();
        break;
      case 1: // B / Circle
        this.callbacks.onCancel?.();
        break;
      case 2: // X / Square
        this.callbacks.onSecondary?.();
        break;
      case 3: // Y / Triangle
        this.callbacks.onSpecial?.();
        break;
      case 4: // L1 / LB
        this.callbacks.onPrev?.();
        break;
      case 5: // R1 / RB
        this.callbacks.onNext?.();
        break;
      case 6: // LT (Zoom out)
        this.callbacks.onZoom?.(-0.15);
        break;
      case 7: // RT (Zoom in)
        this.callbacks.onZoom?.(0.15);
        break;
      case 8: // Select / Back / View
        this.callbacks.onSelect?.();
        break;
      case 9: // Start / Options / Menu
        this.callbacks.onStart?.();
        break;
      case 12: // D-pad Up
        this.callbacks.onDpadUp?.();
        break;
      case 13: // D-pad Down
        this.callbacks.onDpadDown?.();
        break;
      case 14: // D-pad Left
        this.callbacks.onDpadLeft?.();
        break;
      case 15: // D-pad Right
        this.callbacks.onDpadRight?.();
        break;
    }
  }
}
