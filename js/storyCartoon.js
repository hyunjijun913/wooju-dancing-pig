// Hand-crafted 2D Picture-Book Cartoon Animation Engine for all 12 "The Dancing Pig" story scenes!
// Renders crisp Retina 60fps mini-cartoons directly inside the dialogue & live stage boxes
// so a 6-year-old immediately understands every English sentence visually.

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSkyAndMeadow(ctx, W, H, t, { skyTop = '#BAE6FD', skyBot = '#FEF9C3', grass = '#86EFAC', grassDark = '#4ADE80' } = {}) {
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.72);
  sky.addColorStop(0, skyTop);
  sky.addColorStop(1, skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Cute drifting puffy clouds
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const cx1 = ((t * 14) % (W + 80)) - 40;
  const cx2 = ((t * 9 + 170) % (W + 80)) - 40;
  [[cx1, 22, 14], [cx2, 30, 11]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.9, y + 2, r * 0.8, 0, Math.PI * 2);
    ctx.arc(x - r * 0.9, y + 3, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
  });

  // Soft rolling grass meadow
  ctx.fillStyle = grass;
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 1.08, W * 0.75, H * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = grassDark;
  ctx.fillRect(0, H * 0.78, W, H * 0.25);
}

function drawCuteEyes(ctx, x, y, spacing = 10, r = 3.2, blink = false, happy = false) {
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  [-spacing, spacing].forEach((dx) => {
    if (happy) {
      ctx.beginPath();
      ctx.arc(x + dx, y + 1, r + 0.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (blink) {
      ctx.beginPath();
      ctx.moveTo(x + dx - r, y);
      ctx.lineTo(x + dx + r, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x + dx, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x + dx - r * 0.35, y - r * 0.35, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1E293B';
    }
  });
}

function drawCheeks(ctx, x, y, spacing = 15, color = 'rgba(244, 114, 182, 0.55)') {
  ctx.fillStyle = color;
  [-spacing, spacing].forEach((dx) => {
    ctx.beginPath();
    ctx.ellipse(x + dx, y, 4.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawSparkle(ctx, x, y, r, color = '#FACC15') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : r * 0.35;
    const a = (i * Math.PI) / 4;
    if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMiniPig(ctx, x, y, s, t, spinning = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const hop = Math.abs(Math.sin(t * 6.5)) * 8;
  ctx.translate(0, -hop);
  if (spinning) ctx.rotate(Math.sin(t * 4) * 0.22);

  // Curly tail
  ctx.strokeStyle = '#EC4899';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(20, 6, 6, 0, Math.PI * 1.6);
  ctx.stroke();

  // Legs kicking
  ctx.fillStyle = '#F472B6';
  const kick = Math.sin(t * 9) * 5;
  drawRoundedRect(ctx, -14, 14, 7, 13 + kick * 0.3, 3); ctx.fill();
  drawRoundedRect(ctx, 6, 14, 7, 13 - kick * 0.3, 3); ctx.fill();

  // Plump body
  ctx.fillStyle = '#F9A8D4';
  ctx.beginPath();
  ctx.ellipse(0, 6, 20, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Waving arms
  ctx.save();
  ctx.translate(-17, 2);
  ctx.rotate(-0.6 + Math.sin(t * 8) * 0.7);
  drawRoundedRect(ctx, -10, -3, 12, 6, 3); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(17, 2);
  ctx.rotate(0.6 - Math.sin(t * 8) * 0.7);
  drawRoundedRect(ctx, -2, -3, 12, 6, 3); ctx.fill();
  ctx.restore();

  // Head + ears
  ctx.fillStyle = '#F472B6';
  ctx.beginPath(); ctx.moveTo(-14, -18); ctx.lineTo(-20, -30); ctx.lineTo(-5, -24); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14, -18); ctx.lineTo(20, -30); ctx.lineTo(5, -24); ctx.fill();
  ctx.fillStyle = '#F9A8D4';
  ctx.beginPath(); ctx.arc(0, -14, 16, 0, Math.PI * 2); ctx.fill();

  // Cute snout
  ctx.fillStyle = '#F472B6';
  ctx.beginPath(); ctx.ellipse(0, -10, 7.5, 5.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9D174D';
  ctx.beginPath(); ctx.arc(-2.6, -10, 1.4, 0, Math.PI * 2); ctx.arc(2.6, -10, 1.4, 0, Math.PI * 2); ctx.fill();

  drawCuteEyes(ctx, 0, -18, 6.5, 2.3, false, Math.sin(t * 3) > 0.4);
  drawCheeks(ctx, 0, -13, 11);
  ctx.restore();
}

// --- 12 Individual Story Cartoon Renderers ---

function renderFarmer(ctx, W, H, t) {
  drawSkyAndMeadow(ctx, W, H, t);
  const cyc = (t % 4.2) / 4.2; // 0..0.35 lonely -> 0.35..1.0 imagines dancing pig & smiles!
  const happy = cyc > 0.3;

  // Little red barn in background
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(16, H * 0.45, 48, 36);
  ctx.fillStyle = '#7C2D12';
  ctx.beginPath(); ctx.moveTo(11, H * 0.46); ctx.lineTo(40, H * 0.25); ctx.lineTo(69, H * 0.46); ctx.fill();
  ctx.strokeStyle = '#FFFDF7'; ctx.lineWidth = 2;
  ctx.strokeRect(30, H * 0.58, 20, 23);

  // Mr. Brown
  const fx = W * 0.36;
  const fy = H * 0.69 - (happy ? Math.abs(Math.sin(t * 5.5)) * 6 : 0);
  ctx.fillStyle = '#2563EB'; // overalls
  drawRoundedRect(ctx, fx - 14, fy - 4, 28, 28, 8); ctx.fill();
  ctx.fillStyle = '#EF4444'; // shirt sleeves
  ctx.fillRect(fx - 13, fy - 4, 26, 8);
  // Head
  ctx.fillStyle = '#FFDFC4';
  ctx.beginPath(); ctx.arc(fx, fy - 18, 15, 0, Math.PI * 2); ctx.fill();
  // Straw hat
  ctx.fillStyle = '#FACC15';
  ctx.beginPath(); ctx.ellipse(fx, fy - 29, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
  drawRoundedRect(ctx, fx - 12, fy - 41, 24, 13, 5); ctx.fill();
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(fx - 12, fy - 32, 24, 3.5);
  drawCuteEyes(ctx, fx, fy - 19, 5.5, 2.2, false, happy);
  drawCheeks(ctx, fx, fy - 15, 9.5);
  // Mouth (sad -> big smile)
  ctx.strokeStyle = '#7C2D12'; ctx.lineWidth = 2;
  ctx.beginPath();
  if (happy) ctx.arc(fx, fy - 13, 5, 0.15, Math.PI - 0.15);
  else ctx.arc(fx, fy - 9, 4.5, Math.PI + 0.3, Math.PI * 2 - 0.3);
  ctx.stroke();

  // Thought cloud with dancing pig!
  if (happy) {
    const bx = W * 0.72;
    const by = H * 0.42;
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(fx + 26, fy - 30, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(fx + 38, fy - 38, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(bx, by, 54, 34, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    drawMiniPig(ctx, bx, by + 6, 0.72, t, true);
    drawSparkle(ctx, bx - 36, by - 14, 5 + Math.sin(t * 7) * 2, '#FACC15');
    drawSparkle(ctx, bx + 36, by - 12, 5 + Math.cos(t * 7) * 2, '#EC4899');
  }
}

function renderFrog(ctx, W, H, t) {
  drawSkyAndMeadow(ctx, W, H, t, { grass: '#6EE7B7', grassDark: '#34D399' });
  // Blue pond
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.84, W * 0.46, 26, 0, 0, Math.PI * 2); ctx.fill();

  // Two lily pads
  const p1 = W * 0.28, p2 = W * 0.72, py = H * 0.82;
  [p1, p2].forEach((px) => {
    ctx.fillStyle = '#16A34A';
    ctx.beginPath(); ctx.ellipse(px, py, 28, 10, 0, 0.25, Math.PI * 2 - 0.25); ctx.lineTo(px, py); ctx.fill();
  });

  // Frog jumping back and forth in a bouncy arc between lily pads!
  const cyc = (t * 0.65) % 2;
  const dir = cyc < 1 ? cyc : 2 - cyc;
  const jumpArc = Math.sin(dir * Math.PI);
  const fx = p1 + (p2 - p1) * dir;
  const fy = py - 12 - jumpArc * 46;

  // Water splash rings on takeoff/landing
  if (jumpArc < 0.25) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(fx, py + 2, 24 + (0.25 - jumpArc) * 45, 7, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // Cute Green Frog
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(1 - jumpArc * 0.08, 1 + jumpArc * 0.14);
  ctx.fillStyle = '#22C55E';
  ctx.beginPath(); ctx.ellipse(0, 4, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#DCFCE7';
  ctx.beginPath(); ctx.ellipse(0, 7, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Big frog eyes on top
  [-9, 9].forEach((ex) => {
    ctx.fillStyle = '#22C55E';
    ctx.beginPath(); ctx.arc(ex, -10, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(ex, -10, 5.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath(); ctx.arc(ex, -10, 2.8, 0, Math.PI * 2); ctx.fill();
  });
  drawCheeks(ctx, 0, 1, 12);
  ctx.strokeStyle = '#14532D'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(0, 0, 7, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();

  drawSparkle(ctx, fx - 26, fy - 14, 5, '#FACC15');
  drawSparkle(ctx, fx + 26, fy - 10, 4.5, '#F472B6');
}

function renderOwl(ctx, W, H, t) {
  drawSkyAndMeadow(ctx, W, H, t, { skyTop: '#93C5FD', skyBot: '#FDE68A' });

  // Colorful party bunting banners dropping across the top!
  const cols = ['#F43F5E', '#FACC15', '#38BDF8', '#A855F7', '#22C55E', '#FB923C'];
  ctx.strokeStyle = '#92400E'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 12); ctx.quadraticCurveTo(W * 0.5, 30, W, 12); ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const fx = (i + 0.5) * (W / 9);
    const fy = 14 + Math.sin(((i + 0.5) / 9) * Math.PI) * 14;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath(); ctx.moveTo(fx - 8, fy); ctx.lineTo(fx + 8, fy); ctx.lineTo(fx, fy + 14); ctx.fill();
  }

  // Tree branch
  ctx.strokeStyle = '#78350F'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, H * 0.78); ctx.quadraticCurveTo(W * 0.4, H * 0.72, W * 0.72, H * 0.76); ctx.stroke();

  // Cute Owl flapping wings excitedly!
  const ox = W * 0.45;
  const oy = H * 0.57 - Math.abs(Math.sin(t * 5)) * 10;
  const flap = Math.sin(t * 10) * 0.55;
  ctx.save();
  ctx.translate(ox, oy);
  // Wings
  ctx.fillStyle = '#92400E';
  ctx.save(); ctx.translate(-17, 2); ctx.rotate(-0.5 + flap);
  ctx.beginPath(); ctx.ellipse(-10, 0, 14, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(17, 2); ctx.rotate(0.5 - flap);
  ctx.beginPath(); ctx.ellipse(10, 0, 14, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // Body + tummy
  ctx.fillStyle = '#B45309';
  ctx.beginPath(); ctx.ellipse(0, 2, 20, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FEF3C7';
  ctx.beginPath(); ctx.ellipse(0, 7, 13, 14, 0, 0, Math.PI * 2); ctx.fill();
  // Ear tufts
  ctx.fillStyle = '#92400E';
  ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(-19, -25); ctx.lineTo(-6, -18); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14, -14); ctx.lineTo(19, -25); ctx.lineTo(6, -18); ctx.fill();
  // Big owl eyes + orange beak
  [-8, 8].forEach((ex) => {
    ctx.fillStyle = '#FEF3C7'; ctx.beginPath(); ctx.arc(ex, -7, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1E293B'; ctx.beginPath(); ctx.arc(ex, -7, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ex - 1.5, -8.5, 1.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = '#F97316';
  ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(4, -2); ctx.lineTo(0, 5); ctx.fill();
  ctx.restore();

  // Falling party confetti!
  for (let i = 0; i < 8; i++) {
    const cx = (i * 39 + 20) % W;
    const cy = ((t * 36 + i * 27) % (H - 18)) + 12;
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(cx, cy, 5, 5);
  }
}

function renderChicken(ctx, W, H, t) {
  drawSkyAndMeadow(ctx, W, H, t);
  const cyc = (t * 0.55) % 1; // 0..0.45 squat on nest -> 0.45..1.0 hop up & reveal gleaming egg!
  const laid = cyc > 0.45;
  const nx = W * 0.5, ny = H * 0.78;

  // Cozy straw nest
  ctx.fillStyle = '#D97706';
  ctx.beginPath(); ctx.ellipse(nx, ny + 4, 38, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FDE047';
  ctx.beginPath(); ctx.ellipse(nx, ny + 1, 32, 9, 0, 0, Math.PI * 2); ctx.fill();

  // Gleaming egg appears in nest!
  if (laid) {
    const pop = Math.min(1, (cyc - 0.45) * 4);
    ctx.save();
    ctx.translate(nx, ny - 4);
    ctx.scale(pop, pop);
    ctx.fillStyle = '#FFFDF7';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    drawSparkle(ctx, -16, -12, 5, '#FACC15');
    drawSparkle(ctx, 18, -10, 4.5, '#FACC15');
    ctx.restore();
  }

  // Cute White Hen
  const hx = laid ? nx - 44 : nx + Math.sin(t * 18) * 2;
  const hy = laid ? ny - 14 - Math.abs(Math.sin(t * 7)) * 12 : ny - 10;
  ctx.save();
  ctx.translate(hx, hy);
  if (!laid) ctx.scale(1.12, 0.88);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.ellipse(0, 4, 20, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -12, 12, 0, Math.PI * 2); ctx.fill();
  // Red comb
  ctx.fillStyle = '#EF4444';
  ctx.beginPath(); ctx.arc(7, -24, 4.5, 0, Math.PI * 2); ctx.arc(12, -25, 5, 0, Math.PI * 2); ctx.arc(16, -22, 4, 0, Math.PI * 2); ctx.fill();
  // Beak
  ctx.fillStyle = '#F97316';
  ctx.beginPath(); ctx.moveTo(20, -13); ctx.lineTo(29, -10); ctx.lineTo(20, -7); ctx.fill();
  drawCuteEyes(ctx, 13, -13, 0, 2.4, false, laid);
  drawCheeks(ctx, 13, -8, 0);
  ctx.restore();
}

function renderRabbit(ctx, W, H, t) {
  drawSkyAndMeadow(ctx, W, H, t);
  // Brown tilled garden soil
  ctx.fillStyle = '#92400E';
  drawRoundedRect(ctx, W * 0.14, H * 0.68, W * 0.72, H * 0.28, 12); ctx.fill();

  const cyc = (t * 0.5) % 1; // 0..0.45 digging -> 0.45..1.0 pulls giant carrot out!
  const pulling = cyc > 0.45;
  const pullAmt = pulling ? Math.min(1, (cyc - 0.45) * 2.6) : 0;

  // Giant Orange Carrot rising from the soil!
  const cx = W * 0.6;
  const cy = H * 0.76 - pullAmt * 34;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(pulling ? Math.sin(t * 10) * 0.08 : 0);
  // Green leafy top
  ctx.fillStyle = '#16A34A';
  [-8, 0, 8].forEach((lx) => {
    ctx.beginPath(); ctx.ellipse(lx, -22, 5, 13, lx * 0.04, 0, Math.PI * 2); ctx.fill();
  });
  // Big orange carrot body
  ctx.fillStyle = '#F97316';
  ctx.beginPath(); ctx.moveTo(-13, -12); ctx.lineTo(13, -12); ctx.lineTo(0, 26); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Soil cover strip so carrot emerges from underground
  ctx.fillStyle = '#78350F';
  ctx.fillRect(W * 0.46, H * 0.74, W * 0.28, H * 0.22);

  // Flying dirt clods while digging
  if (!pulling) {
    ctx.fillStyle = '#B45309';
    for (let i = 0; i < 4; i++) {
      const dp = ((t * 3 + i * 0.25) % 1);
      ctx.beginPath();
      ctx.arc(cx - 18 - dp * 26, H * 0.74 - Math.sin(dp * Math.PI) * 24, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    drawSparkle(ctx, cx + 24, cy - 16, 6, '#FACC15');
    drawSparkle(ctx, cx - 22, cy - 18, 5, '#FACC15');
  }

  // Cute White Bunny
  const bx = W * 0.35;
  const by = H * 0.64 - (pulling ? Math.abs(Math.sin(t * 7)) * 8 : 0);
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(pulling ? -0.15 : 0.22 + Math.sin(t * 16) * 0.08);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.ellipse(0, 6, 16, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, -12, 13, 0, Math.PI * 2); ctx.fill();
  // Long bunny ears
  ctx.beginPath(); ctx.ellipse(-4, -30, 4.5, 13, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7, -30, 4.5, 13, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FBCFE8';
  ctx.beginPath(); ctx.ellipse(-4, -30, 2.2, 9, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7, -30, 2.2, 9, 0.2, 0, Math.PI * 2); ctx.fill();
  drawCuteEyes(ctx, 5, -13, 5, 2.1, false, pulling);
  drawCheeks(ctx, 5, -9, 9);
  ctx.restore();
}

function renderCow(ctx, W, H, t) {
  drawSkyAndMeadow(ctx, W, H, t);
  const fillLevel = (Math.sin(t * 1.6) + 1) * 0.5;

  // Cute Spotted Cow
  const cx = W * 0.36, cy = H * 0.62;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(t * 2.5) * 0.05);
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, -26, -6, 52, 30, 12); ctx.fill();
  // Black spots
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.arc(-8, 4, 8, 0, Math.PI * 2); ctx.arc(12, 10, 6, 0, Math.PI * 2); ctx.fill();
  // Cow head
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(-20, -14, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FBCFE8'; // pink muzzle
  ctx.beginPath(); ctx.ellipse(-20, -7, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  drawCuteEyes(ctx, -20, -17, 5.5, 2.2, false, true);
  ctx.restore();

  // Milk stream pouring into a shiny milk bottle / bucket!
  const bx = W * 0.72, by = H * 0.78;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(bx - 3, by - 48, 6, 36);
  // Glass milk bottle
  ctx.fillStyle = '#E0F2FE';
  ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, bx - 16, by - 30, 32, 34, 8); ctx.fill(); ctx.stroke();
  // Rising white milk inside bottle
  const mh = 10 + fillLevel * 20;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, bx - 13, by + 2 - mh, 26, mh, 5); ctx.fill();
  drawSparkle(ctx, bx + 24, by - 28, 6, '#FACC15');
  drawSparkle(ctx, bx - 24, by - 22, 4.5, '#38BDF8');
}

function renderHorsePony(ctx, W, H, t) {
  drawSkyAndMeadow(ctx, W, H, t);
  // Tall green cornstalks on the right
  const stalks = [W * 0.68, W * 0.78, W * 0.87];
  stalks.forEach((sx, i) => {
    ctx.strokeStyle = '#16A34A'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(sx, H * 0.85); ctx.lineTo(sx, H * 0.22); ctx.stroke();
    // Golden corn cob bobbing
    const bob = Math.sin(t * 5 + i) * 3;
    ctx.fillStyle = '#FACC15';
    ctx.beginPath(); ctx.ellipse(sx - 6, H * 0.42 + bob, 6, 13, -0.35, 0, Math.PI * 2); ctx.fill();
  });

  // Big Horse + Cute Pony reaching up to pick corn!
  const reach = (Math.sin(t * 4) + 1) * 0.5;
  [[W * 0.3, H * 0.66, 1.0, '#92400E'], [W * 0.48, H * 0.72, 0.72, '#D97706']].forEach(([hx, hy, sc, col], idx) => {
    ctx.save();
    ctx.translate(hx, hy - reach * (idx === 0 ? 9 : 6));
    ctx.scale(sc, sc);
    ctx.fillStyle = col;
    drawRoundedRect(ctx, -20, -4, 40, 24, 10); ctx.fill();
    // Neck & Head reaching up
    ctx.save();
    ctx.translate(14, -4);
    ctx.rotate(-0.25 - reach * 0.2);
    drawRoundedRect(ctx, -6, -24, 14, 26, 6); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -24, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
    drawCuteEyes(ctx, 8, -26, 0, 2.3, false, true);
    ctx.restore();
    ctx.restore();
  });

  // Basket filling with golden corn
  ctx.fillStyle = '#B45309';
  drawRoundedRect(ctx, W * 0.54, H * 0.74, 34, 20, 6); ctx.fill();
  ctx.fillStyle = '#FACC15';
  ctx.beginPath(); ctx.ellipse(W * 0.54 + 12, H * 0.73, 5, 9, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W * 0.54 + 22, H * 0.73, 5, 9, 0.3, 0, Math.PI * 2); ctx.fill();
  drawSparkle(ctx, W * 0.6, H * 0.3, 5.5, '#FACC15');
}

function renderCatMouse(ctx, W, H, t) {
  drawSkyAndMeadow(ctx, W, H, t);
  const cyc = (t * 0.35) % 1; // 0..0.5 Mouse says "NO!" -> 0.5..1.0 Cat catches a Fish!

  // Blue pond on the right
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath(); ctx.ellipse(W * 0.76, H * 0.85, 52, 18, 0, 0, Math.PI * 2); ctx.fill();

  // Orange Cat
  const catX = W * 0.34, catY = H * 0.68;
  ctx.save();
  ctx.translate(catX, catY);
  ctx.fillStyle = '#FB923C';
  ctx.beginPath(); ctx.ellipse(0, 6, 17, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -12, 14, 0, Math.PI * 2); ctx.fill();
  // Cat ears
  ctx.beginPath(); ctx.moveTo(-12, -20); ctx.lineTo(-14, -31); ctx.lineTo(-3, -24); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12, -20); ctx.lineTo(14, -31); ctx.lineTo(3, -24); ctx.fill();
  drawCuteEyes(ctx, 0, -13, 5, 2.2, false, cyc > 0.5);
  drawCheeks(ctx, 0, -9, 9);
  ctx.restore();

  if (cyc <= 0.5) {
    // Tiny gray mouse shaking head "NO!"
    const mx = W * 0.64 + Math.sin(t * 20) * 4;
    const my = H * 0.72;
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath(); ctx.ellipse(mx, my + 4, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - 6, my - 4, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - 12, my - 12, 6, 0, Math.PI * 2); ctx.arc(mx - 1, my - 13, 6, 0, Math.PI * 2); ctx.fill();
    // Big Red X ("No, you won't!")
    ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(mx - 8, my - 38); ctx.lineTo(mx + 8, my - 22); ctx.moveTo(mx + 8, my - 38); ctx.lineTo(mx - 8, my - 22); ctx.stroke();
  } else {
    // Fishing rod & splashing fish!
    const fp = (cyc - 0.5) * 2;
    const fishY = H * 0.8 - Math.sin(fp * Math.PI) * 44;
    ctx.strokeStyle = '#78350F'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(catX + 12, catY); ctx.lineTo(W * 0.72, H * 0.28); ctx.stroke();
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W * 0.72, H * 0.28); ctx.lineTo(W * 0.75, fishY); ctx.stroke();
    // Cute Blue Fish
    ctx.fillStyle = '#0284C7';
    ctx.beginPath(); ctx.ellipse(W * 0.75, fishY, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W * 0.75 + 12, fishY); ctx.lineTo(W * 0.75 + 21, fishY - 7); ctx.lineTo(W * 0.75 + 21, fishY + 7); ctx.fill();
    drawSparkle(ctx, W * 0.75, fishY - 16, 6, '#FACC15');
  }
}

function renderDuck(ctx, W, H, t) {
  drawSkyAndMeadow(ctx, W, H, t);
  const px = W * 0.62, py = H * 0.74;

  // Big black stew pot with bubbling soup & rising steam!
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.arc(px, py, 24, 0, Math.PI); ctx.fill();
  ctx.fillRect(px - 24, py - 14, 48, 16);
  ctx.fillStyle = '#FB923C'; // warm tasty soup
  ctx.beginPath(); ctx.ellipse(px, py - 14, 21, 6, 0, 0, Math.PI * 2); ctx.fill();

  // Rising steam curls
  for (let i = 0; i < 3; i++) {
    const sp = (t * 0.8 + i * 0.33) % 1;
    ctx.fillStyle = `rgba(255,255,255,${(1 - sp) * 0.85})`;
    ctx.beginPath();
    ctx.arc(px - 10 + i * 10 + Math.sin(t * 4 + i) * 4, py - 22 - sp * 34, 5 + sp * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stirring wooden spoon
  const stir = Math.sin(t * 6) * 10;
  ctx.strokeStyle = '#B45309'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(px + stir * 0.6, py - 14); ctx.lineTo(W * 0.42, H * 0.58); ctx.stroke();

  // Cute Yellow Duck with White Chef Hat!
  const dx = W * 0.34, dy = H * 0.68 - Math.abs(Math.sin(t * 5)) * 4;
  ctx.fillStyle = '#FDE047';
  ctx.beginPath(); ctx.ellipse(dx, dy + 6, 17, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(dx + 4, dy - 12, 13, 0, Math.PI * 2); ctx.fill();
  // Chef Hat
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(dx + 4, dy - 30, 9, 0, Math.PI * 2); ctx.arc(dx - 3, dy - 28, 7, 0, Math.PI * 2); ctx.arc(dx + 11, dy - 28, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(dx - 6, dy - 26, 20, 6);
  // Orange duck bill
  ctx.fillStyle = '#F97316';
  ctx.beginPath(); ctx.ellipse(dx + 18, dy - 10, 7, 3.8, 0, 0, Math.PI * 2); ctx.fill();
  drawCuteEyes(ctx, dx + 7, dy - 13, 0, 2.3, false, true);
  drawCheeks(ctx, dx + 7, dy - 9, 0);
}

function renderDogGoat(ctx, W, H, t) {
  // Cozy warm barn interior background
  ctx.fillStyle = '#FEF3C7';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(0, 0, W, 16);
  ctx.fillStyle = '#D97706';
  ctx.fillRect(0, H * 0.76, W, H * 0.24);

  const sw = Math.sin(t * 6.5);
  // Dog (left) + Goat (right) sweeping side-to-side!
  [[W * 0.34, '#E5B27A', '#92400E', false], [W * 0.66, '#F8FAFC', '#CBD5E1', true]].forEach(([x, bodyCol, accentCol, isGoat]) => {
    const cx = x + sw * 9;
    const cy = H * 0.63;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sw * 0.12);
    ctx.fillStyle = bodyCol;
    ctx.beginPath(); ctx.ellipse(0, 6, 16, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -12, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = accentCol;
    if (isGoat) {
      ctx.beginPath(); ctx.moveTo(-6, -23); ctx.lineTo(-9, -33); ctx.lineTo(-2, -25); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, -23); ctx.lineTo(9, -33); ctx.lineTo(2, -25); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(-13, -8, 4.5, 9, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(13, -8, 4.5, 9, -0.2, 0, Math.PI * 2); ctx.fill();
    }
    drawCuteEyes(ctx, 0, -13, 4.8, 2.1, false, true);
    drawCheeks(ctx, 0, -9, 8.5);
    // Broom sweeping!
    ctx.strokeStyle = '#92400E'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(18 + sw * 8, 26); ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath(); ctx.moveTo(12 + sw * 8, 22); ctx.lineTo(25 + sw * 8, 22); ctx.lineTo(29 + sw * 8, 32); ctx.lineTo(8 + sw * 8, 32); ctx.fill();
    ctx.restore();
  });

  // Sparkling clean floor stars!
  drawSparkle(ctx, W * 0.5, H * 0.84, 5 + Math.abs(sw) * 3, '#FACC15');
  drawSparkle(ctx, W * 0.2, H * 0.85, 4 + Math.abs(sw) * 2, '#38BDF8');
  drawSparkle(ctx, W * 0.8, H * 0.85, 4 + Math.abs(sw) * 2, '#F472B6');
}

function renderDonkeySheep(ctx, W, H, t) {
  drawSkyAndMeadow(ctx, W, H, t);
  const sway = Math.sin(t * 4.5);

  // Gray Donkey (left) + Fluffy White Sheep (right) singing together!
  [[W * 0.34, '#94A3B8', false], [W * 0.66, '#FFFFFF', true]].forEach(([x, col, isSheep], idx) => {
    const cy = H * 0.68 - Math.abs(Math.sin(t * 4.5 + idx)) * 6;
    ctx.save();
    ctx.translate(x, cy);
    ctx.rotate(sway * (idx === 0 ? 0.1 : -0.1));
    ctx.fillStyle = col;
    if (isSheep) {
      // Fluffy wool cloud body
      [[-10, 4], [10, 4], [0, -2], [-8, 12], [8, 12]].forEach(([ox, oy]) => {
        ctx.beginPath(); ctx.arc(ox, oy, 11, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#FFFBEB';
      ctx.beginPath(); ctx.arc(0, -14, 12, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(0, 6, 17, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -12, 13, 0, Math.PI * 2); ctx.fill();
      // Long donkey ears
      ctx.beginPath(); ctx.ellipse(-7, -28, 4, 12, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(7, -28, 4, 12, 0.2, 0, Math.PI * 2); ctx.fill();
    }
    drawCuteEyes(ctx, 0, -15, 5, 2.1, false, true);
    // Open singing mouth ("La La La~!")
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath(); ctx.ellipse(0, -7, 4, 3 + Math.abs(Math.sin(t * 9)) * 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  // Floating colorful musical notes!
  const notes = ['🎵', '🎶', '🎵', '🎶'];
  ctx.font = 'bold 18px sans-serif';
  notes.forEach((n, i) => {
    const np = (t * 0.55 + i * 0.25) % 1;
    const nx = W * 0.25 + i * (W * 0.16) + Math.sin(t * 4 + i) * 8;
    const ny = H * 0.5 - np * 42;
    ctx.globalAlpha = 1 - Math.abs(np - 0.5) * 1.8;
    ctx.fillText(n, nx, ny);
  });
  ctx.globalAlpha = 1;
}

function renderPigDance(ctx, W, H, t) {
  // Colorful Concert Spotlight Stage!
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#312E81');
  bg.addColorStop(1, '#6D28D9');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Sweeping rainbow stage spotlights
  [[-0.35, 'rgba(250, 204, 21, 0.28)'], [0.35, 'rgba(244, 114, 182, 0.28)']].forEach(([off, col], i) => {
    ctx.save();
    ctx.translate(W * (0.5 + off), 0);
    ctx.rotate(Math.sin(t * 2.5 + i * 2) * 0.25);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-42, H); ctx.lineTo(42, H); ctx.fill();
    ctx.restore();
  });

  // Pink & gold stage floor
  ctx.fillStyle = '#F43F5E';
  ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.9, W * 0.44, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FDE047'; ctx.lineWidth = 3;
  ctx.stroke();

  // The Dancing Pig center stage!
  drawMiniPig(ctx, W * 0.5, H * 0.63, 1.25, t, true);

  // Sparkles & confetti
  const cols = ['#FACC15', '#38BDF8', '#4ADE80', '#F472B6'];
  for (let i = 0; i < 6; i++) {
    const a = t * 2 + (i * Math.PI * 2) / 6;
    drawSparkle(ctx, W * 0.5 + Math.cos(a) * 75, H * 0.45 + Math.sin(a) * 24, 5.5, cols[i % cols.length]);
  }
}

const SCENE_RENDERERS = {
  farmer: renderFarmer,
  frog: renderFrog,
  owl: renderOwl,
  chicken: renderChicken,
  rabbit: renderRabbit,
  cow: renderCow,
  horse_pony: renderHorsePony,
  cat_mouse: renderCatMouse,
  duck: renderDuck,
  dog_goat: renderDogGoat,
  donkey_sheep: renderDonkeySheep,
  pig_finale: renderPigDance,
};

// Zootopia-style 3D CGI Cinematic Scene Registry (1 scene per sentence: cards 1..25!)
const GENERATED_SCENE_IDS = new Set([1, 2, 3, 4, 6, 7, 8, 11, 12, 16, 17, 18, 21, 22]);

// Per-sentence cinematic camera motion & VFX presets (1..25)
const CARD_CINEMA_PRESETS = {
  1:  { imgId: 1,  motion: 'dance',   fx: 'confetti' },
  2:  { imgId: 2,  motion: 'panR',    fx: 'motes' },
  3:  { imgId: 3,  motion: 'zoomIn',  fx: 'motes' },
  4:  { imgId: 4,  motion: 'zoomIn',  fx: 'sad' },
  5:  { imgId: 3,  motion: 'panL',    fx: 'think' },
  6:  { imgId: 6,  motion: 'eureka',  fx: 'sparkles' },
  7:  { imgId: 7,  motion: 'panR',    fx: 'sparkles' },
  8:  { imgId: 8,  motion: 'bounce',  fx: 'sparkles' },
  9:  { imgId: null, fallback: 'rabbit' },
  10: { imgId: null, fallback: 'cow' },
  11: { imgId: 11, motion: 'panL',    fx: 'sparkles' },
  12: { imgId: 12, motion: 'zoomIn',  fx: 'motes' },
  13: { imgId: 12, motion: 'shake',   fx: 'noBurst' },
  14: { imgId: 12, motion: 'panR',    fx: 'think' },
  15: { imgId: null, fallback: 'cat_mouse' },
  16: { imgId: 16, motion: 'zoomIn',  fx: 'steam' },
  17: { imgId: 17, motion: 'sway',    fx: 'sparkles' },
  18: { imgId: 18, motion: 'sway',    fx: 'notes' },
  19: { imgId: 21, motion: 'zoomOut', fx: 'sad', tint: 'rgba(30, 58, 138, 0.24)' },
  20: { imgId: 21, motion: 'panL',    fx: 'think', tint: 'rgba(30, 41, 59, 0.14)' },
  21: { imgId: 21, motion: 'eureka',  fx: 'sparkles' },
  22: { imgId: 22, motion: 'dance',   fx: 'sparkles' },
  23: { imgId: 1,  motion: 'dance',   fx: 'confetti' },
  24: { imgId: 22, motion: 'dance',   fx: 'confetti' },
  25: { imgId: 1,  motion: 'eureka',  fx: 'confetti' },
};

const SCENE_IMG_CACHE = new Map();

function getSceneImage(num) {
  if (!num || !GENERATED_SCENE_IDS.has(num)) return null;
  if (SCENE_IMG_CACHE.has(num)) return SCENE_IMG_CACHE.get(num);
  const img = new Image();
  const padded = String(num).padStart(2, '0');
  img.src = `assets/scenes/scene_${padded}.jpg`;
  SCENE_IMG_CACHE.set(num, img);
  return img;
}

function renderCinemaVfx(ctx, W, H, t, fx) {
  if (fx === 'motes') {
    for (let i = 0; i < 12; i++) {
      const x = ((i * 53 + t * 12) % (W + 20)) - 10;
      const y = ((i * 31 + Math.sin(t * 1.6 + i) * 14) % H + H) % H;
      ctx.fillStyle = `rgba(254, 240, 138, ${0.35 + Math.sin(t * 3 + i) * 0.25})`;
      ctx.beginPath();
      ctx.arc(x, y, 2.2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (fx === 'sparkles') {
    const cols = ['#FEF08A', '#FFFFFF', '#FDE047', '#F472B6'];
    for (let i = 0; i < 7; i++) {
      const sx = ((i * 61 + 28) % (W - 30)) + 15;
      const sy = ((i * 29 + 18) % (H - 30)) + 15 + Math.sin(t * 2.5 + i) * 6;
      const r = 3.5 + Math.abs(Math.sin(t * 4.5 + i * 1.1)) * 4.5;
      drawSparkle(ctx, sx, sy, r, cols[i % cols.length]);
    }
  } else if (fx === 'confetti') {
    const cols = ['#F43F5E', '#FACC15', '#38BDF8', '#4ADE80', '#C084FC', '#FB923C'];
    for (let i = 0; i < 16; i++) {
      const cx = (i * 37 + Math.sin(t * 2.4 + i) * 14 + W) % W;
      const cy = ((t * (38 + (i % 4) * 10) + i * 23) % (H + 16)) - 8;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 4 + i);
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(-3.5, -2.5, 7, 5);
      ctx.restore();
    }
  } else if (fx === 'notes') {
    const notes = ['🎵', '🎶', '🎵', '🎶', '✨'];
    ctx.font = 'bold 18px sans-serif';
    notes.forEach((n, i) => {
      const p = (t * 0.45 + i * 0.2) % 1;
      const nx = W * (0.16 + i * 0.17) + Math.sin(t * 3.5 + i) * 10;
      const ny = H * 0.82 - p * (H * 0.72);
      ctx.globalAlpha = Math.sin(p * Math.PI);
      ctx.fillText(n, nx, ny);
    });
    ctx.globalAlpha = 1;
  } else if (fx === 'steam') {
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.55 + i * 0.17) % 1;
      const sx = W * 0.5 + (i - 2.5) * 16 + Math.sin(t * 3 + i) * 8;
      const sy = H * 0.78 - p * (H * 0.65);
      ctx.fillStyle = `rgba(255, 255, 255, ${(1 - p) * 0.55})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 6 + p * 12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (fx === 'noBurst') {
    const pulse = 1 + Math.sin(t * 14) * 0.14;
    ctx.save();
    ctx.translate(W * 0.78, H * 0.26);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.92)';
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, -7); ctx.lineTo(7, 7);
    ctx.moveTo(7, -7); ctx.lineTo(-7, 7);
    ctx.stroke();
    ctx.restore();
  } else if (fx === 'sad') {
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.5 + i * 0.18) % 1;
      const rx = W * (0.15 + i * 0.14);
      const ry = p * H;
      ctx.fillStyle = `rgba(147, 197, 253, ${Math.sin(p * Math.PI) * 0.65})`;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 2, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (fx === 'think') {
    ctx.font = 'bold 18px sans-serif';
    ['💭', '❓', '✨'].forEach((ch, i) => {
      const p = (t * 0.4 + i * 0.33) % 1;
      ctx.globalAlpha = Math.sin(p * Math.PI);
      ctx.fillText(ch, W * (0.22 + i * 0.28), H * 0.36 - p * 18);
    });
    ctx.globalAlpha = 1;
  }
}

function renderZootopiaScene(ctx, W, H, t, img, preset) {
  const iw = img.naturalWidth || 16;
  const ih = img.naturalHeight || 9;
  const baseScale = Math.max(W / iw, H / ih);

  let zoom = 1.06;
  let ox = 0;
  let oy = 0;
  let rot = 0;
  const wave = Math.sin(t * 0.85);
  const fast = Math.sin(t * 6.5);

  if (preset.motion === 'zoomIn') {
    zoom = 1.04 + ((t % 6) / 6) * 0.14;
  } else if (preset.motion === 'zoomOut') {
    zoom = 1.18 - ((t % 6) / 6) * 0.12;
  } else if (preset.motion === 'panR') {
    zoom = 1.14;
    ox = -wave * (W * 0.055);
  } else if (preset.motion === 'panL') {
    zoom = 1.14;
    ox = wave * (W * 0.055);
  } else if (preset.motion === 'dance') {
    zoom = 1.08 + Math.abs(fast) * 0.05;
    oy = -Math.abs(fast) * 5;
    rot = Math.sin(t * 3.2) * 0.018;
  } else if (preset.motion === 'bounce') {
    zoom = 1.08 + Math.abs(Math.sin(t * 4.2)) * 0.04;
    oy = -Math.abs(Math.sin(t * 4.2)) * 4;
  } else if (preset.motion === 'eureka') {
    zoom = 1.05 + (Math.sin(t * 1.4) + 1) * 0.06;
  } else if (preset.motion === 'shake') {
    zoom = 1.16;
    ox = Math.sin(t * 28) * 5;
    oy = Math.cos(t * 24) * 2.5;
  } else if (preset.motion === 'sway') {
    zoom = 1.1;
    ox = Math.sin(t * 2.4) * 8;
    rot = Math.sin(t * 2.4) * 0.015;
  }

  ctx.save();
  ctx.translate(W * 0.5 + ox, H * 0.5 + oy);
  ctx.rotate(rot);
  const dw = iw * baseScale * zoom;
  const dh = ih * baseScale * zoom;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  if (preset.tint) {
    ctx.fillStyle = preset.tint;
    ctx.fillRect(0, 0, W, H);
  }

  // Subtle warm cinema vignette
  const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.25, W * 0.5, H * 0.5, W * 0.65);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(15,23,42,0.22)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  renderCinemaVfx(ctx, W, H, t, preset.fx);
}

export class StoryCartoonPlayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.spotId = null;
    this.cardId = null;
    this.rafId = null;
    this.startTs = 0;
  }

  play(spotId, cardId = null) {
    const changed = this.spotId !== spotId || this.cardId !== cardId;
    this.spotId = spotId || 'pig_finale';
    this.cardId = cardId;
    if (changed) this.startTs = performance.now();

    const preset = cardId ? CARD_CINEMA_PRESETS[cardId] : null;
    if (preset?.imgId) getSceneImage(preset.imgId);

    if (!this.canvas) return;
    if (!this.rafId) {
      this.startTs = performance.now();
      const tick = (now) => {
        this.rafId = requestAnimationFrame(tick);
        if (!this.canvas || !this.canvas.isConnected) {
          this.stop();
          return;
        }
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const tw = Math.round(rect.width * dpr);
        const th = Math.round(rect.height * dpr);
        if (this.canvas.width !== tw || this.canvas.height !== th) {
          this.canvas.width = tw;
          this.canvas.height = th;
        }
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        ctx.save();
        ctx.scale(dpr, dpr);
        const elapsed = (now - this.startTs) / 1000;
        const activePreset = this.cardId ? CARD_CINEMA_PRESETS[this.cardId] : null;
        const img = activePreset?.imgId ? getSceneImage(activePreset.imgId) : null;
        if (img && img.complete && img.naturalWidth > 0) {
          renderZootopiaScene(ctx, rect.width, rect.height, elapsed, img, activePreset);
        } else {
          const fallbackKey = activePreset?.fallback || this.spotId;
          const fn = SCENE_RENDERERS[fallbackKey] || renderPigDance;
          fn(ctx, rect.width, rect.height, elapsed);
        }
        ctx.restore();
      };
      this.rafId = requestAnimationFrame(tick);
    }
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
