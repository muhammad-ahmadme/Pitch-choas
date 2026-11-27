import { SoccerEngine } from './engine';
import {
  GOAL_DEPTH,
  GROUND_Y,
  PITCH_LEFT,
  PITCH_RIGHT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './mutators';
import { BallEntity, ChaosOrb, NetNode, PlayerEntity } from './types';

export function renderGame(
  ctx: CanvasRenderingContext2D,
  engine: SoccerEngine,
  viewportW: number,
  viewportH: number
): void {
  const m = engine.mutator;
  if (viewportW < 1 || viewportH < 1) return;
  ctx.save();

  // Dynamic fit: always fill the viewport width so the pitch spans edge to
  // edge on any display. Vertical alignment adapts to the aspect ratio:
  // wide screens bottom-align (cropping sky, keeping the ground line and
  // apron visible), narrow/portrait screens center (letterbox bars above
  // and below, never cropping the goals sideways).
  const scale = viewportW / WORLD_WIDTH;
  const viewportAspect = viewportW / viewportH;
  const worldAspect = WORLD_WIDTH / WORLD_HEIGHT;
  const isWide = viewportAspect >= worldAspect;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, viewportH);
  skyGrad.addColorStop(0, m.skyTop);
  skyGrad.addColorStop(0.76, m.skyBottom);
  skyGrad.addColorStop(0.761, m.turfSecondary);
  skyGrad.addColorStop(1, '#050811');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, viewportW, viewportH);

  let shakeX = 0;
  let shakeY = 0;
  if (engine.shakeTime > 0) {
    const decay = engine.shakeTime / 0.46;
    const mag = engine.shakeMagnitude * Math.min(1, decay + 0.25);
    shakeX = (Math.random() - 0.5) * 2 * mag;
    shakeY = (Math.random() - 0.5) * 2 * mag;
  }

  const offsetX = shakeX * scale;
  const offsetY = isWide
    ? viewportH - WORLD_HEIGHT * scale + shakeY * scale
    : (viewportH - WORLD_HEIGHT * scale) * 0.5 + shakeY * scale;

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // 1. Stadium backdrop & atmospheric sky
  drawStadiumBackdrop(ctx, engine);

  // 2. Ambient particles
  drawAmbientParticles(ctx, engine);

  // 3. Pitch surface, mirror ice reflections, skid marks & chalk lines
  drawPitchSurface(ctx, engine);

  // 4. Back layer of dynamic-height goals & deformable nets
  drawGoalBackAndNet(ctx, 'left', engine.leftNet, engine.leftGoalHeight, m.id === 'heavy_steel');
  drawGoalBackAndNet(ctx, 'right', engine.rightNet, engine.rightGoalHeight, m.id === 'heavy_steel');

  // 5. Ground shadows for players & all balls
  drawGroundShadows(ctx, engine);

  // 6. Chaos Power-Up Orbs floating over midfield
  for (const orb of engine.orbs) {
    drawChaosOrb(ctx, engine, orb);
  }

  // 7. Predictive shot trajectory arc for players in strike range
  drawPredictiveAimArcs(ctx, engine);

  // 8. Players with Overdrive/Freeze/Magnet VFX
  for (const player of engine.players) {
    drawPlayer(ctx, engine, player);
  }

  // 9. Tapered trails & all active balls (including Golden +2 Ball)
  for (const b of engine.balls) {
    drawBallTrail(ctx, b);
    drawBall(ctx, engine, b);
  }

  // 10. Front goalposts, crossbars & Goal Shield energy barrier
  drawGoalFrontFrame(
    ctx,
    'left',
    engine.leftGoalHeight,
    m.id === 'heavy_steel',
    engine.activePowerup?.type === 'goal_shield' && engine.activePowerup.owner === 'blue'
  );
  drawGoalFrontFrame(
    ctx,
    'right',
    engine.rightGoalHeight,
    m.id === 'heavy_steel',
    engine.activePowerup?.type === 'goal_shield' && engine.activePowerup.owner === 'red'
  );

  // 11. Shockwaves, particles & callouts
  drawShockwaves(ctx, engine);
  drawParticles(ctx, engine);
  drawCallouts(ctx, engine);

  // 12. Volumetric dust motes & vignette
  drawDustMotes(ctx, engine);
  drawStadiumVignette(ctx, engine);

  ctx.restore();

  // Screen-space flash so letterbox bars on narrow screens flash too.
  if (engine.flashAlpha > 0.01) {
    ctx.fillStyle = `rgba(255, 255, 255, ${engine.flashAlpha * 0.38})`;
    ctx.fillRect(0, 0, viewportW, viewportH);
  }
}

function drawStadiumBackdrop(ctx: CanvasRenderingContext2D, engine: SoccerEngine): void {
  const m = engine.mutator;
  const bleed = 360;

  const grad = ctx.createLinearGradient(0, -140, 0, GROUND_Y);
  grad.addColorStop(0, m.skyTop);
  grad.addColorStop(0.68, m.skyBottom);
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(-bleed, -220, WORLD_WIDTH + bleed * 2, GROUND_Y + 220);

  if (m.id === 'ice_rink') {
    drawAuroraBorealis(ctx, engine.time);
  } else if (m.id === 'beach_volley') {
    drawBeachHorizon(ctx, engine.time);
  } else if (m.id === 'lunar_dome') {
    drawLunarDomeSky(ctx, engine.time);
  } else if (m.id === 'heavy_steel') {
    drawFoundryBackdrop(ctx, engine.time);
  } else {
    drawChampionshipSky(ctx, engine.time);
  }

  if (m.id !== 'beach_volley' && m.id !== 'lunar_dome') {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.beginPath();
    ctx.moveTo(-bleed, 118);
    ctx.lineTo(220, 62);
    ctx.lineTo(WORLD_WIDTH - 220, 62);
    ctx.lineTo(WORLD_WIDTH + bleed, 118);
    ctx.lineTo(WORLD_WIDTH + bleed, -180);
    ctx.lineTo(-bleed, -180);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.lineWidth = 2;
    for (let x = 40; x <= WORLD_WIDTH - 40; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x + 45, 28);
      ctx.lineTo(x + 90, 64);
      ctx.stroke();
    }
  }

  const standTop = GROUND_Y - 122;
  const standGrad = ctx.createLinearGradient(0, standTop, 0, GROUND_Y);
  standGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
  standGrad.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
  ctx.fillStyle = standGrad;
  ctx.fillRect(-bleed, standTop, WORLD_WIDTH + bleed * 2, 122);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fillRect(-bleed, GROUND_Y - 92, WORLD_WIDTH + bleed * 2, 2);
  ctx.fillRect(-bleed, GROUND_Y - 62, WORLD_WIDTH + bleed * 2, 2);

  const excite = engine.crowdExcitement;
  for (let row = 0; row < 2; row++) {
    const baseY = row === 0 ? GROUND_Y - 78 : GROUND_Y - 48;
    const step = row === 0 ? 22 : 20;
    const offset = row === 0 ? 10 : 0;
    for (let cx = 20 + offset; cx < WORLD_WIDTH - 10; cx += step) {
      const wave =
        Math.sin(engine.time * (3.4 + excite * 14) + cx * 0.17 + row * 1.3) *
        (1.6 + excite * 12);
      const cy = baseY - Math.abs(wave);
      const isBlueFan = (cx + row * 7) % 3 === 0;
      const isRedFan = (cx + row * 5) % 3 === 1;

      ctx.fillStyle =
        row === 0
          ? isBlueFan
            ? 'rgba(56, 189, 248, 0.30)'
            : isRedFan
              ? 'rgba(251, 113, 133, 0.30)'
              : 'rgba(148, 163, 184, 0.22)'
          : isBlueFan
            ? 'rgba(56, 189, 248, 0.52)'
            : isRedFan
              ? 'rgba(251, 113, 133, 0.52)'
              : 'rgba(203, 213, 225, 0.36)';

      ctx.beginPath();
      ctx.arc(cx, cy - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(cx - 5.5, cy - 2, 11, 14, 3);
      ctx.fill();

      if (excite > 0.25 && cx % 40 === 0) {
        ctx.strokeStyle = isBlueFan ? '#38bdf8' : '#fb7185';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx + 4, cy - 4);
        ctx.lineTo(
          cx + 10 + Math.sin(engine.time * 18 + cx) * 5,
          cy - 18 - excite * 8
        );
        ctx.stroke();
      }
    }
  }

  drawLedRibbonBoard(ctx, engine.time, engine.isMatchPoint());
}

function drawChampionshipSky(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
  for (let x = 0; x < WORLD_WIDTH; x += 64) {
    const h = 150 + ((x * 37) % 85);
    ctx.fillRect(x, GROUND_Y - h, 52, h);
  }

  const towers = [175, WORLD_WIDTH - 175];
  for (let idx = 0; idx < towers.length; idx++) {
    const tx = towers[idx];
    const sweep = Math.sin(time * 0.45 + idx * 1.8) * 42;

    ctx.save();
    const beamGrad = ctx.createLinearGradient(tx, 52, WORLD_WIDTH / 2 + sweep, GROUND_Y);
    beamGrad.addColorStop(0, 'rgba(241, 245, 249, 0.28)');
    beamGrad.addColorStop(0.55, 'rgba(186, 230, 253, 0.11)');
    beamGrad.addColorStop(1, 'rgba(226, 232, 240, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(tx - 32, 56);
    ctx.lineTo(tx + 32, 56);
    ctx.lineTo(tx + (tx < 640 ? 540 : 140) + sweep, GROUND_Y);
    ctx.lineTo(tx - (tx < 640 ? 140 : 540) + sweep, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Volumetric floodlight lens bloom
    const lensGlow = ctx.createRadialGradient(tx, 48, 8, tx, 48, 120);
    lensGlow.addColorStop(0, 'rgba(224, 242, 254, 0.42)');
    lensGlow.addColorStop(0.5, 'rgba(56, 189, 248, 0.12)');
    lensGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = lensGlow;
    ctx.beginPath();
    ctx.arc(tx, 48, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(tx - 38, 36, 76, 24, 5);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = '#e0f2fe';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#f8fafc';
    for (let bx = -28; bx <= 20; bx += 12) {
      ctx.fillRect(tx + bx, 42, 8, 12);
    }
    ctx.restore();
  }
}

function drawAuroraBorealis(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  for (let band = 0; band < 3; band++) {
    const grad = ctx.createLinearGradient(0, 70 + band * 35, 0, 290 + band * 30);
    grad.addColorStop(0, 'rgba(34, 211, 238, 0)');
    grad.addColorStop(0.5, band === 1 ? 'rgba(52, 211, 153, 0.16)' : 'rgba(56, 189, 248, 0.18)');
    grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-100, 260);
    for (let x = -100; x <= WORLD_WIDTH + 100; x += 60) {
      const y =
        145 +
        band * 36 +
        Math.sin(x * 0.006 + time * (0.7 + band * 0.25) + band) * 38;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(WORLD_WIDTH + 100, 340);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBeachHorizon(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  const sunX = WORLD_WIDTH * 0.5;
  const sunY = GROUND_Y - 195;
  const bloom = ctx.createRadialGradient(sunX, sunY, 24, sunX, sunY, 260);
  bloom.addColorStop(0, 'rgba(254, 240, 138, 0.72)');
  bloom.addColorStop(0.4, 'rgba(251, 146, 60, 0.34)');
  bloom.addColorStop(1, 'rgba(251, 146, 60, 0)');
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 260, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 64, 0, Math.PI * 2);
  ctx.fill();

  const oceanGrad = ctx.createLinearGradient(0, GROUND_Y - 140, 0, GROUND_Y - 82);
  oceanGrad.addColorStop(0, '#0284c7');
  oceanGrad.addColorStop(1, '#0369a1');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(-300, GROUND_Y - 140, WORLD_WIDTH + 600, 62);

  ctx.fillStyle = 'rgba(253, 224, 71, 0.38)';
  for (let i = 0; i < 10; i++) {
    const w = 120 - i * 8;
    const shimmer = Math.sin(time * 2.5 + i * 0.9) * 14;
    ctx.fillRect(sunX - w / 2 + shimmer, GROUND_Y - 134 + i * 5, w, 2);
  }

  const palms = [
    { x: 58, scale: 1.0 },
    { x: WORLD_WIDTH - 58, scale: -1.0 },
  ];
  for (const palm of palms) {
    ctx.save();
    ctx.translate(palm.x, GROUND_Y - 60);
    ctx.scale(palm.scale, 1);
    const sway = Math.sin(time * 1.4 + palm.x) * 0.05;
    ctx.rotate(sway);
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.quadraticCurveTo(18, -95, 36, -185);
    ctx.stroke();

    ctx.fillStyle = '#0c0a09';
    for (let f = 0; f < 5; f++) {
      ctx.save();
      ctx.translate(36, -185);
      ctx.rotate(-1.3 + f * 0.65);
      ctx.beginPath();
      ctx.ellipse(38, 0, 44, 10, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawLunarDomeSky(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  const ex = WORLD_WIDTH * 0.74;
  const ey = 148;
  const glow = ctx.createRadialGradient(ex, ey, 36, ex, ey, 95);
  glow.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
  glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(ex, ey, 95, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(ex, ey, 48, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(ex, ey, 48, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.ellipse(ex - 14, ey - 8, 18, 12, 0.3, 0, Math.PI * 2);
  ctx.ellipse(ex + 16, ey + 14, 22, 11, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(248, 250, 252, 0.45)';
  ctx.fillRect(ex - 48 + Math.sin(time * 0.3) * 8, ey - 20, 62, 7);
  ctx.fillRect(ex - 16 - Math.sin(time * 0.3) * 8, ey + 6, 54, 6);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.48)';
  ctx.beginPath();
  ctx.arc(ex + 22, ey + 10, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(WORLD_WIDTH / 2, GROUND_Y - 80, 670, 390, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  for (let i = 1; i < 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const rx = WORLD_WIDTH / 2 + Math.cos(a) * 670;
    const ry = GROUND_Y - 80 + Math.sin(a) * 390;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(WORLD_WIDTH / 2 + Math.cos(a) * 460, GROUND_Y - 80 + Math.sin(a) * 230);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFoundryBackdrop(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  for (let x = 180; x < WORLD_WIDTH - 100; x += 280) {
    const pulse = 0.25 + 0.12 * Math.sin(time * 2.5 + x);
    const g = ctx.createRadialGradient(x, GROUND_Y - 135, 10, x, GROUND_Y - 135, 120);
    g.addColorStop(0, `rgba(249, 115, 22, ${pulse})`);
    g.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, GROUND_Y - 135, 120, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLedRibbonBoard(
  ctx: CanvasRenderingContext2D,
  time: number,
  isMatchPoint: boolean
): void {
  const y = GROUND_Y - 24;
  const w = PITCH_RIGHT - PITCH_LEFT + 36;
  const x = PITCH_LEFT - 18;

  ctx.save();
  ctx.fillStyle = '#020617';
  ctx.fillRect(x, y, w, 24);

  ctx.beginPath();
  ctx.rect(x, y, w, 24);
  ctx.clip();

  const shift = (time * (isMatchPoint ? 140 : 85)) % 80;
  for (let bx = x - 80 + shift; bx < x + w + 80; bx += 80) {
    ctx.fillStyle = isMatchPoint
      ? 'rgba(251, 191, 36, 0.34)'
      : Math.floor(bx / 80) % 2 === 0
        ? 'rgba(56, 189, 248, 0.22)'
        : 'rgba(251, 113, 133, 0.22)';
    ctx.beginPath();
    ctx.moveTo(bx, y + 24);
    ctx.lineTo(bx + 18, y);
    ctx.lineTo(bx + 42, y);
    ctx.lineTo(bx + 24, y + 24);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = isMatchPoint
    ? `rgba(251, 191, 36, ${0.55 + 0.35 * Math.sin(time * 7)})`
    : 'rgba(251, 191, 36, 0.55)';
  ctx.fillRect(x, y, w, 2.5);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(x, y + 21, w, 3);
  ctx.restore();
}

function drawPitchSurface(ctx: CanvasRenderingContext2D, engine: SoccerEngine): void {
  const m = engine.mutator;
  const bleed = 360;

  ctx.fillStyle = m.turfPrimary;
  ctx.fillRect(-bleed, GROUND_Y, WORLD_WIDTH + bleed * 2, WORLD_HEIGHT - GROUND_Y + 260);

  const stripeWidth = 89.3;
  ctx.fillStyle = m.turfSecondary;
  for (let i = 0; i < 12; i += 2) {
    const sx = PITCH_LEFT + i * stripeWidth;
    ctx.beginPath();
    ctx.moveTo(sx, GROUND_Y);
    ctx.lineTo(sx + stripeWidth, GROUND_Y);
    ctx.lineTo(sx + stripeWidth - 18, GROUND_Y + 44);
    ctx.lineTo(sx - 18, GROUND_Y + 44);
    ctx.closePath();
    ctx.fill();
  }

  // Painted pitch field markings (touchlines, penalty boxes & center circle arc)
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(WORLD_WIDTH / 2, GROUND_Y + 14, 78, 12, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeRect(PITCH_LEFT, GROUND_Y + 4, 150, 26);
  ctx.strokeRect(PITCH_RIGHT - 150, GROUND_Y + 4, 150, 26);
  ctx.restore();

  // Cryo Freeze visual overlay on frozen team's half
  if (engine.activePowerup?.type === 'freeze') {
    const frozenHalfLeft = engine.activePowerup.owner === 'red';
    const fx = frozenHalfLeft ? PITCH_LEFT - 40 : WORLD_WIDTH / 2;
    const fw = WORLD_WIDTH / 2 - PITCH_LEFT + 40;
    ctx.fillStyle = 'rgba(103, 232, 249, 0.38)';
    ctx.fillRect(fx, GROUND_Y, fw, 32);
  }

  if (m.id === 'ice_rink') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(PITCH_LEFT - 60, GROUND_Y, PITCH_RIGHT - PITCH_LEFT + 120, 44);
    ctx.clip();

    ctx.globalAlpha = 0.2;
    for (const p of engine.players) {
      const distFromGround = Math.max(0, GROUND_Y - 44 - p.y);
      ctx.fillStyle = p.team === 'blue' ? '#38bdf8' : '#fb7185';
      ctx.beginPath();
      ctx.ellipse(p.x, GROUND_Y + 14 + distFromGround * 0.15, 16, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of engine.balls) {
      ctx.fillStyle = b.isGolden ? '#fbbf24' : '#ffffff';
      ctx.beginPath();
      ctx.ellipse(
        b.x,
        GROUND_Y + 10 + Math.max(0, GROUND_Y - b.y) * 0.12,
        b.r * 0.85,
        b.r * 0.45,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    for (let fx = PITCH_LEFT + 60; fx < PITCH_RIGHT - 40; fx += 190) {
      ctx.beginPath();
      ctx.moveTo(fx, GROUND_Y + 5);
      ctx.lineTo(fx + 28, GROUND_Y + 18);
      ctx.lineTo(fx + 14, GROUND_Y + 34);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(PITCH_LEFT - 60, GROUND_Y, PITCH_RIGHT - PITCH_LEFT + 120, 5);
  } else if (m.id !== 'beach_volley' && m.id !== 'lunar_dome') {
    ctx.fillStyle = m.turfPrimary;
    for (let gx = PITCH_LEFT - 40; gx < PITCH_RIGHT + 40; gx += 14) {
      ctx.beginPath();
      ctx.moveTo(gx, GROUND_Y + 1);
      ctx.lineTo(gx + 3, GROUND_Y - 5);
      ctx.lineTo(gx + 6, GROUND_Y + 1);
      ctx.fill();
    }
  }

  for (const s of engine.skidMarks) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, s.alpha);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.ellipse(s.x, GROUND_Y + 5, s.width * 0.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const apronGrad = ctx.createLinearGradient(0, GROUND_Y + 28, 0, WORLD_HEIGHT + 160);
  apronGrad.addColorStop(0, 'rgba(2, 6, 23, 0.28)');
  apronGrad.addColorStop(0.45, 'rgba(2, 6, 23, 0.78)');
  apronGrad.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
  ctx.fillStyle = apronGrad;
  ctx.fillRect(-bleed, GROUND_Y + 28, WORLD_WIDTH + bleed * 2, WORLD_HEIGHT - GROUND_Y + 200);

  ctx.strokeStyle = m.lineColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(PITCH_LEFT - GOAL_DEPTH, GROUND_Y + 2);
  ctx.lineTo(PITCH_RIGHT + GOAL_DEPTH, GROUND_Y + 2);
  ctx.stroke();

  ctx.fillStyle = m.lineColor;
  ctx.fillRect(WORLD_WIDTH / 2 - 3, GROUND_Y, 6, 18);
  ctx.fillRect(PITCH_LEFT + 145, GROUND_Y, 4, 13);
  ctx.fillRect(PITCH_RIGHT - 149, GROUND_Y, 4, 13);
}

function drawChaosOrb(
  ctx: CanvasRenderingContext2D,
  engine: SoccerEngine,
  orb: ChaosOrb
): void {
  const colorMap: Record<ChaosOrb['type'], string> = {
    golden_ball: '#fbbf24',
    giant_goal: '#c084fc',
    magnet: '#38bdf8',
    freeze: '#22d3ee',
  };
  const color = colorMap[orb.type];

  ctx.save();
  ctx.translate(orb.x, orb.y);

  // Outer radial glow
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, orb.r * 2.1);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, orb.r * 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Rotating orbital ring
  ctx.save();
  ctx.rotate(engine.time * 2.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, orb.r + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Core orb
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, orb.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crisp icon glyph
  ctx.fillStyle = color;
  ctx.font = '800 16px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph =
    orb.type === 'golden_ball'
      ? '+2'
      : orb.type === 'giant_goal'
        ? 'GOAL+'
        : orb.type === 'magnet'
          ? 'MAG'
          : 'ICE';
  ctx.fillText(glyph, 0, 1);

  ctx.restore();
}

function drawPredictiveAimArcs(ctx: CanvasRenderingContext2D, engine: SoccerEngine): void {
  if (engine.phase !== 'PLAYING') return;
  const g = engine.mutator.gravity;

  for (const p of engine.players) {
    for (const b of engine.balls) {
      const dist = Math.hypot(b.x - p.x, b.y - p.y);
      if (dist < 78) {
        const isOverdrive =
          (p.team === 'blue' ? engine.blueOverdrive : engine.redOverdrive) >= 100;
        const mult = isOverdrive ? 1.42 : 1.0;
        const speed = (770 * mult) / Math.sqrt(b.mass);
        const vx = p.facing * 0.84 * speed;
        const vy = -0.56 * speed;

        ctx.save();
        ctx.strokeStyle = isOverdrive
          ? 'rgba(251, 191, 36, 0.55)'
          : p.team === 'blue'
            ? 'rgba(56, 189, 248, 0.32)'
            : 'rgba(251, 113, 133, 0.32)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        for (let step = 1; step <= 6; step++) {
          const t = step * 0.045;
          const px = b.x + vx * t;
          const py = b.y + vy * t + 0.5 * g * t * t;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
        break;
      }
    }
  }
}

function drawGoalBackAndNet(
  ctx: CanvasRenderingContext2D,
  side: 'left' | 'right',
  net: NetNode[],
  goalHeight: number,
  industrial: boolean
): void {
  if (net.length < 2) return;
  const topY = GROUND_Y - goalHeight;
  const frontX = side === 'left' ? PITCH_LEFT : PITCH_RIGHT;
  const backX = side === 'left' ? PITCH_LEFT - GOAL_DEPTH : PITCH_RIGHT + GOAL_DEPTH;

  ctx.save();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.42)';
  ctx.beginPath();
  ctx.moveTo(frontX, GROUND_Y);
  for (const n of net) {
    ctx.lineTo(n.x, n.y);
  }
  ctx.lineTo(frontX, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(248, 250, 252, 0.78)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(net[0].x, net[0].y);
  for (let i = 1; i < net.length; i++) {
    ctx.lineTo(net[i].x, net[i].y);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.28)';
  ctx.lineWidth = 1.4;
  for (let i = 1; i < net.length - 1; i++) {
    const n = net[i];
    ctx.beginPath();
    ctx.moveTo(n.x, n.y);
    ctx.lineTo(
      side === 'left' ? Math.min(frontX, n.x + GOAL_DEPTH * 0.92) : Math.max(frontX, n.x - GOAL_DEPTH * 0.92),
      i < 4 ? GROUND_Y : n.y
    );
    ctx.stroke();
  }

  for (let row = 1; row <= 5; row++) {
    const y = topY + 12 + (row / 6) * (goalHeight - 12);
    const backIdx = Math.min(net.length - 1, 4 + row);
    ctx.beginPath();
    ctx.moveTo(frontX, y);
    ctx.lineTo(net[backIdx]?.x ?? backX, net[backIdx]?.y ?? y);
    ctx.stroke();
  }

  ctx.strokeStyle = industrial ? '#f59e0b' : '#94a3b8';
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(backX, GROUND_Y);
  ctx.lineTo(backX, topY + 8);
  ctx.stroke();
  ctx.restore();
}

function drawGoalFrontFrame(
  ctx: CanvasRenderingContext2D,
  side: 'left' | 'right',
  goalHeight: number,
  industrial: boolean,
  shielded: boolean
): void {
  const x = side === 'left' ? PITCH_LEFT : PITCH_RIGHT;
  const topY = GROUND_Y - goalHeight;

  ctx.save();
  if (shielded) {
    const shieldGrad = ctx.createLinearGradient(x, topY, x, GROUND_Y);
    shieldGrad.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
    shieldGrad.addColorStop(1, 'rgba(56, 189, 248, 0.08)');
    ctx.fillStyle = shieldGrad;
    ctx.fillRect(side === 'left' ? x - 6 : x - 8, topY, 14, goalHeight);
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, GROUND_Y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const postGrad = ctx.createLinearGradient(x - 6, 0, x + 6, 0);
  postGrad.addColorStop(0, '#cbd5e1');
  postGrad.addColorStop(0.45, '#ffffff');
  postGrad.addColorStop(1, '#64748b');

  ctx.strokeStyle = postGrad;
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, GROUND_Y);
  ctx.lineTo(x, topY);
  ctx.stroke();

  if (industrial) {
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 4;
    for (let sy = GROUND_Y - 18; sy > topY + 12; sy -= 22) {
      ctx.beginPath();
      ctx.moveTo(x - 4, sy);
      ctx.lineTo(x + 4, sy - 10);
      ctx.stroke();
    }
  }

  const capColor = shielded ? '#22d3ee' : side === 'left' ? '#38bdf8' : '#fb7185';
  ctx.shadowColor = capColor;
  ctx.shadowBlur = shielded ? 18 : 12;
  ctx.fillStyle = capColor;
  ctx.beginPath();
  ctx.arc(x, topY, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawGroundShadows(ctx: CanvasRenderingContext2D, engine: SoccerEngine): void {
  for (const p of engine.players) {
    const height = Math.max(0, GROUND_Y - 44 - p.y);
    const scale = Math.max(0.35, 1 - height / 260);
    ctx.fillStyle = `rgba(2, 6, 23, ${0.4 * scale})`;
    ctx.beginPath();
    ctx.ellipse(p.x, GROUND_Y + 3, 25 * scale, 6.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const b of engine.balls) {
    const bHeight = Math.max(0, GROUND_Y - b.r - b.y);
    const bScale = Math.max(0.28, 1 - bHeight / 320);
    ctx.fillStyle = `rgba(2, 6, 23, ${0.42 * bScale})`;
    ctx.beginPath();
    ctx.ellipse(b.x, GROUND_Y + 3, b.r * 0.98 * bScale, 6.5 * bScale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  engine: SoccerEngine,
  p: PlayerEntity
): void {
  const isBlue = p.team === 'blue';
  const hasOverdrive = (isBlue ? engine.blueOverdrive : engine.redOverdrive) >= 100;
  const hasRocket =
    p.role === 'striker' && (isBlue ? engine.blueRocketReady : engine.redRocketReady);
  const isFrozen =
    engine.activePowerup?.type === 'freeze' && engine.activePowerup.owner !== p.team;
  const hasMagnet =
    (engine.activePowerup?.type === 'magnet' ||
      engine.activePowerup?.type === 'magnet_boot') &&
    engine.activePowerup.owner === p.team;
  const isTitan =
    engine.activePowerup?.type === 'titan_anchor' &&
    engine.activePowerup.owner === p.team &&
    p.role === 'keeper';
  const hasHammer =
    engine.activePowerup?.type === 'hammer_header' &&
    engine.activePowerup.owner === p.team;

  const jerseyTop =
    p.hitFlash > 0.2 ? '#ffffff' : isFrozen ? '#67e8f9' : p.kit.primary;
  const jerseyBottom =
    p.hitFlash > 0.2 ? '#f8fafc' : isFrozen ? '#0891b2' : p.kit.secondary;
  const jerseyTrim = p.kit.trim;
  const shortsColor = p.kit.shorts;
  const skinColor = p.profile.skinColor;
  const skinShadow = '#b77b51';
  const bootColor = hasOverdrive || hasRocket ? '#fbbf24' : p.kit.boot;

  const bodyScale = isTitan ? 1.24 : 1.0;
  const headScale =
    engine.mutator.headScale *
    p.profile.headScaleMult *
    (hasHammer ? 1.38 : 1.0);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(bodyScale, bodyScale);

  // Overdrive / Rocket / Titan aura
  if (hasOverdrive || hasRocket || isTitan) {
    const pulse = 0.28 + 0.16 * Math.sin(engine.time * 12);
    ctx.fillStyle = isTitan
      ? `rgba(56, 189, 248, ${pulse})`
      : `rgba(251, 191, 36, ${pulse})`;
    ctx.beginPath();
    ctx.ellipse(0, -6, 32, 52, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Magnet Boots wave rings
  if (hasMagnet) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 2;
    const rad = 22 + ((engine.time * 40) % 24);
    ctx.beginPath();
    ctx.arc(0, 20, rad, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.rotate(p.angle);
  ctx.scale(p.squashX, p.squashY);

  if (p.kickTimer > 0.04) {
    ctx.save();
    ctx.strokeStyle =
      hasOverdrive || hasRocket
        ? 'rgba(251, 191, 36, 0.85)'
        : `${p.kit.boot}88`;
    ctx.lineWidth = hasOverdrive || hasRocket ? 8 : 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (p.facing === 1) {
      ctx.arc(4, 14, 34, 0.3, Math.PI * 0.55);
    } else {
      ctx.arc(-4, 14, 34, Math.PI * 0.45, Math.PI - 0.3);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Back planted leg
  ctx.save();
  ctx.translate(-p.facing * 5, 14);
  ctx.fillStyle = shortsColor;
  ctx.beginPath();
  ctx.roundRect(-7, -2, 14, 15, 5);
  ctx.fill();
  ctx.fillStyle = skinShadow;
  ctx.fillRect(-4, 11, 8, 12);
  ctx.fillStyle = jerseyBottom;
  ctx.fillRect(-4.5, 16, 9, 8);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(p.facing === 1 ? -5 : -10, 22, 15, 9, 4);
  ctx.fill();
  ctx.restore();

  // Articulated kicking leg
  ctx.save();
  ctx.translate(p.facing * 4, 14);
  ctx.rotate(-p.facing * p.legAngle);
  ctx.fillStyle = shortsColor;
  ctx.beginPath();
  ctx.roundRect(-7, -2, 14, 15, 5);
  ctx.fill();
  ctx.fillStyle = skinColor;
  ctx.fillRect(-4, 11, 8, 13);
  ctx.fillStyle = jerseyTrim;
  ctx.fillRect(-4.5, 16, 9, 8);
  ctx.fillStyle = bootColor;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(p.facing === 1 ? -5 : -13, 22, 18, 10, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(p.facing === 1 ? -2 : -10, 31, 3, 2.5);
  ctx.fillRect(p.facing === 1 ? 6 : -2, 31, 3, 2.5);
  ctx.restore();

  // Torso
  const torsoGrad = ctx.createLinearGradient(0, -18, 0, 16);
  torsoGrad.addColorStop(0, jerseyTop);
  torsoGrad.addColorStop(1, jerseyBottom);
  ctx.fillStyle = torsoGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-14, -18, 28, 34, 9);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = jerseyTrim;
  ctx.fillRect(-12, -16, 6, 30);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.fillRect(-10, -16, 20, 3);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 15px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.number, 3, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(p.number, 2, -1);

  // Arm & Keeper Glove
  ctx.save();
  ctx.translate(p.facing * 4, -8);
  ctx.rotate(-p.facing * (p.kickTimer > 0 ? -0.7 : 0.25));
  ctx.fillStyle = torsoGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-5, 0, 10, 20, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.role === 'keeper' ? '#fbbf24' : skinColor;
  ctx.beginPath();
  ctx.arc(0, 21, p.role === 'keeper' ? (isTitan ? 9 : 6.8) : 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (p.role === 'keeper') ctx.stroke();
  ctx.restore();

  // Bobble head & eyes tracking primary ball
  ctx.save();
  ctx.translate(Math.sin(p.headBobAngle) * 5, -34);
  ctx.rotate(p.headBobAngle * 0.5);
  ctx.scale(headScale, headScale);

  // Hair styles behind/around head
  if (p.profile.hairStyle === 'afro') {
    ctx.fillStyle = p.profile.hairColor;
    ctx.beginPath();
    ctx.arc(-p.facing * 2, -5, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  const headGrad = ctx.createRadialGradient(-4, -5, 2, 0, 0, 17);
  headGrad.addColorStop(0, skinColor);
  headGrad.addColorStop(1, skinShadow);
  ctx.fillStyle = headGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.4 / Math.max(0.8, headScale);
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Distinct hair / headgear silhouette
  ctx.fillStyle = p.profile.hairColor;
  if (p.profile.hairStyle === 'spiky') {
    ctx.beginPath();
    ctx.moveTo(-14, -7);
    ctx.lineTo(-10, -20);
    ctx.lineTo(-3, -13);
    ctx.lineTo(3, -22);
    ctx.lineTo(9, -13);
    ctx.lineTo(15, -18);
    ctx.lineTo(14, -6);
    ctx.closePath();
    ctx.fill();
  } else if (p.profile.hairStyle === 'mohawk') {
    ctx.fillRect(-3, -23, 8, 14);
  } else if (p.profile.hairStyle === 'crown') {
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-11, -13);
    ctx.lineTo(-13, -24);
    ctx.lineTo(-4, -17);
    ctx.lineTo(0, -26);
    ctx.lineTo(4, -17);
    ctx.lineTo(13, -24);
    ctx.lineTo(11, -13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, -3, 15.6, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
  }

  // Headband or cyber visor
  if (p.profile.hairStyle === 'visor') {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-13, -6, 26, 7);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(p.facing * 2 - 4, -4.5, 10, 2);
  } else {
    ctx.fillStyle = hasOverdrive || hasRocket ? '#fbbf24' : p.kit.primary;
    ctx.fillRect(-14.5, -8, 29, 4.5);
  }

  // Eyes (skip standard eyeballs when wearing full visor unless subtle glint)
  const dx = engine.ball.x - p.x;
  const dy = engine.ball.y - (p.y - 34);
  const ballDist = Math.hypot(dx, dy);
  const lookAngle = Math.atan2(dy, dx) - p.angle;
  const pupilX = Math.cos(lookAngle) * 2.2;
  const pupilY = Math.sin(lookAngle) * 2.2;

  if (p.profile.hairStyle !== 'visor') {
    const eyeOffsetX = p.facing * 5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeOffsetX - 3.5, -1, 4.3, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + 4.5, -1, 4.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(eyeOffsetX - 3.5 + pupilX, -1 + pupilY, 2.2, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + 4.5 + pupilX, -1 + pupilY, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeOffsetX - 4.2 + pupilX, -1.8 + pupilY, 0.8, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + 3.8 + pupilX, -1.8 + pupilY, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#0f172a';
  ctx.fillStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  if (engine.phase === 'GOAL_CELEBRATION' && engine.lastScorer === p.team) {
    ctx.beginPath();
    ctx.arc(p.facing * 4, 6.5, 4.2, 0, Math.PI);
    ctx.fill();
  } else if (ballDist < 120 && Math.hypot(engine.ball.vx, engine.ball.vy) > 550) {
    ctx.beginPath();
    ctx.arc(p.facing * 4, 7.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(p.facing * 1, 7.5);
    ctx.lineTo(p.facing * 7, 7);
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

function drawBallTrail(ctx: CanvasRenderingContext2D, ball: BallEntity): void {
  if (ball.trail.length < 2) return;
  for (let i = 0; i < ball.trail.length; i++) {
    const t = ball.trail[i];
    const ratio = (i + 1) / ball.trail.length;
    const isBlazing = ball.isGolden || t.speed > 740;
    ctx.fillStyle = isBlazing
      ? `rgba(251, 146, 60, ${Math.max(0, t.alpha * 0.48 * ratio)})`
      : `rgba(226, 232, 240, ${Math.max(0, t.alpha * 0.25 * ratio)})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, ball.r * (0.35 + ratio * 0.62), 0, Math.PI * 2);
    ctx.fill();

    if (isBlazing && i > 0) {
      const prev = ball.trail[i - 1];
      ctx.strokeStyle = `rgba(254, 240, 138, ${Math.max(0, t.alpha * 0.52 * ratio)})`;
      ctx.lineWidth = Math.max(1.5, ratio * 4.5);
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }
  }
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  engine: SoccerEngine,
  ball: BallEntity
): void {
  const style = ball.isGolden ? 'lunar' : engine.mutator.ballStyle;

  ctx.save();
  ctx.translate(ball.x, ball.y);

  const speed = Math.hypot(ball.vx, ball.vy);
  if (ball.isGolden || speed > 720) {
    ctx.fillStyle = ball.isGolden ? 'rgba(251, 191, 36, 0.34)' : 'rgba(251, 191, 36, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, ball.r * 1.42, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.rotate(ball.squashAngle);
  ctx.scale(ball.squashX, ball.squashY);
  ctx.rotate(-ball.squashAngle + ball.angle);

  if (ball.isGolden) {
    const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, ball.r);
    g.addColorStop(0, '#fef9c3');
    g.addColorStop(0.55, '#fbbf24');
    g.addColorStop(1, '#b45309');
    ctx.fillStyle = g;
  } else if (style === 'steel') {
    const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, ball.r);
    g.addColorStop(0, '#f4f4f5');
    g.addColorStop(0.5, '#71717a');
    g.addColorStop(1, '#18181b');
    ctx.fillStyle = g;
  } else if (style === 'ice') {
    const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, ball.r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.65, '#bae6fd');
    g.addColorStop(1, '#0284c7');
    ctx.fillStyle = g;
  } else if (style === 'lunar') {
    const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, ball.r);
    g.addColorStop(0, '#fef9c3');
    g.addColorStop(0.65, '#f59e0b');
    g.addColorStop(1, '#92400e');
    ctx.fillStyle = g;
  } else if (style === 'beach') {
    ctx.fillStyle = '#ffffff';
  } else {
    const g = ctx.createRadialGradient(-ball.r * 0.3, -ball.r * 0.3, 2, 0, 0, ball.r);
    g.addColorStop(0, ball.hitFlash > 0.2 ? '#fef08a' : '#ffffff');
    g.addColorStop(0.72, '#e2e8f0');
    g.addColorStop(1, '#94a3b8');
    ctx.fillStyle = g;
  }

  ctx.beginPath();
  ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
  ctx.clip();

  if (ball.isGolden) {
    ctx.fillStyle = '#78350f';
    drawPentagon(ctx, 0, 0, ball.r * 0.36);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      drawPentagon(ctx, Math.cos(a) * ball.r * 0.88, Math.sin(a) * ball.r * 0.88, ball.r * 0.3);
    }
  } else if (style === 'beach') {
    const slices = ['#ef4444', '#facc15', '#3b82f6', '#22c55e'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = slices[i];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, ball.r + 2, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, ball.r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'steel') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(-ball.r * 0.36, -ball.r * 0.36, ball.r * 0.26, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'lunar') {
    ctx.fillStyle = 'rgba(120, 53, 15, 0.28)';
    ctx.beginPath();
    ctx.arc(-7, 5, 5, 0, Math.PI * 2);
    ctx.arc(8, -6, 4, 0, Math.PI * 2);
    ctx.arc(5, 9, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = style === 'ice' ? '#0369a1' : '#0f172a';
    drawPentagon(ctx, 0, 0, ball.r * 0.37);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      drawPentagon(ctx, Math.cos(a) * ball.r * 0.88, Math.sin(a) * ball.r * 0.88, ball.r * 0.32);
    }
  }
  ctx.restore();

  ctx.rotate(-ball.angle);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.beginPath();
  ctx.ellipse(-ball.r * 0.32, -ball.r * 0.36, ball.r * 0.28, ball.r * 0.14, -0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = ball.isGolden ? '#fef08a' : '#0f172a';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawPentagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
): void {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawShockwaves(ctx: CanvasRenderingContext2D, engine: SoccerEngine): void {
  for (const s of engine.shockwaves) {
    const alpha = Math.max(0, 1 - s.life / s.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lineWidth * alpha;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, engine: SoccerEngine): void {
  for (const p of engine.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'spark') {
      ctx.fillRect(-p.size * 1.8, -p.size * 0.45, p.size * 3.6, p.size * 0.9);
    } else {
      ctx.fillRect(-p.size * 0.6, -p.size * 0.35, p.size * 1.2, p.size * 0.7);
    }
    ctx.restore();
  }
}

function drawAmbientParticles(ctx: CanvasRenderingContext2D, engine: SoccerEngine): void {
  const mode = engine.mutator.ambientParticle;
  if (mode === 'none') return;

  for (const a of engine.ambientParticles) {
    ctx.save();
    ctx.globalAlpha = a.alpha;
    if (mode === 'snow') ctx.fillStyle = '#f8fafc';
    else if (mode === 'stars') ctx.fillStyle = '#e2e8f0';
    else if (mode === 'sparks') ctx.fillStyle = '#fb923c';
    else ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawDustMotes(ctx: CanvasRenderingContext2D, engine: SoccerEngine): void {
  ctx.save();
  for (const d of engine.dustMotes) {
    const mx = d.x + Math.sin(engine.time * d.speed + d.phase) * 18;
    const my = d.y + Math.cos(engine.time * d.speed * 0.7 + d.phase) * 10;
    const a = 0.08 + 0.08 * Math.sin(engine.time * 1.5 + d.phase);
    ctx.fillStyle = `rgba(248, 250, 252, ${a})`;
    ctx.beginPath();
    ctx.arc(mx, my, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStadiumVignette(ctx: CanvasRenderingContext2D, engine: SoccerEngine): void {
  const cx = WORLD_WIDTH / 2;
  const cy = WORLD_HEIGHT / 2;
  const g = ctx.createRadialGradient(cx, cy, 420, cx, cy, 920);
  g.addColorStop(0, 'rgba(2, 6, 23, 0)');
  g.addColorStop(1, 'rgba(2, 6, 23, 0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(-350, -250, WORLD_WIDTH + 700, WORLD_HEIGHT + 500);

  if (engine.phase === 'GOAL_CELEBRATION' && engine.lastScorer) {
    const pulse = 0.1 + 0.08 * Math.sin(engine.time * 16);
    const teamGlow =
      engine.lastScorer === 'blue'
        ? `rgba(56, 189, 248, ${pulse})`
        : `rgba(251, 113, 133, ${pulse})`;
    ctx.fillStyle = teamGlow;
    ctx.fillRect(-350, -250, WORLD_WIDTH + 700, WORLD_HEIGHT + 500);

    // Sweeping goal celebration strobe rays
    const goalX = engine.lastScorer === 'blue' ? PITCH_RIGHT : PITCH_LEFT;
    ctx.save();
    ctx.fillStyle =
      engine.lastScorer === 'blue'
        ? 'rgba(56, 189, 248, 0.12)'
        : 'rgba(251, 113, 133, 0.12)';
    for (let r = -1; r <= 1; r++) {
      const sway = Math.sin(engine.time * 7 + r * 1.4) * 140;
      ctx.beginPath();
      ctx.moveTo(goalX, GROUND_Y);
      ctx.lineTo(goalX + r * 260 - 120 + sway, -120);
      ctx.lineTo(goalX + r * 260 + 40 + sway, -120);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawCallouts(ctx: CanvasRenderingContext2D, engine: SoccerEngine): void {
  for (const c of engine.callouts) {
    const t = c.life / c.maxLife;
    const alpha = t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.2) / 0.8);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '800 30px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.strokeText(c.text, c.x, c.y);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, c.x, c.y);
    ctx.restore();
  }
}
