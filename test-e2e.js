import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://127.0.0.1:5173/';

async function runTests() {
  console.log('=== Starting Comprehensive Gamepad, Mobile Arrow Buttons & Touch-Drag E2E Validation ===');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Listen to console
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err));

    // 1. Desktop Viewport (1440 x 1024) matching Figma
    await page.setViewport({ width: 1440, height: 1024 });
    console.log('Navigating to', URL);
    await page.goto(URL, { waitUntil: 'networkidle0' });

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 400));

    // 2. Validate Start Screen Typography & Colors
    console.log('[Test 1] Validating Start Screen Visual Elements...');
    const titleMeatball = await page.$eval('.title-meatball', el => ({
      text: el.textContent.trim(),
      color: getComputedStyle(el).color,
      fontSize: getComputedStyle(el).fontSize,
      fontFamily: getComputedStyle(el).fontFamily
    }));
    console.log('Title Line 1:', titleMeatball);

    const titleRain = await page.$eval('.title-rain', el => ({
      text: el.textContent.trim(),
      color: getComputedStyle(el).color,
      fontSize: getComputedStyle(el).fontSize
    }));
    console.log('Title Line 2:', titleRain);

    const bgCanvas = await page.$eval('.app-root', el => getComputedStyle(el).backgroundColor);
    console.log('Canvas Background:', bgCanvas);

    // 3. Test Gamepad Connection & Start via Gamepad Button A (Button 0)
    console.log('[Test 2] Connecting Gamepad and starting via Button A...');
    await page.evaluate(() => {
      window.__mockGamepad = {
        id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)',
        index: 0,
        connected: true,
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
      };

      navigator.getGamepads = () => [window.__mockGamepad];
      try {
        window.dispatchEvent(new Event('gamepadconnected'));
      } catch (e) {}
    });

    // Press Gamepad Button A (button 0)
    await page.evaluate(() => {
      window.__mockGamepad.buttons[0] = { pressed: true, value: 1.0 };
    });
    await new Promise(r => setTimeout(r, 200));

    // Release Gamepad Button A
    await page.evaluate(() => {
      window.__mockGamepad.buttons[0] = { pressed: false, value: 0.0 };
    });
    await new Promise(r => setTimeout(r, 400));

    const isGameVisible = await page.$eval('#game-screen', el => el.style.display !== 'none');
    console.log('Game screen visible after Gamepad Button A:', isGameVisible);
    if (!isGameVisible) {
      throw new Error('Gamepad button A did not start the game!');
    }

    // 4. Test Controller Left Analog Stick Movement
    console.log('[Test 3] Testing Left Analog Stick Movement...');
    const initialDogPos = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Initial dog pos:', initialDogPos);

    // Move stick right: axes[0] = 0.8
    await page.evaluate(() => {
      window.__mockGamepad.axes[0] = 0.8;
    });
    await new Promise(r => setTimeout(r, 300));
    const dogPosStickRight = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Dog pos after Stick Right (0.8):', dogPosStickRight);
    if (dogPosStickRight <= initialDogPos) {
      throw new Error('Dog did not move right with analog stick!');
    }

    // Move stick left: axes[0] = -0.8
    await page.evaluate(() => {
      window.__mockGamepad.axes[0] = -0.8;
    });
    await new Promise(r => setTimeout(r, 400));
    const dogStickLeft = await page.$eval('#player-dog', el => ({
      x: parseFloat(el.style.left),
      facingLeft: el.classList.contains('facing-left')
    }));
    console.log('Dog pos after Stick Left (-0.8):', dogStickLeft);
    if (dogStickLeft.x >= dogPosStickRight) {
      throw new Error('Dog did not move left with analog stick!');
    }
    if (!dogStickLeft.facingLeft) {
      throw new Error('Dog is not facing left when moving left via analog stick!');
    }

    // Neutralize stick
    await page.evaluate(() => {
      window.__mockGamepad.axes[0] = 0.0;
    });
    await new Promise(r => setTimeout(r, 100));

    // 5. Test Analog Stick Deadzone (0.08 < 0.18 deadzone)
    console.log('[Test 4] Testing Analog Stick Deadzone...');
    const dogPosBeforeDeadzone = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    await page.evaluate(() => {
      window.__mockGamepad.axes[0] = 0.08; // within deadzone
    });
    await new Promise(r => setTimeout(r, 200));
    const dogPosAfterDeadzone = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Dog pos after stick within deadzone (0.08):', dogPosAfterDeadzone);
    if (Math.abs(dogPosAfterDeadzone - dogPosBeforeDeadzone) > 0.01) {
      throw new Error('Dog moved when stick was within deadzone!');
    }

    // 6. Test D-Pad Movement (Buttons 14 and 15)
    console.log('[Test 5] Testing D-Pad Buttons (14 & 15)...');
    // D-Pad Right: button 15
    await page.evaluate(() => {
      window.__mockGamepad.axes[0] = 0;
      window.__mockGamepad.buttons[15] = { pressed: true, value: 1.0 };
    });
    await new Promise(r => setTimeout(r, 300));
    const dogPosDpadRight = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Dog pos after D-Pad Right:', dogPosDpadRight);
    if (dogPosDpadRight <= dogPosAfterDeadzone) {
      throw new Error('Dog did not move right with D-pad!');
    }

    // D-Pad Left: button 14
    await page.evaluate(() => {
      window.__mockGamepad.buttons[15] = { pressed: false, value: 0.0 };
      window.__mockGamepad.buttons[14] = { pressed: true, value: 1.0 };
    });
    await new Promise(r => setTimeout(r, 300));
    const dogPosDpadLeft = await page.$eval('#player-dog', el => ({
      x: parseFloat(el.style.left),
      facingLeft: el.classList.contains('facing-left')
    }));
    console.log('Dog pos after D-Pad Left:', dogPosDpadLeft);
    if (dogPosDpadLeft.x >= dogPosDpadRight) {
      throw new Error('Dog did not move left with D-pad!');
    }
    if (!dogPosDpadLeft.facingLeft) {
      throw new Error('Dog is not facing left when moving left via D-pad!');
    }

    // Clear D-pad
    await page.evaluate(() => {
      window.__mockGamepad.buttons[14] = { pressed: false, value: 0.0 };
    });

    // 7. Test Keyboard Controls (Simultaneous with Controller)
    console.log('[Test 6] Testing Keyboard Controls (Arrows and A/D)...');
    const posBeforeKey = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    await page.keyboard.down('KeyD');
    await new Promise(r => setTimeout(r, 250));
    await page.keyboard.up('KeyD');

    const posAfterKeyD = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Dog pos after KeyD:', posAfterKeyD);
    if (posAfterKeyD <= posBeforeKey) {
      throw new Error('KeyD did not move the dog right!');
    }

    await page.keyboard.down('KeyA');
    await new Promise(r => setTimeout(r, 250));
    await page.keyboard.up('KeyA');

    const posAfterKeyA = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Dog pos after KeyA:', posAfterKeyA);
    if (posAfterKeyA >= posAfterKeyD) {
      throw new Error('KeyA did not move the dog left!');
    }

    // Arrow keys
    await page.keyboard.down('ArrowRight');
    await new Promise(r => setTimeout(r, 250));
    await page.keyboard.up('ArrowRight');
    const posAfterArrowRight = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Dog pos after ArrowRight:', posAfterArrowRight);
    if (posAfterArrowRight <= posAfterKeyA) {
      throw new Error('ArrowRight did not move the dog right!');
    }

    // 8. Test Disconnecting Gamepad
    console.log('[Test 7] Testing Gamepad Disconnect Handling...');
    await page.evaluate(() => {
      window.__mockGamepad.connected = false;
      try {
        window.dispatchEvent(new Event('gamepaddisconnected'));
      } catch (e) {}
    });
    // Keyboard should still work without issues
    const posBeforeDisconnectKey = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    await page.keyboard.down('ArrowLeft');
    await new Promise(r => setTimeout(r, 200));
    await page.keyboard.up('ArrowLeft');
    const posAfterDisconnectKey = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Dog pos after disconnect and ArrowLeft:', posAfterDisconnectKey);
    if (posAfterDisconnectKey >= posBeforeDisconnectKey) {
      throw new Error('Keyboard failed after gamepad disconnect!');
    }

    // 9. Test Game Over & Restart via Gamepad Start Button (Button 9)
    console.log('[Test 8] Testing Game Over & Restart via Gamepad Start Button (9)...');
    // Reconnect gamepad
    await page.evaluate(() => {
      window.__mockGamepad.connected = true;
      document.getElementById('game-over-screen').style.display = 'flex';
    });
    await new Promise(r => setTimeout(r, 300));

    // Press Gamepad Start button (button 9)
    await page.evaluate(() => {
      window.__mockGamepad.buttons[9] = { pressed: true, value: 1.0 };
    });
    await new Promise(r => setTimeout(r, 200));
    await page.evaluate(() => {
      window.__mockGamepad.buttons[9] = { pressed: false, value: 0.0 };
    });
    await new Promise(r => setTimeout(r, 400));

    const isPlayingAfterRestart = await page.$eval('#game-screen', el => el.style.display !== 'none');
    console.log('Game playing after Gamepad Start restart:', isPlayingAfterRestart);
    if (!isPlayingAfterRestart) {
      throw new Error('Gamepad Start button did not restart the game!');
    }

    // 10. Test Mobile Viewport (390 x 844) — Arrow Buttons & Touch Drag
    console.log('[Test 9] Testing Mobile Viewport (390x844) Controls...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 400));

    // Check Start Screen on mobile
    await page.screenshot({ path: 'test_mobile_start.png' });
    console.log('Saved test_mobile_start.png');

    // Tap START
    await page.tap('#btn-start');
    await new Promise(r => setTimeout(r, 500));

    // Verify Arrow Buttons are visible on mobile and within viewport
    const btnLeftRect = await page.$eval('#btn-arrow-left', el => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
    });
    const btnRightRect = await page.$eval('#btn-arrow-right', el => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
    });
    console.log('Left Arrow Button Rect on Mobile:', btnLeftRect);
    console.log('Right Arrow Button Rect on Mobile:', btnRightRect);

    if (btnLeftRect.width < 40 || btnLeftRect.height < 30 || btnLeftRect.bottom > 844) {
      throw new Error(`Left arrow button is hidden or out of viewport: ${JSON.stringify(btnLeftRect)}`);
    }
    if (btnRightRect.width < 40 || btnRightRect.height < 30 || btnRightRect.bottom > 844) {
      throw new Error(`Right arrow button is hidden or out of viewport: ${JSON.stringify(btnRightRect)}`);
    }

    // 11. Test Mobile On-Screen Arrow Buttons (Press & Hold)
    console.log('[Test 10] Testing Press & Hold on Right Arrow Button...');
    const dogPosMobileInit = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Mobile Initial Dog Pos:', dogPosMobileInit);

    // Press right button
    await page.evaluate(() => {
      const btn = document.getElementById('btn-arrow-right');
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    });
    await new Promise(r => setTimeout(r, 300));
    // Release right button
    await page.evaluate(() => {
      const btn = document.getElementById('btn-arrow-right');
      btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
    });
    await new Promise(r => setTimeout(r, 50));

    const dogPosAfterBtnRight = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Dog Pos after holding Right Arrow Button:', dogPosAfterBtnRight);
    if (dogPosAfterBtnRight <= dogPosMobileInit) {
      throw new Error('Right Arrow Button did not move dog right!');
    }

    // Press left button
    console.log('[Test 11] Testing Press & Hold on Left Arrow Button...');
    await page.evaluate(() => {
      const btn = document.getElementById('btn-arrow-left');
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    });
    await new Promise(r => setTimeout(r, 350));
    // Release left button
    await page.evaluate(() => {
      const btn = document.getElementById('btn-arrow-left');
      btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
    });
    await new Promise(r => setTimeout(r, 50));

    const dogLeftInfo = await page.$eval('#player-dog', el => ({
      x: parseFloat(el.style.left),
      facingLeft: el.classList.contains('facing-left')
    }));
    console.log('Dog Pos after holding Left Arrow Button:', dogLeftInfo);
    if (dogLeftInfo.x >= dogPosAfterBtnRight) {
      throw new Error('Left Arrow Button did not move dog left!');
    }
    if (!dogLeftInfo.facingLeft) {
      throw new Error('Dog is not facing left when moving with Left Arrow button!');
    }

    // 12. Test Mobile Touch-Drag Control
    console.log('[Test 12] Testing Mobile Touch-Drag Movement...');
    const posBeforeDrag = dogLeftInfo.x;

    // Simulate touch drag to the right by 80px
    await page.evaluate(() => {
      const arena = document.getElementById('game-arena');
      arena.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 400,
        pointerType: 'touch'
      }));
      window.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 230,
        clientY: 400,
        pointerType: 'touch'
      }));
      window.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        clientX: 230,
        clientY: 400,
        pointerType: 'touch'
      }));
    });
    await new Promise(r => setTimeout(r, 100));

    const dogPosAfterDragRight = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Dog Pos after Touch-Drag Right (+80px):', dogPosAfterDragRight);
    if (dogPosAfterDragRight <= posBeforeDrag) {
      throw new Error('Touch-drag right did not move dog right!');
    }

    // Simulate touch drag to the left by 100px
    await page.evaluate(() => {
      const arena = document.getElementById('game-arena');
      arena.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 230,
        clientY: 400,
        pointerType: 'touch'
      }));
      window.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 130,
        clientY: 400,
        pointerType: 'touch'
      }));
      window.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        clientX: 130,
        clientY: 400,
        pointerType: 'touch'
      }));
    });
    await new Promise(r => setTimeout(r, 100));

    const dogPosAfterDragLeft = await page.$eval('#player-dog', el => ({
      x: parseFloat(el.style.left),
      facingLeft: el.classList.contains('facing-left')
    }));
    console.log('Dog Pos after Touch-Drag Left (-100px):', dogPosAfterDragLeft);
    if (dogPosAfterDragLeft.x >= dogPosAfterDragRight) {
      throw new Error('Touch-drag left did not move dog left!');
    }
    if (!dogPosAfterDragLeft.facingLeft) {
      throw new Error('Dog is not facing left after dragging left!');
    }

    // 13. Test Interchangeable Controls (Drag then Button then Drag)
    console.log('[Test 13] Testing Interchangeable Touch-Drag and Button Usage...');
    // 1. Drag right +50px
    await page.evaluate(() => {
      const arena = document.getElementById('game-arena');
      arena.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 100, clientY: 400, pointerType: 'touch' }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: 150, clientY: 400, pointerType: 'touch' }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch' }));
    });
    const afterStep1 = await page.$eval('#player-dog', el => parseFloat(el.style.left));

    // 2. Press left button
    await page.evaluate(() => {
      const btn = document.getElementById('btn-arrow-left');
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    });
    await new Promise(r => setTimeout(r, 200));
    await page.evaluate(() => {
      const btn = document.getElementById('btn-arrow-left');
      btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
    });
    const afterStep2 = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    if (afterStep2 >= afterStep1) {
      throw new Error('Button failed after touch-drag!');
    }

    // 3. Drag right again
    await page.evaluate(() => {
      const arena = document.getElementById('game-arena');
      arena.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 100, clientY: 400, pointerType: 'touch' }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: 160, clientY: 400, pointerType: 'touch' }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch' }));
    });
    const afterStep3 = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    if (afterStep3 <= afterStep2) {
      throw new Error('Touch-drag failed after button press!');
    }
    console.log('Interchangeable test successfully executed!');

    // 14. Test Boundary Clamping on Mobile
    console.log('[Test 14] Testing Boundary Clamping on Mobile...');
    // Drag far beyond right edge
    await page.evaluate(() => {
      const arena = document.getElementById('game-arena');
      arena.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 100, clientY: 400, pointerType: 'touch' }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: 1000, clientY: 400, pointerType: 'touch' }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch' }));
    });
    const posAtRightBound = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Pos at extreme right drag:', posAtRightBound);
    if (posAtRightBound > 330) {
      throw new Error(`Dog exceeded right boundary on mobile: ${posAtRightBound}`);
    }

    // Drag far beyond left edge
    await page.evaluate(() => {
      const arena = document.getElementById('game-arena');
      arena.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 500, clientY: 400, pointerType: 'touch' }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: -500, clientY: 400, pointerType: 'touch' }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch' }));
    });
    const posAtLeftBound = await page.$eval('#player-dog', el => parseFloat(el.style.left));
    console.log('Pos at extreme left drag:', posAtLeftBound);
    if (posAtLeftBound < 60) {
      throw new Error(`Dog exceeded left boundary on mobile: ${posAtLeftBound}`);
    }

    // 15. Capture Final Mobile Gameplay Screenshot
    await page.screenshot({ path: 'test_mobile_gameplay.png' });
    console.log('Saved test_mobile_gameplay.png');

    console.log('=== All Gamepad, Keyboard, Arrow Buttons, and Touch-Drag Tests Passed! ===');

  } finally {
    await browser.close();
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
