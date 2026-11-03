// run with `node --test scripts/` after `npm run build`. reads the built art page in dist/
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const page = new URL('../dist/art/index.html', import.meta.url);

// Safari on an iPhone 12 crashed on load ("A problem repeatedly occurred") while all 291 covers ran
// the slide-enter animation at once, and loaded with Reduce Motion on. the stagger is capped at
// stage 12 in src/pages/art.astro, hence covers past the twelfth gain nothing from animating
test('the art page animates at most twelve covers', { skip: !existsSync(page) && 'dist/ is not built' }, () => {
  const animated = readFileSync(page, 'utf8').match(/class="slide-enter[ "]/g) ?? [];
  assert.ok(animated.length <= 12, `${animated.length} covers run slide-enter`);
});
