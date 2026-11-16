// Falling confetti on a full-screen canvas, the algorithm of the approved mockup (option A).

const PARTICLE_COUNT = 160;
const MIN_FALL_SPEED = 150;
const FALL_SPEED_RANGE = 130;
const DOT_SHARE = 0.3;
const TWO_PI = Math.PI * 2;

export interface ConfettiOptions {
  durationMs: number;
  // Particles keep appearing during this first part; the rest of the time they only fall.
  emitForMs: number;
  colors: readonly string[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sway: number;
  phase: number;
  rotation: number;
  spin: number;
  size: number;
  isDot: boolean;
  color: string;
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

function spawn(width: number, colors: readonly string[]): Particle {
  return {
    x: Math.random() * width,
    y: -12 - Math.random() * 40,
    vx: between(-20, 20),
    vy: MIN_FALL_SPEED + Math.random() * FALL_SPEED_RANGE,
    sway: between(0.8, 2.4),
    phase: Math.random() * TWO_PI,
    rotation: Math.random() * TWO_PI,
    spin: between(-6, 6),
    size: between(5, 11),
    isDot: Math.random() < DOT_SHARE,
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

function draw(ctx: CanvasRenderingContext2D, particle: Particle) {
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.rotation);
  ctx.fillStyle = particle.color;
  if (particle.isDot) {
    ctx.beginPath();
    ctx.arc(0, 0, particle.size / 3, 0, TWO_PI);
    ctx.fill();
  } else {
    ctx.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2.2);
  }
  ctx.restore();
}

// Starts the animation and returns the function that stops it.
export function runConfetti(canvas: HTMLCanvasElement, options: ConfettiOptions): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.scale(ratio, ratio);

  const particles: Particle[] = [];
  const start = performance.now();
  let last = start;
  let frame = 0;

  const tick = (now: number) => {
    const elapsed = now - start;
    const seconds = (now - last) / 1000;
    last = now;
    if (elapsed < options.emitForMs) {
      const target = Math.floor((elapsed / options.emitForMs) * PARTICLE_COUNT);
      while (particles.length < target) particles.push(spawn(width, options.colors));
    }
    ctx.clearRect(0, 0, width, height);
    for (const particle of particles) {
      particle.y += particle.vy * seconds;
      particle.x += particle.vx * seconds + Math.sin((elapsed / 1000) * particle.sway * 3 + particle.phase) * 0.6;
      particle.rotation += particle.spin * seconds;
      if (particle.y <= height + 20) draw(ctx, particle);
    }
    if (elapsed < options.durationMs) frame = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, width, height);
  };
  frame = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(frame);
}
