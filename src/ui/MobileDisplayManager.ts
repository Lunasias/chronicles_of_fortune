export type MobileDisplayPreference = 'landscape' | 'portrait';

export class MobileDisplayManager {
  private static instance: MobileDisplayManager | null = null;
  private prefKey = 'fortune_mobile_display_pref';
  private autoPromptDone = false;

  public static getInstance(): MobileDisplayManager {
    if (!MobileDisplayManager.instance) {
      MobileDisplayManager.instance = new MobileDisplayManager();
    }
    return MobileDisplayManager.instance;
  }

  constructor() {
    this.init();
  }

  public isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.innerWidth <= 840 ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    );
  }

  public isPortrait(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  }

  public isLandscape(): boolean {
    return !this.isPortrait();
  }

  public getPreference(): MobileDisplayPreference | null {
    if (typeof localStorage === 'undefined') return null;
    return (localStorage.getItem(this.prefKey) as MobileDisplayPreference) || null;
  }

  public setPreference(pref: MobileDisplayPreference): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.prefKey, pref);
    }
  }

  private init(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.updateBodyClasses();

    window.addEventListener('resize', () => {
      this.updateBodyClasses();
      this.checkRotateGuide();
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.updateBodyClasses();
        this.checkRotateGuide();
      }, 200);
    });

    document.addEventListener('fullscreenchange', () => {
      this.updateBodyClasses();
      this.checkRotateGuide();
    });

    // Run initial prompt check on next tick once DOM is ready
    setTimeout(() => {
      this.bindDOM();
      this.checkAutoPrompt();
    }, 100);
  }

  public updateBodyClasses(): void {
    if (typeof document === 'undefined') return;
    const isMob = this.isMobile();
    const isPort = this.isPortrait();

    document.body.classList.toggle('is-mobile-device', isMob);
    document.body.classList.toggle('is-mobile-portrait', isMob && isPort);
    document.body.classList.toggle('is-mobile-landscape', isMob && !isPort);

    // Adjust minimap and feed defaults for small screens
    document.body.classList.toggle('mobile-portrait-mode', isMob && isPort);
  }

  public bindDOM(): void {
    if (typeof document === 'undefined') return;
    // 1. Mobile Display Choice Modal buttons
    document.getElementById('btnMobileGoLandscape')?.addEventListener('click', () => {
      this.chooseMode('landscape');
    });

    document.getElementById('btnMobileStayPortrait')?.addEventListener('click', () => {
      this.chooseMode('portrait');
    });

    document.getElementById('btnDismissMobileDisplayModal')?.addEventListener('click', () => {
      this.hideDisplayModal();
    });

    // 2. Rotate Guide Cancel Button (if user decides to stay in portrait)
    document.getElementById('btnCancelRotateGuide')?.addEventListener('click', () => {
      this.hideRotateGuide();
      this.applyPortraitMode();
    });

    // 3. Quick Display Toggle Button in HUD
    document.getElementById('btnMobileDisplayToggle')?.addEventListener('click', () => {
      this.toggleOrShowModal();
    });

    // 4. Edge Dock Pills for Feed & Quests on Mobile
    document.getElementById('btnMobileToggleFeed')?.addEventListener('click', () => {
      this.toggleMobileDrawer('feed');
    });

    document.getElementById('btnMobileToggleQuest')?.addEventListener('click', () => {
      this.toggleMobileDrawer('quest');
    });

    // Auto-close drawers if user clicks game canvas
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.addEventListener('pointerdown', () => {
        if (this.isMobile()) {
          this.closeAllDrawers();
        }
      });
    }
  }

  public checkAutoPrompt(): void {
    if (this.autoPromptDone) return;
    if (!this.isMobile()) return;

    const savedPref = this.getPreference();

    if (savedPref === 'landscape') {
      if (this.isPortrait()) {
        this.showRotateGuide();
      }
      this.autoPromptDone = true;
      return;
    }

    if (savedPref === 'portrait') {
      this.applyPortraitMode();
      this.autoPromptDone = true;
      return;
    }

    // First time on mobile portrait: show the choice dialog!
    if (this.isPortrait()) {
      this.showDisplayModal();
      this.autoPromptDone = true;
    }
  }

  public showDisplayModal(): void {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('mobileDisplayModal');
    if (modal) modal.classList.remove('hidden');
  }

  public hideDisplayModal(): void {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('mobileDisplayModal');
    if (modal) modal.classList.add('hidden');
  }

  public showRotateGuide(): void {
    if (typeof document === 'undefined') return;
    const guide = document.getElementById('mobileRotateGuideOverlay');
    if (guide) guide.classList.remove('hidden');
  }

  public hideRotateGuide(): void {
    if (typeof document === 'undefined') return;
    const guide = document.getElementById('mobileRotateGuideOverlay');
    if (guide) guide.classList.add('hidden');
  }

  private checkRotateGuide(): void {
    // If device became landscape, dismiss rotate guide automatically
    if (this.isLandscape()) {
      this.hideRotateGuide();
    }
  }

  public async chooseMode(mode: 'landscape' | 'portrait'): Promise<void> {
    const chk = document.getElementById('chkRememberDisplayChoice') as HTMLInputElement | null;
    if (chk && chk.checked) {
      this.setPreference(mode);
    }

    this.hideDisplayModal();

    if (mode === 'landscape') {
      await this.enterFullscreenLandscape();
    } else {
      this.applyPortraitMode();
    }
  }

  public applyPortraitMode(): void {
    if (typeof document === 'undefined') return;
    document.body.classList.add('mobile-portrait-mode');
    this.updateBodyClasses();
    this.closeAllDrawers();
  }

  public async enterFullscreenLandscape(): Promise<void> {
    if (typeof document === 'undefined') return;
    // 1. Request Fullscreen
    const docEl = document.documentElement as any;
    const requestFs =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.msRequestFullscreen;

    if (requestFs && !document.fullscreenElement) {
      try {
        await requestFs.call(docEl);
      } catch (err) {
        console.warn('Fullscreen request bypassed or blocked:', err);
      }
    }

    // 2. Try Screen Orientation Lock API
    const screenAny = window.screen as any;
    let locked = false;
    if (screenAny?.orientation && typeof screenAny.orientation.lock === 'function') {
      try {
        await screenAny.orientation.lock('landscape');
        locked = true;
      } catch (e) {
        console.warn('Screen orientation lock unsupported on this browser:', e);
      }
    }

    // 3. If still in portrait, show friendly rotating device guide
    if (this.isPortrait()) {
      this.showRotateGuide();
    } else {
      this.hideRotateGuide();
    }

    this.updateBodyClasses();
  }

  public toggleOrShowModal(): void {
    if (typeof document === 'undefined') return;
    if (this.isPortrait()) {
      this.showDisplayModal();
    } else {
      // Already landscape - if in fullscreen, can toggle or show settings
      if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      } else {
        this.enterFullscreenLandscape();
      }
    }
  }

  /**
   * Toggles mobile drawer for event feed or quest tracker without overlap.
   */
  public toggleMobileDrawer(type: 'feed' | 'quest'): void {
    if (typeof document === 'undefined') return;
    const feedWindow = document.getElementById('gameEventFeedWindow');
    const questWindow = document.getElementById('questTrackerHUD');

    if (type === 'feed' && feedWindow) {
      const isHidden = feedWindow.classList.contains('hidden');
      if (isHidden) {
        feedWindow.classList.remove('hidden');
        if (questWindow) questWindow.classList.add('hidden'); // never overlap!
      } else {
        feedWindow.classList.add('hidden');
      }
    } else if (type === 'quest' && questWindow) {
      const isHidden = questWindow.classList.contains('hidden');
      if (isHidden) {
        questWindow.classList.remove('hidden');
        if (feedWindow) feedWindow.classList.add('hidden'); // never overlap!
      } else {
        questWindow.classList.add('hidden');
      }
    }
  }

  public closeAllDrawers(): void {
    if (typeof document === 'undefined') return;
    document.getElementById('gameEventFeedWindow')?.classList.add('hidden');
    document.getElementById('questTrackerHUD')?.classList.add('hidden');
  }
}

export const mobileDisplayManager = MobileDisplayManager.getInstance();
