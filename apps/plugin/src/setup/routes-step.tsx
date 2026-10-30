import {type RouteCell, sortBreakpoints} from '@astrea/breakpoints-core';
import {
  Bold,
  Button,
  Muted,
  Text,
  VerticalSpace,
} from '@create-figma-plugin/ui';
import {emit} from '@create-figma-plugin/utilities';
// biome-ignore lint/correctness/noUnusedImports: create-figma-plugin builds JSX with the classic factory `h`
import {h} from 'preact';
import type {RevealHandler, ScanHandler} from '../types';
import type {StepProps} from './step-props';

const CELL = {
  borderTop: '1px solid var(--figma-color-border)',
  padding: '6px 4px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
};

const CELL_BUTTON = {
  background: 'none',
  border: 'none',
  color: 'var(--figma-color-text)',
  cursor: 'pointer',
  font: 'inherit',
  padding: '2px 6px',
};

/** "L D" for Light + Dark frames, "✓" without themes, "—" for none. */
function cellLabel(cell: RouteCell): string {
  if (cell.frames.length === 0) return '—';
  const themes = cell.frames.map(f => f.theme?.charAt(0) ?? '✓');
  return [...new Set(themes)].join(' ');
}

/** Step 5: which frame each route shows at each breakpoint. */
export function RoutesStep({state, draft, rows}: StepProps) {
  const breakpoints = sortBreakpoints(draft.breakpoints);

  return (
    <div>
      <div style={{alignItems: 'center', display: 'flex', gap: '8px'}}>
        <div style={{flex: 1}}>
          <Text>
            <Bold>Routes</Bold>
          </Text>
        </div>
        <Button
          onClick={() => emit<ScanHandler>('SCAN', state.scan.pageId)}
          secondary
        >
          Rescan
        </Button>
      </div>
      <VerticalSpace space="small" />
      <Text>
        <Muted>
          Letters are the themes found (L = Light, D = Dark). Click a cell to
          see its frames.
        </Muted>
      </Text>
      <VerticalSpace space="medium" />
      <div style={{overflowX: 'auto'}}>
        <table style={{borderCollapse: 'collapse', width: '100%'}}>
          <thead>
            <tr>
              <th />
              {breakpoints.map(b => (
                <th key={b.id} style={{...CELL, borderTop: 'none'}}>
                  <Text>
                    <Muted>{b.name}</Muted>
                  </Text>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key}>
                <td style={{...CELL, textAlign: 'left'}}>
                  <Text>{row.key}</Text>
                </td>
                {breakpoints.map(b => {
                  const cell = row.cells[b.id];
                  const ids = cell?.frames.map(f => f.id) ?? [];
                  return (
                    <td key={b.id} style={CELL}>
                      {cell && ids.length > 0 ? (
                        <button
                          onClick={() => emit<RevealHandler>('REVEAL', ids)}
                          style={CELL_BUTTON}
                          type="button"
                        >
                          {cellLabel(cell)}
                        </button>
                      ) : (
                        <Text>
                          <Muted>—</Muted>
                        </Text>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
