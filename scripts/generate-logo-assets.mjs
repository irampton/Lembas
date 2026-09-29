import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'public', 'assets');
const transparentLogo = await readFile(resolve(assets, 'logo_transparent.svg'));
const borderedLogo = await readFile(resolve(assets, 'logo_border.svg'));

const sizes = new Map([
  ['favicon-64.png', 64],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]);

await Promise.all([...sizes].map(async ([name, width]) => {
  const png = new Resvg(transparentLogo, { fitTo: { mode: 'width', value: width } }).render().asPng();
  await writeFile(resolve(assets, name), png);
}));

const appleTouchIcon = new Resvg(borderedLogo, { fitTo: { mode: 'width', value: 180 } }).render().asPng();
await writeFile(resolve(assets, 'apple-touch-icon-180.png'), appleTouchIcon);

console.log(`Generated ${sizes.size} transparent browser icons and the bordered Apple touch icon`);
