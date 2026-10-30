import type {Settings} from '@astrea/breakpoints-core';
import type {EventHandler} from '@create-figma-plugin/utilities';
import type {PageInfo, ScanResult} from './scan';

/** Everything the UI needs, sent by main on open, rescan and save. */
export interface PluginState {
  /** No settings stored in this file yet: show the setup wizard. */
  firstRun: boolean;
  settings: Settings;
  pages: PageInfo[];
  scan: ScanResult;
}

/** main → ui */
export interface StateHandler extends EventHandler {
  name: 'STATE';
  handler: (state: PluginState) => void;
}

/** ui → main: the UI is mounted and wants the state. */
export interface ReadyHandler extends EventHandler {
  name: 'READY';
  handler: () => void;
}

/** ui → main: scan another page. */
export interface ScanHandler extends EventHandler {
  name: 'SCAN';
  handler: (pageId: string) => void;
}

/** ui → main: select these nodes on the canvas and zoom to them. */
export interface RevealHandler extends EventHandler {
  name: 'REVEAL';
  handler: (ids: string[]) => void;
}

/** ui → main: store the settings in the file. */
export interface SaveHandler extends EventHandler {
  name: 'SAVE';
  handler: (settings: Settings) => void;
}

/** ui → main: build the check page from the saved settings. */
export interface BuildHandler extends EventHandler {
  name: 'BUILD';
  handler: () => void;
}

/** main → ui: the build finished (or failed with a message). */
export interface BuiltHandler extends EventHandler {
  name: 'BUILT';
  handler: (result: {copies: number; gaps: number} | {error: string}) => void;
}
