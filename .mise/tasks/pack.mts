#!/usr/bin/env bun
//MISE description="Zip the built plugin (manifest.json + build/) into dist/ for Import plugin from manifest"
//MISE depends=["build"]
import {mkdir, readdir, readFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {zipSync} from 'fflate';

const plugin = 'apps/plugin';
const {version} = JSON.parse(
  await readFile(join(plugin, 'package.json'), 'utf8'),
) as {version: string};

async function collect(dir: string): Promise<string[]> {
  const entries = await readdir(dir, {withFileTypes: true});
  const nested = await Promise.all(
    entries.map(entry =>
      entry.isDirectory()
        ? collect(join(dir, entry.name))
        : [join(dir, entry.name)],
    ),
  );
  return nested.flat();
}

const files = [
  join(plugin, 'manifest.json'),
  ...(await collect(join(plugin, 'build'))),
];
const archive: Record<string, Uint8Array> = {};
for (const file of files) {
  const name = relative(plugin, file).replaceAll('\\', '/');
  archive[`astrea-figma-breakpoints/${name}`] = await readFile(file);
}

await mkdir('dist', {recursive: true});
const out = `dist/astrea-figma-breakpoints-${version}.zip`;
await Bun.write(out, zipSync(archive));
console.log(`${out} (${files.length} files)`);
