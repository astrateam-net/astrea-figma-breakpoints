import {
  buildRouteTable,
  type Settings,
  validateBreakpoints,
} from '@astrea/breakpoints-core';
import {
  Bold,
  Button,
  Container,
  LoadingIndicator,
  Muted,
  render,
  Text,
  VerticalSpace,
} from '@create-figma-plugin/ui';
import {emit, on} from '@create-figma-plugin/utilities';
// biome-ignore lint/correctness/noUnusedImports: create-figma-plugin builds JSX with the classic factory `h`
import {h} from 'preact';
import {useEffect, useMemo, useState} from 'preact/hooks';
import {BreakpointsStep} from './setup/breakpoints-step';
import {DevicesStep} from './setup/devices-step';
import {RoutesStep} from './setup/routes-step';
import {ScanStep} from './setup/scan-step';
import type {StepProps} from './setup/step-props';
import {ThemesStep} from './setup/themes-step';
import type {
  PluginState,
  ReadyHandler,
  SaveHandler,
  StateHandler,
} from './types';

const STEPS = [
  {title: 'Scan', view: ScanStep},
  {title: 'Breakpoints', view: BreakpointsStep},
  {title: 'Devices', view: DevicesStep},
  {title: 'Themes', view: ThemesStep},
  {title: 'Routes', view: RoutesStep},
];

/** Fills in the theme guessed by the scan when none is chosen yet. */
function initialDraft(state: PluginState): Settings {
  const {settings, scan} = state;
  if (settings.theme.collectionKey || !scan.themeKey) return settings;
  const collection = scan.collections.find(c => c.key === scan.themeKey);
  return {
    ...settings,
    theme: {
      collectionKey: scan.themeKey,
      collectionName: collection?.name ?? null,
      modeNames: collection?.modes.slice(0, 1) ?? [],
    },
  };
}

function stepError(index: number, state: PluginState, draft: Settings) {
  if (index === 0 && state.scan.frames.length === 0) return 'No frames';
  if (index === 1 && Object.keys(validateBreakpoints(draft.breakpoints)).length)
    return 'Fix the breakpoints';
  if (index === 2 && !draft.devices.some(d => d.enabled)) {
    return 'Check at least one device';
  }
  return null;
}

function Setup({state, onSaved}: {state: PluginState; onSaved: () => void}) {
  const [draft, setDraft] = useState<Settings>(() => initialDraft(state));
  const [step, setStep] = useState(0);
  const rows = useMemo(
    () =>
      buildRouteTable(
        state.scan.frames,
        draft.breakpoints,
        draft.overrides,
        draft.theme.collectionKey,
      ),
    [state.scan.frames, draft],
  );

  const current = STEPS[step] ?? STEPS[0];
  if (!current) return null;
  const View = current.view;
  const props: StepProps = {state, draft, setDraft, rows};
  const error = stepError(step, state, draft);
  const last = step === STEPS.length - 1;

  function finish() {
    emit<SaveHandler>('SAVE', {...draft, pageId: state.scan.pageId});
    onSaved();
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
      <div style={{flex: 1, overflowY: 'auto'}}>
        <Container space="medium">
          <VerticalSpace space="medium" />
          <Text>
            <Muted>
              Setup · step {step + 1} of {STEPS.length}
            </Muted>
          </Text>
          <VerticalSpace space="medium" />
          <View {...props} />
          <VerticalSpace space="large" />
        </Container>
      </div>
      <div style={{borderTop: '1px solid var(--figma-color-border)'}}>
        <Container space="medium">
          <VerticalSpace space="small" />
          <div style={{display: 'flex', gap: '8px'}}>
            <div style={{flex: 1}}>
              {step > 0 ? (
                <Button onClick={() => setStep(step - 1)} secondary>
                  Back
                </Button>
              ) : null}
            </div>
            <Button
              disabled={error !== null}
              onClick={() => (last ? finish() : setStep(step + 1))}
            >
              {last ? 'Finish' : `Next: ${STEPS[step + 1]?.title ?? ''}`}
            </Button>
          </div>
          <VerticalSpace space="small" />
        </Container>
      </div>
    </div>
  );
}

function Saved({onEdit}: {onEdit: () => void}) {
  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>
        <Bold>Setup saved in this file</Bold>
      </Text>
      <VerticalSpace space="small" />
      <Text>
        <Muted>
          Everyone who opens this file gets the same settings. Building the
          check page comes next.
        </Muted>
      </Text>
      <VerticalSpace space="large" />
      <Button onClick={onEdit} secondary>
        Edit setup
      </Button>
    </Container>
  );
}

function Plugin() {
  const [state, setState] = useState<PluginState | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const off = on<StateHandler>('STATE', setState);
    emit<ReadyHandler>('READY');
    return off;
  }, []);

  if (!state) return <LoadingIndicator />;
  if (state.firstRun || editing) {
    // Remount on a new scan so the draft follows the page that was scanned.
    return (
      <Setup
        key={state.scan.pageId}
        onSaved={() => setEditing(false)}
        state={state}
      />
    );
  }
  return <Saved onEdit={() => setEditing(true)} />;
}

export default render(Plugin);
