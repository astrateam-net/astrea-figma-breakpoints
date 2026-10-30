import {
  breakpointForDevice,
  type Device,
  type DeviceGroup,
} from '@astrea/breakpoints-core';
import {
  Bold,
  Button,
  Checkbox,
  Disclosure,
  Muted,
  Stack,
  Text,
  Textbox,
  TextboxNumeric,
  VerticalSpace,
} from '@create-figma-plugin/ui';
// biome-ignore lint/correctness/noUnusedImports: create-figma-plugin builds JSX with the classic factory `h`
import {h} from 'preact';
import {useState} from 'preact/hooks';
import type {StepProps} from './step-props';

const GROUPS: Array<[DeviceGroup, string]> = [
  ['phone', 'Phones'],
  ['tablet', 'Tablets'],
  ['computer', 'Computers'],
];

/** Step 3: which devices get a copy, and which breakpoint each one shows. */
export function DevicesStep({draft, setDraft}: StepProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({phone: true});
  const [name, setName] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  function toggle(id: string, enabled: boolean) {
    setDraft({
      ...draft,
      devices: draft.devices.map(d => (d.id === id ? {...d, enabled} : d)),
    });
  }

  const customWidth = Number(width);
  const customHeight = Number(height);
  const canAdd =
    name.trim() !== '' &&
    Number.isInteger(customWidth) &&
    customWidth > 0 &&
    Number.isInteger(customHeight) &&
    customHeight > 0;

  function addCustom() {
    const group: DeviceGroup =
      customWidth < 600 ? 'phone' : customWidth < 1280 ? 'tablet' : 'computer';
    const device: Device = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      group,
      width: customWidth,
      height: customHeight,
      enabled: true,
      breakpointId: null,
      custom: true,
    };
    setDraft({...draft, devices: [...draft.devices, device]});
    setOpen({...open, [group]: true});
    setName('');
    setWidth('');
    setHeight('');
  }

  return (
    <div>
      <Text>
        <Bold>Devices to check</Bold>
      </Text>
      <VerticalSpace space="small" />
      <Text>
        <Muted>Each checked device gets a copy of the matching frame.</Muted>
      </Text>
      <VerticalSpace space="medium" />
      {GROUPS.map(([group, title]) => {
        const devices = draft.devices
          .filter(d => d.group === group)
          .sort((a, b) => a.width - b.width);
        const checked = devices.filter(d => d.enabled).length;
        return (
          <Disclosure
            key={group}
            onClick={() => setOpen({...open, [group]: !open[group]})}
            open={open[group] === true}
            title={`${title} (${checked} of ${devices.length})`}
          >
            <Stack space="small">
              {devices.map(device => (
                <Checkbox
                  key={device.id}
                  onValueChange={value => toggle(device.id, value)}
                  value={device.enabled}
                >
                  <Text>
                    {device.name}{' '}
                    <Muted>
                      {device.width} × {device.height} →{' '}
                      {breakpointForDevice(device, draft.breakpoints)?.name ??
                        '—'}
                    </Muted>
                  </Text>
                </Checkbox>
              ))}
            </Stack>
          </Disclosure>
        );
      })}
      <VerticalSpace space="medium" />
      <Text>
        <Muted>Custom size</Muted>
      </Text>
      <VerticalSpace space="extraSmall" />
      <div
        style={{
          display: 'grid',
          gap: '8px',
          gridTemplateColumns: '1fr 72px 72px auto',
        }}
      >
        <Textbox onValueInput={setName} placeholder="Name" value={name} />
        <TextboxNumeric
          integer
          minimum={1}
          onValueInput={setWidth}
          placeholder="W"
          value={width}
        />
        <TextboxNumeric
          integer
          minimum={1}
          onValueInput={setHeight}
          placeholder="H"
          value={height}
        />
        <Button disabled={!canAdd} onClick={addCustom} secondary>
          Add
        </Button>
      </div>
    </div>
  );
}
