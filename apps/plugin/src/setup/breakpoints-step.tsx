import {
  type Breakpoint,
  sortBreakpoints,
  validateBreakpoints,
} from '@astrea/breakpoints-core';
import {
  Bold,
  Button,
  IconButton,
  IconTrash24,
  Muted,
  Stack,
  Text,
  Textbox,
  TextboxNumeric,
  VerticalSpace,
} from '@create-figma-plugin/ui';
// biome-ignore lint/correctness/noUnusedImports: create-figma-plugin builds JSX with the classic factory `h`
import {h} from 'preact';
import {framesPerBreakpoint, type StepProps} from './step-props';

const ROW = {
  alignItems: 'center',
  display: 'grid',
  gap: '8px',
  gridTemplateColumns: '1fr 1fr 88px 32px 32px',
};

/** Step 2: breakpoint names, frame-name suffixes and starting widths. */
export function BreakpointsStep({draft, setDraft, rows}: StepProps) {
  const errors = validateBreakpoints(draft.breakpoints);
  const counts = framesPerBreakpoint(rows);

  function update(id: string, patch: Partial<Breakpoint>) {
    setDraft({
      ...draft,
      breakpoints: draft.breakpoints.map(b =>
        b.id === id ? {...b, ...patch} : b,
      ),
    });
  }

  function remove(id: string) {
    setDraft({
      ...draft,
      breakpoints: draft.breakpoints.filter(b => b.id !== id),
    });
  }

  function add() {
    const widest = Math.max(0, ...draft.breakpoints.map(b => b.minWidth));
    const breakpoint: Breakpoint = {
      id: `bp-${Date.now()}`,
      name: 'New',
      suffix: 'New',
      minWidth: widest + 1,
    };
    setDraft({...draft, breakpoints: [...draft.breakpoints, breakpoint]});
  }

  return (
    <div>
      <Text>
        <Bold>Breakpoints</Bold>
      </Text>
      <VerticalSpace space="small" />
      <Text>
        <Muted>
          A device gets the widest breakpoint whose start width it reaches.
          Leave the suffix empty for frames named without one.
        </Muted>
      </Text>
      <VerticalSpace space="medium" />
      <div style={ROW}>
        <Text>
          <Muted>Name</Muted>
        </Text>
        <Text>
          <Muted>Name ends with “ - ”</Muted>
        </Text>
        <Text>
          <Muted>From</Muted>
        </Text>
        <Text>
          <Muted>Frames</Muted>
        </Text>
        <span />
      </div>
      <VerticalSpace space="extraSmall" />
      <Stack space="extraSmall">
        {sortBreakpoints(draft.breakpoints).map(breakpoint => (
          <div key={breakpoint.id}>
            <div style={ROW}>
              <Textbox
                onValueInput={name => update(breakpoint.id, {name})}
                value={breakpoint.name}
              />
              <Textbox
                onValueInput={suffix =>
                  update(breakpoint.id, {suffix: suffix.trim() || null})
                }
                placeholder="(no suffix)"
                value={breakpoint.suffix ?? ''}
              />
              <TextboxNumeric
                integer
                minimum={0}
                onNumericValueInput={width =>
                  update(breakpoint.id, {minWidth: width ?? Number.NaN})
                }
                suffix="px"
                value={String(breakpoint.minWidth)}
              />
              <Text align="center">{counts.get(breakpoint.id) ?? 0}</Text>
              <IconButton
                disabled={draft.breakpoints.length === 1}
                onClick={() => remove(breakpoint.id)}
              >
                <IconTrash24 />
              </IconButton>
            </div>
            {errors[breakpoint.id] ? (
              <Text>
                <span style={{color: 'var(--figma-color-text-danger)'}}>
                  {errors[breakpoint.id]}
                </span>
              </Text>
            ) : null}
          </div>
        ))}
      </Stack>
      <VerticalSpace space="medium" />
      <Button onClick={add} secondary>
        Add breakpoint
      </Button>
    </div>
  );
}
