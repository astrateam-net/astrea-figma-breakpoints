export type DeviceGroup = 'phone' | 'tablet' | 'computer';

export interface Device {
  id: string;
  name: string;
  group: DeviceGroup;
  width: number;
  height: number;
  enabled: boolean;
  /** Overrides the breakpoint picked by width; null = by width. */
  breakpointId: string | null;
  /** Added by the user, not from the catalog. */
  custom?: boolean;
}

function device(
  id: string,
  name: string,
  group: DeviceGroup,
  width: number,
  height: number,
  enabled = true,
): Device {
  return {id, name, group, width, height, enabled, breakpointId: null};
}

/** Figma frame presets (2026-10). Enabled = the AstraMotors default set. */
export const DEVICE_CATALOG: Device[] = [
  device('small-phone', 'Small phone', 'phone', 320, 568, false),
  device('iphone-16', 'iPhone 16', 'phone', 393, 852),
  device('iphone-18-pro', 'iPhone 18 Pro', 'phone', 402, 874),
  device('android-compact', 'Android Compact', 'phone', 412, 917),
  device('iphone-air', 'iPhone Air', 'phone', 420, 912),
  device('iphone-18-pro-max', 'iPhone 18 Pro Max', 'phone', 440, 956),
  device('iphone-duo-closed', 'iPhone Duo Closed', 'phone', 466, 678),
  device('ipad-mini', 'iPad mini', 'tablet', 744, 1133),
  device('ipad-pro-11', 'iPad Pro 11″', 'tablet', 834, 1194),
  device('ipad-pro-13', 'iPad Pro 12.9″', 'tablet', 1024, 1366),
  device('android-expanded', 'Android Expanded', 'tablet', 1280, 800, false),
  device('macbook-air', 'MacBook Air', 'computer', 1280, 832),
  device('desktop', 'Desktop', 'computer', 1440, 1024),
  device('macbook-pro-14', 'MacBook Pro 14″', 'computer', 1512, 982),
  device('macbook-pro-16', 'MacBook Pro 16″', 'computer', 1728, 1117, false),
  device('desktop-fhd', 'Desktop Full HD', 'computer', 1920, 1080, false),
];
