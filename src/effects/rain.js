export function createRainEffect({ canvas, windowElement, videoMount, state }) {
  // Rain is painted in physical pixels, with a static reduced-motion mode.
  const context = canvas.getContext('2d');
  if (!context) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let drops = [], rainWidth = 0, rainHeight = 0, lastRainFrame = 0;
  function resizeRain() {
    const bounds = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
    rainWidth = bounds.width; rainHeight = bounds.height; canvas.width = bounds.width * ratio; canvas.height = bounds.height * ratio;
    // Fill the window with a 16:9 player, cropping rather than stretching.
    videoMount.style.setProperty('--video-width', `${Math.max(bounds.width, bounds.height * 16 / 9)}px`);
    videoMount.style.setProperty('--video-height', `${Math.max(bounds.height, bounds.width * 9 / 16)}px`);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drops = Array.from({ length: Math.floor(rainWidth / 6) }, () => ({ x: Math.random() * rainWidth, y: Math.random() * rainHeight, r: .6 + Math.random() * 1.5, speed: .15 + Math.random() * .75, trail: Math.random() > .75 }));
    drawRain(0);
  }
  function drawRain(delta) {
    context.clearRect(0, 0, rainWidth, rainHeight);
    for (const drop of drops) {
      if (!reducedMotion.matches && !state.paused) { drop.y += drop.speed * delta * .04; drop.x -= delta * .001; }
      if (drop.y > rainHeight + 15) { drop.y = -15; drop.x = Math.random() * rainWidth; }
      if (drop.x < -3) drop.x = rainWidth + 3;
      if (drop.trail) {
        const gradient = context.createLinearGradient(drop.x, drop.y - 15, drop.x, drop.y);
        gradient.addColorStop(0, '#d9edec00'); gradient.addColorStop(1, '#d9edec30');
        context.strokeStyle = gradient; context.lineWidth = drop.r * .7; context.beginPath(); context.moveTo(drop.x + .4, drop.y - 15); context.lineTo(drop.x, drop.y); context.stroke();
      }
      context.beginPath(); context.ellipse(drop.x, drop.y, drop.r, drop.r * 1.3, -.1, 0, Math.PI * 2); context.fillStyle = '#dff5f017'; context.fill();
      context.strokeStyle = '#c7e4d52b'; context.lineWidth = .5; context.stroke();
      context.beginPath(); context.arc(drop.x - drop.r * .25, drop.y - drop.r * .35, drop.r * .22, 0, Math.PI * 2); context.fillStyle = '#f2ffef70'; context.fill();
    }
  }
  function animateRain(now) {
    if (now - lastRainFrame > 32) {
      if (state.rain && !document.hidden && !reducedMotion.matches) drawRain(Math.min(60, now - lastRainFrame));
      lastRainFrame = now;
    }
    requestAnimationFrame(animateRain);
  }
  new ResizeObserver(resizeRain).observe(windowElement);
  requestAnimationFrame(animateRain);
}
