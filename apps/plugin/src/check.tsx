import {
  type BuildChange,
  FINDING_ORDER,
  type Finding,
  findingTitle,
  reportMarkdown,
} from '@astrea/breakpoints-core';
import {
  Bold,
  Button,
  Container,
  Disclosure,
  Link,
  Muted,
  Stack,
  Text,
  VerticalSpace,
} from '@create-figma-plugin/ui';
import {emit, on} from '@create-figma-plugin/utilities';
// biome-ignore lint/correctness/noUnusedImports: create-figma-plugin builds JSX with the classic factory `h`
import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import type {Progress} from './build';
import {CHECK_PAGE_NAME} from './constants';

/**
 * Copies text from the plugin window. The async Clipboard API is blocked in
 * Figma's plugin iframe, so this uses a hidden textarea and `copy`.
 */
function copyText(value: string): boolean {
  const area = document.createElement('textarea');
  area.value = value;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand('copy');
  area.remove();
  return copied;
}

import {plural} from './setup/step-props';
import type {
  BuildHandler,
  BuiltHandler,
  CancelHandler,
  PluginState,
  ProgressHandler,
  RevealHandler,
} from './types';

type Run =
  | {status: 'idle'}
  | {status: 'running'; progress: Progress | null}
  | {status: 'done'; copies: number; gaps: number}
  | {status: 'cancelled'}
  | {status: 'failed'; error: string};

const CHANGE_LABEL: Record<BuildChange['kind'], string> = {
  new: 'new',
  changed: 'changed',
  removed: 'removed',
};

function ProgressBar({progress}: {progress: Progress | null}) {
  const share =
    progress && progress.total > 0 ? progress.done / progress.total : 0;
  return (
    <div>
      <div
        style={{
          background: 'var(--figma-color-bg-secondary)',
          borderRadius: '2px',
          height: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: 'var(--figma-color-bg-brand)',
            height: '100%',
            transition: 'width 0.2s',
            width: `${Math.round(share * 100)}%`,
          }}
        />
      </div>
      <VerticalSpace space="small" />
      <Text>
        <Muted>
          {progress
            ? `${progress.label} · ${progress.done} of ${progress.total}`
            : 'Reading the screens…'}
        </Muted>
      </Text>
    </div>
  );
}

function findingText(finding: Finding): string {
  const where = [finding.route, finding.theme, finding.device]
    .filter(Boolean)
    .join(' · ');
  return finding.kind === 'gap'
    ? where
    : `${where} — ${finding.block}, ${finding.px} px`;
}

/** Problems found in the copies, grouped by kind; click selects the layer. */
function Report({findings, markdown}: {findings: Finding[]; markdown: string}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const copyButton = (
    <Button onClick={() => setCopied(copyText(markdown))} secondary>
      {copied ? 'Copied' : 'Copy report'}
    </Button>
  );
  if (findings.length === 0) {
    return (
      <Stack space="small">
        <Text>
          <Muted>No problems found in the copies.</Muted>
        </Text>
        <div>{copyButton}</div>
      </Stack>
    );
  }
  return (
    <div>
      {FINDING_ORDER.map(kind => {
        const items = findings.filter(f => f.kind === kind);
        if (items.length === 0) return null;
        return (
          <Disclosure
            key={kind}
            onClick={() => setOpen({...open, [kind]: !open[kind]})}
            open={open[kind] === true}
            title={`${findingTitle(kind)} (${items.length})`}
          >
            <Stack space="extraSmall">
              {items.map(finding => (
                <button
                  key={`${finding.nodeId}-${finding.kind}`}
                  onClick={() =>
                    emit<RevealHandler>('REVEAL', [finding.nodeId])
                  }
                  style={ROW_BUTTON}
                  type="button"
                >
                  {findingText(finding)}
                </button>
              ))}
            </Stack>
          </Disclosure>
        );
      })}
      <VerticalSpace space="small" />
      {copyButton}
    </div>
  );
}

const ROW_BUTTON = {
  background: 'none',
  border: 'none',
  color: 'var(--figma-color-text)',
  cursor: 'pointer',
  font: 'inherit',
  padding: '2px 0',
  textAlign: 'left',
};

/** The main screen: build or update the check page, with progress. */
export function Check({
  state,
  onEdit,
}: {
  state: PluginState;
  onEdit: () => void;
}) {
  const [run, setRun] = useState<Run>({status: 'idle'});
  const {settings, build} = state;

  useEffect(() => {
    const offProgress = on<ProgressHandler>('PROGRESS', progress =>
      setRun({status: 'running', progress}),
    );
    const offBuilt = on<BuiltHandler>('BUILT', result => {
      if (result.status === 'built') {
        setRun({status: 'done', copies: result.copies, gaps: result.gaps});
      } else if (result.status === 'cancelled') {
        setRun({status: 'cancelled'});
      } else {
        setRun({status: 'failed', error: result.error});
      }
    });
    return () => {
      offProgress();
      offBuilt();
    };
  }, []);

  function start(scope: 'all' | 'changed') {
    setRun({status: 'running', progress: null});
    emit<BuildHandler>('BUILD', scope);
  }

  const running = run.status === 'running';
  const devices = settings.devices.filter(d => d.enabled).length;
  const modes =
    settings.theme.collectionKey && settings.theme.modeNames.length > 0
      ? settings.theme.modeNames.join(' and ')
      : 'the default theme';
  const changes = build.changes;
  const upToDate = build.exists && changes.length === 0;

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>
        <Bold>Check</Bold>
      </Text>
      <VerticalSpace space="small" />
      <Text>
        <Muted>
          Page “{CHECK_PAGE_NAME}”: every route on {plural(devices, 'device')},
          in {modes}.
        </Muted>
      </Text>
      <VerticalSpace space="large" />

      {running ? (
        <Stack space="medium">
          <ProgressBar progress={run.progress} />
          <Button
            fullWidth
            onClick={() => emit<CancelHandler>('CANCEL')}
            secondary
          >
            Cancel
          </Button>
        </Stack>
      ) : !build.exists ? (
        <Button fullWidth onClick={() => start('all')}>
          Build
        </Button>
      ) : upToDate ? (
        <Stack space="small">
          <Button disabled fullWidth>
            Up to date
          </Button>
          <Text align="center">
            <Link href="#" onClick={() => start('all')}>
              Rebuild anyway
            </Link>
          </Text>
        </Stack>
      ) : (
        <Stack space="small">
          <Button fullWidth onClick={() => start('changed')}>
            Update · {plural(changes.length, 'change')}
          </Button>
          {changes.map(change => (
            <Text key={change.route}>
              {change.route} <Muted>{CHANGE_LABEL[change.kind]}</Muted>
            </Text>
          ))}
        </Stack>
      )}

      <VerticalSpace space="medium" />
      {run.status === 'done' ? (
        <Text>
          <Muted>
            Built {plural(run.copies, 'copy', 'copies')}
            {run.gaps > 0 ? ` · ${run.gaps} without a frame (grey)` : ''}
          </Muted>
        </Text>
      ) : null}
      {run.status === 'cancelled' ? (
        <Text>
          <Muted>Cancelled; the page is as it was.</Muted>
        </Text>
      ) : null}
      {run.status === 'failed' ? (
        <Text>
          <span style={{color: 'var(--figma-color-text-danger)'}}>
            {run.error}
          </span>
        </Text>
      ) : null}
      {build.exists ? (
        <div>
          <VerticalSpace space="large" />
          <Text>
            <Bold>Report</Bold>
          </Text>
          <VerticalSpace space="small" />
          <Report
            findings={build.findings}
            markdown={reportMarkdown(build.findings, {
              file: state.fileName,
              page: CHECK_PAGE_NAME,
              devices: settings.devices
                .filter(d => d.enabled)
                .map(d => `${d.name} ${d.width}×${d.height}`),
              themes: settings.theme.modeNames,
            })}
          />
        </div>
      ) : null}
      <VerticalSpace space="large" />
      <Button disabled={running} onClick={onEdit} secondary>
        Edit setup
      </Button>
    </Container>
  );
}
