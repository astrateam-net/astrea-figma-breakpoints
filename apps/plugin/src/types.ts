import type { FrameName } from "@astrea/breakpoints-core";
import type { EventHandler } from "@create-figma-plugin/utilities";

export interface SelectedFrame extends FrameName {
  id: string;
  name: string;
  width: number;
}

/** main → ui: the selected top-level frames, parsed. */
export interface SelectionHandler extends EventHandler {
  name: "SELECTION";
  handler: (frames: SelectedFrame[]) => void;
}

/** ui → main: the UI is mounted and wants the current selection. */
export interface ReadyHandler extends EventHandler {
  name: "READY";
  handler: () => void;
}
