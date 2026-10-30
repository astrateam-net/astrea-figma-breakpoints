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
import {CHECK_PAGE_NAME} from './build';
import {BreakpointsStep} from './setup/breakpoints-step';
import {DevicesStep} from './setup/devices-step';
import {RoutesStep} from './setup/routes-step';
import {ScanStep} from './setup/scan-step';
import {plural, type StepProps} from './setup/step-props';
import {ThemesStep} from './setup/themes-step';
import type {
  BuildHandler,
  BuiltHandler,
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

type BuildState =
  | {status: 'idle'}
  | {status: 'building'}
  | {status: 'done'; copies: number; gaps: number}
  | {status: 'failed'; error: string};

function Check({state, onEdit}: {state: PluginState; onEdit: () => void}) {
  const [build, setBuild] = useState<BuildState>({status: 'idle'});
  const {settings, scan} = state;

  useEffect(
    () =>
      on<BuiltHandler>('BUILT', result =>
        setBuild(
          'error' in result
            ? {status: 'failed', error: result.error}
            : {status: 'done', ...result},
        ),
      ),
    [],
  );

  const rows = buildRouteTable(
    scan.frames,
    settings.breakpoints,
    settings.overrides,
    settings.theme.collectionKey,
  );
  const devices = settings.devices.filter(d => d.enabled).length;
  const modes =
    settings.theme.collectionKey && settings.theme.modeNames.length > 0
      ? settings.theme.modeNames.join(' and ')
      : 'the default theme';

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>
        <Bold>Check</Bold>
      </Text>
      <VerticalSpace space="small" />
      <Text>
        <Muted>
          Builds the page “{CHECK_PAGE_NAME}”: {plural(rows.length, 'route')} on{' '}
          {plural(devices, 'device')}, in {modes}. The page is rebuilt as a
          whole; anything else on it stays.
        </Muted>
      </Text>
      <VerticalSpace space="large" />
      <Button
        fullWidth
        loading={build.status === 'building'}
        onClick={() => {
          setBuild({status: 'building'});
          emit<BuildHandler>('BUILD');
        }}
      >
        Build
      </Button>
      <VerticalSpace space="medium" />
      {build.status === 'done' ? (
        <Text>
          Built {plural(build.copies, 'copy', 'copies')}
          {build.gaps > 0 ? (
            <Muted> · {build.gaps} without a frame (grey placeholders)</Muted>
          ) : null}
        </Text>
      ) : null}
      {build.status === 'failed' ? (
        <Text>
          <span style={{color: 'var(--figma-color-text-danger)'}}>
            {build.error}
          </span>
        </Text>
      ) : null}
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
  return <Check onEdit={() => setEditing(true)} state={state} />;
}

export default render(Plugin);
