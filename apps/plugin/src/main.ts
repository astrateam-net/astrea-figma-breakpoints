import {
  buildPlan,
  buildRouteTable,
  defaultSettings,
  diffBuild,
  type PlanRoute,
  routeFingerprint,
  type Settings,
  settingsFingerprint,
} from '@astrea/breakpoints-core';
import {emit, on, showUI} from '@create-figma-plugin/utilities';
import {buildCheckPage, frameSignature, readBuilt} from './build';
import {listPages, revealNodes, type ScanResult, scanPage} from './scan';
import {loadSettings, saveSettings} from './storage';
import type {
  BuildHandler,
  BuildStatus,
  BuiltHandler,
  CancelHandler,
  ProgressHandler,
  ReadyHandler,
  ResizeHandler,
  RevealHandler,
  SaveHandler,
  ScanHandler,
  StateHandler,
} from './types';

/** Per-user window size (clientStorage), not shared through the file. */
const WINDOW_KEY = 'window-size';
const DEFAULT_WINDOW = {width: 480, height: 560};

/**
 * Bump when the look of the check page changes, so pages built by an older
 * version of the plugin show up as changed and get an Update.
 */
const LAYOUT_VERSION = 3;

interface Current {
  scan: ScanResult;
  plan: PlanRoute[];
  fingerprints: Record<string, string>;
}

/** The plan for the saved settings, with a fingerprint per route. */
async function currentPlan(
  page: PageNode,
  settings: Settings,
): Promise<Current> {
  const scan = await scanPage(page, settings.theme.collectionKey);
  const rows = buildRouteTable(
    scan.frames,
    settings.breakpoints,
    settings.overrides,
    settings.theme.collectionKey,
  );
  const plan = buildPlan(rows, settings);
  const sources: Record<string, string> = {};
  for (const frame of scan.frames) {
    const node = await figma.getNodeByIdAsync(frame.id);
    if (node?.type === 'FRAME') sources[frame.id] = frameSignature(node);
  }
  const settingsHash = `${LAYOUT_VERSION}:${settingsFingerprint(settings)}`;
  const fingerprints: Record<string, string> = {};
  for (const route of plan) {
    fingerprints[route.key] = routeFingerprint(route, settingsHash, sources);
  }
  return {scan, plan, fingerprints};
}

async function storedWindowSize(): Promise<{width: number; height: number}> {
  const size: unknown = await figma.clientStorage.getAsync(WINDOW_KEY);
  if (
    typeof size === 'object' &&
    size !== null &&
    'width' in size &&
    'height' in size &&
    typeof size.width === 'number' &&
    typeof size.height === 'number'
  ) {
    return {width: size.width, height: size.height};
  }
  return DEFAULT_WINDOW;
}

export default async function () {
  const stored = loadSettings();
  let firstRun = stored === null;
  let settings = stored ?? defaultSettings();
  let cancelled = false;

  function pageFor(pageId: string | null): PageNode {
    return figma.root.children.find(p => p.id === pageId) ?? figma.currentPage;
  }

  async function sendState(pageId: string | null): Promise<void> {
    const current = await currentPlan(pageFor(pageId), settings);
    const built = await readBuilt();
    const build: BuildStatus = {
      exists: built.exists,
      changes: diffBuild(built.fingerprints, current.fingerprints),
      findings: built.findings,
    };
    emit<StateHandler>('STATE', {
      firstRun,
      fileName: figma.root.name,
      settings,
      pages: listPages(),
      scan: current.scan,
      build,
    });
  }

  async function runBuild(scope: 'all' | 'changed'): Promise<void> {
    const page = figma.root.children.find(p => p.id === settings.pageId);
    if (!page) {
      emit<BuiltHandler>('BUILT', {
        status: 'failed',
        error: 'The page with the screens is gone. Edit the setup.',
      });
      return;
    }
    const current = await currentPlan(page, settings);
    const built = await readBuilt();
    const only =
      scope === 'changed' && built.exists
        ? new Set(
            diffBuild(built.fingerprints, current.fingerprints)
              .filter(c => c.kind !== 'removed')
              .map(c => c.route),
          )
        : null;

    cancelled = false;
    // Everything after this checkpoint is one undo step.
    figma.commitUndo();
    try {
      const result = await buildCheckPage(current.plan, page, {
        only,
        fingerprints: current.fingerprints,
        isCancelled: () => cancelled,
        onProgress: progress => emit<ProgressHandler>('PROGRESS', progress),
      });
      emit<BuiltHandler>('BUILT', result);
      if (result.status === 'built') {
        const gaps = result.gaps > 0 ? `, ${result.gaps} without a frame` : '';
        figma.notify(`✔ Built ${result.copies} copies${gaps}`, {
          button: {text: 'Undo', action: () => figma.triggerUndo()},
          timeout: 8000,
        });
      } else {
        figma.notify('Build cancelled; the page is as it was');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emit<BuiltHandler>('BUILT', {status: 'failed', error: message});
      figma.notify(`✘ Build failed: ${message}`, {error: true});
    }
    await sendState(settings.pageId);
  }

  on<ReadyHandler>('READY', () => sendState(settings.pageId));
  on<ScanHandler>('SCAN', pageId => sendState(pageId));
  on<RevealHandler>('REVEAL', ids => revealNodes(ids));
  on<SaveHandler>('SAVE', next => {
    saveSettings(next);
    settings = next;
    firstRun = false;
    figma.notify('✔ Settings saved in this file');
    return sendState(next.pageId);
  });
  on<BuildHandler>('BUILD', scope => runBuild(scope));
  on<CancelHandler>('CANCEL', () => {
    cancelled = true;
  });
  on<ResizeHandler>('RESIZE', size => {
    figma.ui.resize(size.width, size.height);
    return figma.clientStorage.setAsync(WINDOW_KEY, size);
  });

  showUI(await storedWindowSize());
}
