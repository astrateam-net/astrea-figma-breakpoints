import type {RouteRow} from '@astrea/breakpoints-core';
import {
  Bold,
  Button,
  Container,
  Divider,
  Dropdown,
  IconFrame16,
  Layer,
  LoadingIndicator,
  Muted,
  render,
  Stack,
  Text,
  VerticalSpace,
} from '@create-figma-plugin/ui';
import {emit, on} from '@create-figma-plugin/utilities';
// biome-ignore lint/correctness/noUnusedImports: create-figma-plugin builds JSX with the classic factory `h`
import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import type {
  PluginState,
  ReadyHandler,
  RevealHandler,
  ScanHandler,
  StateHandler,
} from './types';

function frameIds(row: RouteRow): string[] {
  return Object.values(row.cells).flatMap(cell => cell.frames.map(f => f.id));
}

/** Rows grouped by zone (outermost section), in page order. */
function byZone(rows: RouteRow[]): Array<[string, RouteRow[]]> {
  const zones = new Map<string, RouteRow[]>();
  for (const row of rows) {
    const zone = row.zone ?? 'No section';
    zones.set(zone, [...(zones.get(zone) ?? []), row]);
  }
  return [...zones];
}

function ScanStep({state}: {state: PluginState}) {
  const {pages, scan, rows} = state;
  const frameCount = scan.frames.length;

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>
        <Bold>Where are your screens?</Bold>
      </Text>
      <VerticalSpace space="medium" />
      <Dropdown
        onValueChange={pageId => emit<ScanHandler>('SCAN', pageId)}
        options={pages.map(page => ({text: page.name, value: page.id}))}
        value={scan.pageId}
      />
      <VerticalSpace space="large" />
      {frameCount === 0 ? (
        <Text>
          <Muted>
            No frames on this page. Pick the page where your screens are.
          </Muted>
        </Text>
      ) : (
        <Stack space="small">
          <Text>
            Found {rows.length} {rows.length === 1 ? 'route' : 'routes'},{' '}
            {frameCount} {frameCount === 1 ? 'frame' : 'frames'}
          </Text>
          {byZone(rows).map(([zone, zoneRows]) => (
            <Stack key={zone} space="extraSmall">
              <Text>
                <Muted>{zone}</Muted>
              </Text>
              {zoneRows.map(row => (
                <Layer
                  description={`${frameIds(row).length} frames`}
                  icon={<IconFrame16 />}
                  key={row.key}
                  onValueChange={() =>
                    emit<RevealHandler>('REVEAL', frameIds(row))
                  }
                  value={false}
                >
                  {row.key}
                </Layer>
              ))}
            </Stack>
          ))}
        </Stack>
      )}
      <VerticalSpace space="large" />
      <Divider />
      <VerticalSpace space="medium" />
      <Text>
        <Muted>
          Routes are frame names without the breakpoint suffix. Click one to see
          its frames.
        </Muted>
      </Text>
      <VerticalSpace space="medium" />
      <Button disabled fullWidth>
        Next: Breakpoints
      </Button>
      <VerticalSpace space="medium" />
    </Container>
  );
}

function Plugin() {
  const [state, setState] = useState<PluginState | null>(null);

  useEffect(() => {
    const off = on<StateHandler>('STATE', setState);
    emit<ReadyHandler>('READY');
    return off;
  }, []);

  if (!state) return <LoadingIndicator />;
  return <ScanStep state={state} />;
}

export default render(Plugin);
