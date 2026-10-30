import {
  Bold,
  Checkbox,
  Dropdown,
  Muted,
  Stack,
  Text,
  VerticalSpace,
} from '@create-figma-plugin/ui';
// biome-ignore lint/correctness/noUnusedImports: create-figma-plugin builds JSX with the classic factory `h`
import {h} from 'preact';
import type {StepProps} from './step-props';

/** Step 4: the variable collection that holds the theme, and its modes. */
export function ThemesStep({state, draft, setDraft}: StepProps) {
  const {collections, frames} = state.scan;
  const key = draft.theme.collectionKey;
  const collection = collections.find(c => c.key === key);

  if (collections.length === 0) {
    return (
      <div>
        <Text>
          <Bold>Themes</Bold>
        </Text>
        <VerticalSpace space="medium" />
        <Text>
          <Muted>
            No variable modes are set on these frames, so every copy uses the
            page's default modes.
          </Muted>
        </Text>
      </div>
    );
  }

  function choose(nextKey: string) {
    const next = collections.find(c => c.key === nextKey);
    setDraft({
      ...draft,
      theme: {
        collectionKey: nextKey,
        collectionName: next?.name ?? null,
        modeNames: next?.modes.slice(0, 1) ?? [],
      },
    });
  }

  function toggle(mode: string, on: boolean) {
    const modeNames = on
      ? [...draft.theme.modeNames, mode]
      : draft.theme.modeNames.filter(m => m !== mode);
    setDraft({...draft, theme: {...draft.theme, modeNames}});
  }

  const perMode = new Map<string, number>();
  let notSet = 0;
  for (const frame of frames) {
    const mode = key ? frame.modes[key] : undefined;
    if (mode) perMode.set(mode, (perMode.get(mode) ?? 0) + 1);
    else notSet++;
  }

  return (
    <div>
      <Text>
        <Bold>Themes</Bold>
      </Text>
      <VerticalSpace space="small" />
      <Text>
        <Muted>
          A frame's theme is its mode in this collection. Checked modes get
          their own row of copies.
        </Muted>
      </Text>
      <VerticalSpace space="medium" />
      <Dropdown
        onValueChange={choose}
        options={collections.map(c => ({
          text: c.remote ? `${c.name} (library)` : c.name,
          value: c.key,
        }))}
        placeholder="Choose a collection"
        value={key}
      />
      <VerticalSpace space="medium" />
      {collection ? (
        <Stack space="small">
          {collection.modes.map(mode => (
            <Checkbox
              key={mode}
              onValueChange={on => toggle(mode, on)}
              value={draft.theme.modeNames.includes(mode)}
            >
              <Text>
                {mode} <Muted>{perMode.get(mode) ?? 0} frames</Muted>
              </Text>
            </Checkbox>
          ))}
          {notSet > 0 ? (
            <Text>
              <Muted>
                {notSet} frames have no mode set in this collection.
              </Muted>
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </div>
  );
}
