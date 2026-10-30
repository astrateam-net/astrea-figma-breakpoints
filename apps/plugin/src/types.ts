import type {BuildChange, Settings} from '@astrea/breakpoints-core';
import type {EventHandler} from '@create-figma-plugin/utilities';
import type {BuildResult, Progress} from './build';
import type {PageInfo, ScanResult} from './scan';

/** How the check page compares with the current screens and settings. */
export interface BuildStatus {
  /** The check page has been built at least once. */
  exists: boolean;
  /** Routes that are new, changed or gone since the last build. */
  changes: BuildChange[];
}

/** Everything the UI needs, sent by main on open, rescan, save and build. */
export interface PluginState {
  /** No settings stored in this file yet: show the setup wizard. */
  firstRun: boolean;
  settings: Settings;
  pages: PageInfo[];
  scan: ScanResult;
  build: BuildStatus;
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

/** ui → main: build everything, or only what changed. */
export interface BuildHandler extends EventHandler {
  name: 'BUILD';
  handler: (scope: 'all' | 'changed') => void;
}

/** ui → main: stop the running build. */
export interface CancelHandler extends EventHandler {
  name: 'CANCEL';
  handler: () => void;
}

/** main → ui: build progress. */
export interface ProgressHandler extends EventHandler {
  name: 'PROGRESS';
  handler: (progress: Progress) => void;
}

/** main → ui: the build finished, was cancelled or failed. */
export interface BuiltHandler extends EventHandler {
  name: 'BUILT';
  handler: (result: BuildResult | {status: 'failed'; error: string}) => void;
}

/** ui → main: the user dragged the window corner. */
export interface ResizeHandler extends EventHandler {
  name: 'RESIZE';
  handler: (size: {width: number; height: number}) => void;
}
