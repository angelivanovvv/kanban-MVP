import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/'); });
test('initial board has five fixed columns, sample cards, and no runtime errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.reload();
  await expect(page.getByRole('region')).toHaveCount(5);
  await expect(page.getByRole('article')).toHaveCount(10);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good work starts here.');
  expect(errors).toEqual([]);
});
test('add to each column, then delete; retain title and multiline details', async ({ page }) => {
  for (const name of ['Backlog', 'To do', 'In progress', 'In review', 'Done']) {
    await page.getByRole('button', { name: `Add card to ${name}`, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Create card' })).toBeDisabled();
    await page.getByLabel('Title (required)').fill(`  New ${name}  `);
    await page.getByLabel('Details (optional)').fill('First line\nSecond line');
    await page.getByRole('button', { name: 'Create card' }).click();
    const card = page.getByRole('region', { name: `${name} column`, exact: true }).getByRole('article').filter({ hasText: `New ${name}` });
    await expect(card).toContainText('First line\nSecond line');
    await card.hover();
    await card.getByRole('button', { name: `Delete New ${name}`, exact: true }).click();
    await expect(card).toHaveCount(0);
  }
  await expect(page.getByRole('article')).toHaveCount(10);
});
test('rename each column, reject blanks, cancel edits', async ({ page }) => {
  for (const name of ['Backlog', 'To do', 'In progress', 'In review', 'Done']) {
    await page.getByRole('button', { name: `Rename ${name}`, exact: true }).click();
    await page.getByRole('textbox', { name: 'Column name' }).fill('  ');
    await expect(page.getByRole('button', { name: 'Save column name' })).toBeDisabled();
    await page.getByRole('textbox', { name: 'Column name' }).fill(`  ${name} renamed  `);
    await page.getByRole('button', { name: 'Save column name' }).click();
    await expect(page.getByRole('region', { name: `${name} renamed column`, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Rename Backlog renamed', exact: true }).click();
  await page.getByRole('textbox', { name: 'Column name' }).fill('Discard');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Rename Backlog renamed', exact: true })).toBeVisible();
  await expect(page.getByRole('region')).toHaveCount(5);
});
test('dialog traps focus, Escape and Cancel discard drafts', async ({ page }) => {
  await page.getByRole('button', { name: 'New card', exact: true }).click();
  await expect(page.getByLabel('Title (required)')).toBeFocused();
  await page.getByLabel('Title (required)').fill('Discard this');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New card', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'New card', exact: true }).click();
  await expect(page.getByLabel('Title (required)')).toHaveValue('');
  for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('dialog'))).toBe(true); }
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(10);
});
test('keyboard moves into an empty column and can cancel a drag', async ({ page }) => {
  const review = page.getByTestId('column-review');
  await review.getByRole('article').hover();
  await review.getByRole('button', { name: 'Delete Review the landing page' }).click();
  await expect(review).toContainText('A little room');
  const handle = page.getByRole('button', { name: 'Move Explore the big picture', exact: true });
  await handle.focus(); await page.keyboard.press('Space');
  for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150); }
  await page.keyboard.press('Space');
  await expect(review.getByTestId('card-c1')).toBeVisible();
  await review.getByRole('button', { name: 'Move Explore the big picture', exact: true }).focus();
  await page.keyboard.press('Space'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Escape');
  await expect(review.getByTestId('card-c1')).toBeVisible();
});
test('pointer moves between columns and dropping outside cancels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Touch is checked separately.');
  const handle = await page.getByRole('button', { name: 'Move Explore the big picture', exact: true }).boundingBox();
  const target = await page.getByTestId('column-todo').boundingBox();
  await page.mouse.move(handle!.x + 12, handle!.y + 12); await page.mouse.down();
  await page.mouse.move(target!.x + target!.width / 2, target!.y + 200, { steps: 15 }); await page.mouse.up();
  await expect(page.getByTestId('column-todo').getByTestId('card-c1')).toBeVisible();
  const next = await page.getByRole('button', { name: 'Move Explore the big picture', exact: true }).boundingBox();
  await page.mouse.move(next!.x + 12, next!.y + 12); await page.mouse.down(); await page.mouse.move(700, 110, { steps: 15 }); await page.mouse.up();
  await expect(page.getByTestId('column-todo').getByTestId('card-c1')).toBeVisible();
});
test('reload restores sample data and column names', async ({ page }) => {
  await page.getByRole('button', { name: 'Rename Backlog', exact: true }).click();
  await page.getByRole('textbox', { name: 'Column name' }).fill('Temporary'); await page.keyboard.press('Enter');
  await page.getByTestId('card-c1').hover(); await page.getByRole('button', { name: 'Delete Explore the big picture' }).click();
  await page.reload(); await expect(page.getByRole('button', { name: 'Rename Backlog', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(10);
});
test('layout confines horizontal scrolling to board and handles long content', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'New card', exact: true }).click();
  await page.getByLabel('Title (required)').fill('A'.repeat(160));
  await page.getByLabel('Details (optional)').fill('B'.repeat(500));
  await page.getByRole('button', { name: 'Create card' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-board.png`, fullPage: true });
});

test('touch drag moves a card into the next column', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touch scenario uses a mobile viewport.');
  const handle = await page.getByRole('button', { name: 'Move Explore the big picture', exact: true }).boundingBox();
  const target = await page.getByTestId('column-todo').boundingBox();
  const cdp = await context.newCDPSession(page);
  const start = { x: handle!.x + 16, y: handle!.y + 16 };
  const end = { x: Math.min(target!.x + 30, 365), y: start.y + 60 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  for (let step = 1; step <= 12; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * step / 12, y: start.y + (end.y - start.y) * step / 12 }] });
    await page.waitForTimeout(35);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByTestId('column-todo').getByTestId('card-c1')).toBeVisible();
});

test('capture the initial board and card dialog', async ({ page }, testInfo) => {
  await page.screenshot({ path: `test-results/${testInfo.project.name}-initial.png`, fullPage: true });
  await page.getByRole('button', { name: 'New card', exact: true }).click();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-dialog.png`, fullPage: true });
});

test('keyboard reorders cards up and down in every column', async ({ page }) => {
  for (const name of ['Backlog', 'To do', 'In progress', 'In review', 'Done']) {
    const column = page.getByRole('region', { name: `${name} column`, exact: true });
    if (await column.getByRole('article').count() === 1) {
      await column.getByRole('button', { name: `Add card to ${name}`, exact: true }).click();
      await page.getByLabel('Title (required)').fill('Second review card');
      await page.getByRole('button', { name: 'Create card' }).click();
    }
    const titles = await column.locator('h3').allTextContents();
    const handle = column.getByRole('button', { name: `Move ${titles[0]}`, exact: true });
    await handle.focus(); await page.keyboard.press('Space');
    await expect(page.locator('.card-overlay')).toBeVisible();
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150); await page.keyboard.press('Space');
    await expect(page.locator('.card-overlay')).toHaveCount(0);
    await expect(column.locator('h3').nth(0)).toHaveText(titles[1]);
    await expect(column.locator('h3').nth(1)).toHaveText(titles[0]);
    await handle.focus(); await page.keyboard.press('Space');
    await expect(page.locator('.card-overlay')).toBeVisible();
    await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150); await page.keyboard.press('Space');
    await expect(page.locator('.card-overlay')).toHaveCount(0);
    await expect(column.locator('h3')).toHaveText(titles);
  }
});

test('pointer reorders within every column in both directions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Touch scenario follows.');
  for (const name of ['Backlog', 'To do', 'In progress', 'In review', 'Done']) {
    const column = page.getByRole('region', { name: `${name} column`, exact: true });
    if (await column.getByRole('article').count() === 1) {
      await column.getByRole('button', { name: `Add card to ${name}`, exact: true }).click();
      await page.getByLabel('Title (required)').fill('Second review card');
      await page.getByRole('button', { name: 'Create card' }).click();
    }
    const titles = await column.locator('h3').allTextContents();
    for (const targetIndex of [1, 0]) {
      const handle = await column.getByRole('button', { name: `Move ${titles[0]}`, exact: true }).boundingBox();
      const target = await column.getByRole('article').nth(targetIndex).boundingBox();
      await page.mouse.move(handle!.x + 12, handle!.y + 12); await page.mouse.down();
      await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 15 }); await page.mouse.up();
      await expect(page.locator('.card-overlay')).toHaveCount(0);
      await expect(column.locator('h3').nth(targetIndex)).toHaveText(titles[0]);
    }
    await expect(column.locator('h3')).toHaveText(titles);
  }
});

test('touch reorders a card downward within its column', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Requires touch viewport.');
  const column = page.getByTestId('column-backlog');
  await page.evaluate(() => window.scrollTo(0, 200));
  const handle = await column.getByRole('button', { name: 'Move Explore the big picture', exact: true }).boundingBox();
  const target = await column.getByTestId('card-c3').boundingBox();
  const cdp = await context.newCDPSession(page);
  const start = { x: handle!.x + 16, y: handle!.y + 16 };
  const end = { x: target!.x + target!.width / 2, y: target!.y + target!.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  for (let step = 1; step <= 12; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * step / 12, y: start.y + (end.y - start.y) * step / 12 }] });
    await page.waitForTimeout(35);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(column.locator('h3')).toHaveText(['Map the customer journey', 'Gather early feedback', 'Explore the big picture']);
});


test('picking up and dropping in place or cancelling keeps the order', async ({ page }) => {
  const column = page.getByTestId('column-backlog');
  const titles = await column.locator('h3').allTextContents();
  const handle = column.getByRole('button', { name: 'Move Explore the big picture', exact: true });
  await handle.focus(); await page.keyboard.press('Space'); await page.keyboard.press('Space');
  await expect(column.locator('h3')).toHaveText(titles);
  await handle.focus(); await page.keyboard.press('Space'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape');
  await expect(column.locator('h3')).toHaveText(titles);
});
