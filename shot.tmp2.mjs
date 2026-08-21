import { chromium } from '@playwright/test';
const sp = process.argv[2];
const ids = process.argv.slice(3);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:30010/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.getByText('Components', { exact: true }).first().click();
await page.waitForTimeout(1500);
for (const id of ids) {
  const el = page.locator(`#${id}`);
  if ((await el.count()) === 0) { console.log('missing', id); continue; }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await el.screenshot({ path: `${sp}/gallery-${id}.png` });
  console.log('shot', id);
}
await browser.close();
