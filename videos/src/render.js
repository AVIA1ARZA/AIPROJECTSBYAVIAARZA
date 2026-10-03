const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const path = require('path');
const mode = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox','--allow-file-access-from-files','--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGEERR', e.message));
  page.on('console', m => { if (m.type()==='error') console.error('CONSOLE', m.text()); });
  await page.goto('file://' + path.resolve('scene.html'));
  await page.evaluate(() => window.ready);
  if (mode === 'stills') {
    for (const t of process.argv[3].split(',').map(Number)) {
      await page.evaluate(t => window.setT(t), t);
      await page.screenshot({ path: `still_${String(t).replace('.','_')}.png` });
    }
  } else {
    const FPS = 30, N = 450;
    const ff = spawn('ffmpeg', ['-y','-f','image2pipe','-framerate',String(FPS),'-c:v','png','-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','16','-preset','medium','-r',String(FPS),'silent.mp4'], { stdio: ['pipe','inherit','inherit'] });
    for (let i = 0; i < N; i++) {
      await page.evaluate(t => window.setT(t), i / FPS);
      const buf = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 30 === 0) console.log('frame', i);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
