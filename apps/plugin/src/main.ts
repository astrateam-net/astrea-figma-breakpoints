import {defaultSettings} from '@astrea/breakpoints-core';
import {emit, on, showUI} from '@create-figma-plugin/utilities';
import {listPages, revealNodes, scanPage} from './scan';
import {loadSettings, saveSettings} from './storage';
import type {
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

  showUI({height: 560, width: 480});
}
