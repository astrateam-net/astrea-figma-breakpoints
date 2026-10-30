/**
 * Frame names follow `Route — State - Breakpoint`:
 * `Home`, `Home - Mobile`, `Account / Garage — Empty - Tablet L`.
 * The breakpoint suffix is optional (none = the base breakpoint), and so is
 * the state. Hierarchy lives in the route (`Services / Service`).
 */
export interface FrameName {
  route: string;
  state: string | null;
  /** Breakpoint suffix as written, or null for the base breakpoint. */
  breakpoint: string | null;
}

/** Suffixes of the AstraMotors website; a setting, not a rule of the plugin. */
export const DEFAULT_SUFFIXES = ["Tablet L", "Tablet", "Mobile", "Wide"];

const STATE_SEPARATOR = " — ";
const BREAKPOINT_SEPARATOR = " - ";

export function parseFrameName(
  name: string,
  suffixes: readonly string[] = DEFAULT_SUFFIXES,
): FrameName {
  let rest = name.trim();
  let breakpoint: string | null = null;

  // Longest first, so `Tablet L` wins over `Tablet`.
  const bySize = [...suffixes].sort((a, b) => b.length - a.length);
  for (const suffix of bySize) {
    if (rest.endsWith(BREAKPOINT_SEPARATOR + suffix)) {
      breakpoint = suffix;
      rest = rest.slice(0, -(BREAKPOINT_SEPARATOR + suffix).length);
      break;
    }
  }

  const stateAt = rest.indexOf(STATE_SEPARATOR);
  if (stateAt === -1) {
    return { route: rest, state: null, breakpoint };
  }
  return {
    route: rest.slice(0, stateAt),
    state: rest.slice(stateAt + STATE_SEPARATOR.length),
    breakpoint,
  };
}

export function formatFrameName({
  route,
  state,
  breakpoint,
}: FrameName): string {
  let name = route;
  if (state) name += STATE_SEPARATOR + state;
  if (breakpoint) name += BREAKPOINT_SEPARATOR + breakpoint;
  return name;
}
