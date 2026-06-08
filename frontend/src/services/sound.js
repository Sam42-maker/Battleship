// Web Audio synthesized sound effects for Battleship.
// No external assets — sounds are generated procedurally.

let ctx = null;
let muted = false;
let masterGainNode = null;

const getCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGainNode = ctx.createGain();
    masterGainNode.gain.value = 0.55;
    masterGainNode.connect(ctx.destination);
  }
  // resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

export const setMuted = (v) => { muted = !!v; };
export const isMuted = () => muted;

const _connect = (node) => {
  if (!masterGainNode) return;
  node.connect(masterGainNode);
};

const _createNoise = (duration = 0.4) => {
  const c = getCtx();
  if (!c) return null;
  const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  return src;
};

// ---- 1. Cannon fire (low boom + click) ----
export const playCannon = () => {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  // Low boom
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.9, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  osc.connect(gain); _connect(gain);
  osc.start(now); osc.stop(now + 0.55);

  // Initial click (high-pass filtered noise)
  const noise = _createNoise(0.15);
  if (noise) {
    const ng = c.createGain();
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1500;
    ng.gain.setValueAtTime(0.4, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    noise.connect(hp); hp.connect(ng); _connect(ng);
    noise.start(now); noise.stop(now + 0.15);
  }
};

// ---- 2. Splash (filtered noise burst, water-y) ----
export const playSplash = () => {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  const noise = _createNoise(0.7);
  if (!noise) return;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(2000, now);
  bp.frequency.exponentialRampToValueAtTime(400, now + 0.55);
  bp.Q.value = 1.4;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.55, now + 0.04);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
  noise.connect(bp); bp.connect(g); _connect(g);
  noise.start(now); noise.stop(now + 0.72);

  // gurgle tail
  const osc = c.createOscillator();
  const og = c.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(180, now + 0.15);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.55);
  og.gain.setValueAtTime(0.0001, now + 0.12);
  og.gain.exponentialRampToValueAtTime(0.18, now + 0.18);
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  osc.connect(og); _connect(og);
  osc.start(now + 0.12); osc.stop(now + 0.62);
};

// ---- 3. Explosion (loud noise + low rumble) ----
export const playExplosion = () => {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  // big noise blast
  const noise = _createNoise(0.9);
  if (noise) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4000, now);
    lp.frequency.exponentialRampToValueAtTime(300, now + 0.8);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.exponentialRampToValueAtTime(1.0, now + 0.02);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    noise.connect(lp); lp.connect(ng); _connect(ng);
    noise.start(now); noise.stop(now + 0.92);
  }

  // sub-bass rumble
  const osc = c.createOscillator();
  const og = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(90, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.7);
  og.gain.setValueAtTime(0.0001, now);
  og.gain.exponentialRampToValueAtTime(0.7, now + 0.04);
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  osc.connect(og); _connect(og);
  osc.start(now); osc.stop(now + 0.82);

  // crackle
  const noise2 = _createNoise(0.4);
  if (noise2) {
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 2500;
    const n2g = c.createGain();
    n2g.gain.setValueAtTime(0.25, now + 0.1);
    n2g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    noise2.connect(hp); hp.connect(n2g); _connect(n2g);
    noise2.start(now + 0.1); noise2.stop(now + 0.45);
  }
};

// ---- 4. Alarm (siren on bot hitting us) ----
export const playAlarm = () => {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.setValueAtTime(880, now + 0.18);
  osc.frequency.setValueAtTime(440, now + 0.36);
  osc.frequency.setValueAtTime(880, now + 0.54);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.35, now + 0.03);
  g.gain.setValueAtTime(0.35, now + 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
  osc.connect(g); _connect(g);
  osc.start(now); osc.stop(now + 0.9);
};

// ---- 5. Victory horn (triumphant chord arpeggio) ----
export const playVictory = () => {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C E G C E
  notes.forEach((freq, i) => {
    const t = now + i * 0.12;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(g); _connect(g);
    osc.start(t); osc.stop(t + 0.55);
  });
  // sustained final chord
  [523.25, 659.25, 784.0].forEach((f) => {
    const t = now + 0.7;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g); _connect(g);
    o.start(t); o.stop(t + 1.7);
  });
};

// ---- 6. Defeat (descending mournful tone) ----
export const playDefeat = () => {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const notes = [392, 349.23, 311.13, 261.63, 220, 174.61];
  notes.forEach((freq, i) => {
    const t = now + i * 0.18;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc.connect(g); _connect(g);
    osc.start(t); osc.stop(t + 0.6);
  });
};

// ---- 7. UI click ----
export const playClick = () => {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1000, now);
  osc.frequency.exponentialRampToValueAtTime(500, now + 0.06);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  osc.connect(g); _connect(g);
  osc.start(now); osc.stop(now + 0.1);
};

// ---- 8. Sonar ping (radar / placement) ----
export const playSonar = () => {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  osc.connect(g); _connect(g);
  osc.start(now); osc.stop(now + 0.5);
};

const sounds = {
  playCannon, playSplash, playExplosion, playAlarm, playVictory, playDefeat, playClick, playSonar,
  setMuted, isMuted,
};
export default sounds;
