import {buildRouteTable, defaultSettings} from '@astrea/breakpoints-core';
import {emit, on, showUI} from '@create-figma-plugin/utilities';
import {listPages, revealNodes, scanPage} from './scan';
import {loadSettings} from './storage';
import type {
  ReadyHandler,
  RevealHandler,
  ScanHandler,
  StateHandler,
} from './types';

export default function () {
  const stored = loadSettings();
  const settings = stored ?? defaultSettings();

  async function sendState(pageId: string | null): Promise<void> {
    const page =
      figma.root.children.find(p => p.id === pageId) ?? figma.currentPage;
    const scan = await scanPage(page, settings.theme.collectionKey);
    emit<StateHandler>('STATE', {
      firstRun: stored === null,
      settings,
      pages: listPages(),
      scan,
      rows: buildRouteTable(
        scan.frames,
        settings.breakpoints,
        settings.overrides,
      ),
    });
  }

  on<ReadyHandler>('READY', () => sendState(settings.pageId));
  on<ScanHandler>('SCAN', pageId => sendState(pageId));
  on<RevealHandler>('REVEAL', ids => revealNodes(ids));

  showUI({height: 560, width: 480});
}
