import {
  Container,
  Muted,
  render,
  Stack,
  Text,
  VerticalSpace,
} from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
// biome-ignore lint/correctness/noUnusedImports: create-figma-plugin builds JSX with the classic factory `h`
import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { ReadyHandler, SelectedFrame, SelectionHandler } from "./types";

function Plugin() {
  const [frames, setFrames] = useState<SelectedFrame[]>([]);

  useEffect(() => {
    const off = on<SelectionHandler>("SELECTION", setFrames);
    emit<ReadyHandler>("READY");
    return off;
  }, []);

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      {frames.length === 0 ? (
        <Text>
          <Muted>Select a route frame to see how it is read.</Muted>
        </Text>
      ) : (
        <Stack space="small">
          {frames.map((frame) => (
            <Text key={frame.id}>
              {frame.route}
              {frame.state ? ` · ${frame.state}` : ""}
              <Muted>
                {" "}
                · {frame.breakpoint ?? "base"} · {Math.round(frame.width)}
              </Muted>
            </Text>
          ))}
        </Stack>
      )}
      <VerticalSpace space="large" />
    </Container>
  );
}

export default render(Plugin);
