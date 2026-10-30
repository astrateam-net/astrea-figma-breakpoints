import {describe, expect, test} from 'bun:test';
import {
  type BlockBox,
  compareFrames,
  type FrameBox,
  reportMarkdown,
} from './report';

const where = {route: 'Home', theme: 'Light', device: 'MacBook Pro 14″'};

function block(
  name: string,
  x: number,
  width: number,
  scrolls = false,
): BlockBox {
  return {id: `${name}-id`, name, x, width, scrolls};
}

const original: FrameBox = {
  width: 1280,
  blocks: [
    block('Header', 0, 1280),
    block('Hero', 40, 1200),
    block('Careers', 40, 1400, true),
    block('Aside', 0, 300),
  ],
};

describe('compareFrames', () => {
  test('a correct copy has no findings', () => {
    const copy: FrameBox = {
      width: 1512,
      blocks: [
        block('Header', 0, 1512),
        block('Hero', 156, 1200),
        block('Careers', 156, 1400, true),
        block('Aside', 0, 300),
      ],
    };
    expect(compareFrames(original, copy, where)).toEqual([]);
  });

  test('a pinned block drifts off centre, a full-width one does not stretch', () => {
    const copy: FrameBox = {
      width: 1512,
      blocks: [
        block('Header', 0, 1280),
        block('Hero', 40, 1200),
        block('Careers', 40, 1400, true),
        block('Aside', 0, 300),
      ],
    };
    expect(compareFrames(original, copy, where)).toEqual([
      {
        ...where,
        kind: 'not-stretched',
        block: 'Header',
        nodeId: 'Header-id',
        sourceNodeId: 'Header-id',
        px: 232,
      },
      {
        ...where,
        kind: 'off-center',
        block: 'Hero',
        nodeId: 'Hero-id',
        sourceNodeId: 'Hero-id',
        px: 116,
      },
    ]);
  });

  test('a block wider than the screen overflows; a scrolling one is fine', () => {
    const copy: FrameBox = {
      width: 1024,
      blocks: [
        block('Header', 0, 1024),
        block('Hero', 40, 1200),
        block('Careers', 40, 1400, true),
        block('Aside', 0, 300),
      ],
    };
    expect(compareFrames(original, copy, where)).toEqual([
      {
        ...where,
        kind: 'overflow',
        block: 'Hero',
        nodeId: 'Hero-id',
        sourceNodeId: 'Hero-id',
        px: 216,
      },
    ]);
  });

  test('sticking out as much as the original does is not an overflow', () => {
    const wide: FrameBox = {width: 1280, blocks: [block('Strip', 40, 1400)]};
    const copy: FrameBox = {width: 1024, blocks: [block('Strip', 40, 1400)]};
    expect(compareFrames(wide, copy, where)).toEqual([
      {
        ...where,
        kind: 'overflow',
        block: 'Strip',
        nodeId: 'Strip-id',
        sourceNodeId: 'Strip-id',
        px: 416,
      },
    ]);
    const same: FrameBox = {width: 1280, blocks: [block('Strip', 40, 1400)]};
    expect(compareFrames(wide, same, where)).toEqual([]);
  });

  test('extra blocks in the copy are ignored', () => {
    const copy: FrameBox = {
      width: 1280,
      blocks: [...original.blocks, block('X', 0, 9999)],
    };
    expect(compareFrames(original, copy, where)).toEqual([]);
  });
});

describe('reportMarkdown', () => {
  test('groups problems and names the node to fix', () => {
    const md = reportMarkdown(
      [
        {
          ...where,
          kind: 'gap',
          block: '',
          nodeId: '9:9',
          sourceNodeId: null,
          px: 0,
        },
        {
          ...where,
          kind: 'overflow',
          block: 'Promotions',
          nodeId: '5:5',
          sourceNodeId: '1:1',
          px: 24,
        },
      ],
      {
        file: 'Site',
        page: 'Responsive QA',
        devices: ['iPhone 16'],
        themes: ['Light'],
      },
    );
    expect(md).toContain('# Responsive check: Site');
    expect(md.indexOf('## Wider than the screen (1)')).toBeLessThan(
      md.indexOf('## No frame for this width (1)'),
    );
    expect(md).toContain(
      '- Home · Light · MacBook Pro 14″: "Promotions" 24 px (original 1:1, copy 5:5)',
    );
  });
});
