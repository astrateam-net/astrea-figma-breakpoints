import {
  buildPlan,
  buildRouteTable,
  defaultSettings,
} from '@astrea/breakpoints-core';
import {emit, on, showUI} from '@create-figma-plugin/utilities';
import {buildCheckPage} from './build';
import {listPages, revealNodes, scanPage} from './scan';
import {loadSettings, saveSettings} from './storage';
import type {
  BuildHandler,
  BuiltHandler,
  ReadyHandler,
  RevealHandler,
  SaveHandler,
  ScanHandler,
  StateHandler,
} from './types';

export default function () {
  const stored = loadSettings();
  let firstRun = stored === null;
  let settings = stored ?? defaultSettings();

  async function sendState(pageId: string | null): Promise<void> {
    const page =
      figma.root.children.find(p => p.id === pageId) ?? figma.currentPage;
    const scan = await scanPage(page, settings.theme.collectionKey);
    emit<StateHandler>('STATE', {
      firstRun,
      settings,
      pages: listPages(),
      scan,
    });
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

  on<BuildHandler>('BUILD', async () => {
    const page = figma.root.children.find(p => p.id === settings.pageId);
    if (!page) {
      emit<BuiltHandler>('BUILT', {error: 'The screens page is gone'});
      return;
    }
    const scan = await scanPage(page, settings.theme.collectionKey);
    const rows = buildRouteTable(
      scan.frames,
      settings.breakpoints,
      settings.overrides,
      settings.theme.collectionKey,
    );
    // Everything after this checkpoint is one undo step.
    figma.commitUndo();
    try {
      const result = await buildCheckPage(buildPlan(rows, settings), page);
      emit<BuiltHandler>('BUILT', result);
      const gaps = result.gaps > 0 ? `, ${result.gaps} without a frame` : '';
      figma.notify(`✔ Built ${result.copies} copies${gaps}`, {
        button: {text: 'Undo', action: () => figma.triggerUndo()},
        timeout: 8000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emit<BuiltHandler>('BUILT', {error: message});
      figma.notify(`✘ Build failed: ${message}`, {error: true});
    }
  });

  showUI({height: 560, width: 480});
}
