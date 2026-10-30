import type {RouteRow} from '@astrea/breakpoints-core';
import {
  Bold,
  Dropdown,
  IconFrame16,
  Layer,
  Muted,
  Stack,
  Text,
  VerticalSpace,
} from '@create-figma-plugin/ui';
import {emit} from '@create-figma-plugin/utilities';
// biome-ignore lint/correctness/noUnusedImports: create-figma-plugin builds JSX with the classic factory `h`
import {h} from 'preact';
import type {RevealHandler, ScanHandler} from '../types';
import {plural, type StepProps} from './step-props';

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

/** Step 1: which page holds the screens, and what was found there. */
export function ScanStep({state, rows}: StepProps) {
  const {pages, scan} = state;

  return (
    <div>
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
      {scan.frames.length === 0 ? (
        <Text>
          <Muted>
            No frames on this page. Pick the page where your screens are.
          </Muted>
        </Text>
      ) : (
        <Stack space="small">
          <Text>
            Found {plural(rows.length, 'route')},{' '}
            {plural(scan.frames.length, 'frame')}
          </Text>
          {byZone(rows).map(([zone, zoneRows]) => (
            <Stack key={zone} space="extraSmall">
              <Text>
                <Muted>{zone}</Muted>
              </Text>
              {zoneRows.map(row => (
                <Layer
                  description={plural(frameIds(row).length, 'frame')}
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
          <Text>
            <Muted>
              A route is a frame name without its breakpoint suffix. Click one
              to see its frames.
            </Muted>
          </Text>
        </Stack>
      )}
    </div>
  );
}
