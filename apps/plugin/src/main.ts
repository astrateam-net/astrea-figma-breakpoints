import { parseFrameName } from "@astrea/breakpoints-core";
import { emit, on, showUI } from "@create-figma-plugin/utilities";
import type { ReadyHandler, SelectedFrame, SelectionHandler } from "./types";

function selectedFrames(): SelectedFrame[] {
  return figma.currentPage.selection
    .filter((node) => node.type === "FRAME")
    .map((frame) => ({
      ...parseFrameName(frame.name),
      id: frame.id,
      name: frame.name,
      width: frame.width,
    }));
}

function sendSelection() {
  emit<SelectionHandler>("SELECTION", selectedFrames());
}

export default function () {
  on<ReadyHandler>("READY", sendSelection);
  figma.on("selectionchange", sendSelection);
  showUI({ height: 240, width: 320 });
}
