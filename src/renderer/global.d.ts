import type { DesktopPetApi } from '../preload/index';

declare global {
  interface Window {
    desktopPet: DesktopPetApi;
  }
}
