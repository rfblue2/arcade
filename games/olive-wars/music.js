/**
 * Original silly chase-theme (Web Audio synth).
 * Intentionally NOT Yakety Sax — that recording is copyrighted and cannot be shipped.
 * Drop a licensed file at audio/chase-theme.mp3 (or .ogg) to override the synth.
 */

const DROP_IN_CANDIDATES = [
  'audio/chase-theme.mp3',
  'audio/chase-theme.ogg',
  'audio/chase-theme.wav',
];

export class ChaseMusic {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.muted = false;
    this._nodes = [];
    this._timers = [];
    this._audioEl = null;
    this._mode = 'synth'; // 'synth' | 'file'
    this._started = false;
  }

  /**
   * Try optional licensed drop-in once (no HEAD probing — avoids console 404 spam).
   * Resolves true only if the element can start playback.
   */
  async _tryDropInPlay() {
    for (const path of DROP_IN_CANDIDATES) {
      const el = new Audio(path);
      el.loop = true;
      el.volume = 0.55;
      try {
        // decode/play; if the file is missing, play() rejects without a prior HEAD
        await el.play();
        this._audioEl = el;
        this._mode = 'file';
        return true;
      } catch {
        el.removeAttribute('src');
        el.load();
      }
    }
    return false;
  }

  async start() {
    if (this._started || this.muted) return;
    this._started = true;

    // Prefer a licensed drop-in if present; otherwise original synth chase theme.
    // (Yakety Sax itself cannot be shipped — copyrighted.)
    if (await this._tryDropInPlay()) {
      this.playing = true;
      return;
    }

    this._mode = 'synth';
    this._startSynth();
  }

  stop() {
    this.playing = false;
    this._started = false;
    if (this._audioEl) {
      this._audioEl.pause();
      this._audioEl.currentTime = 0;
    }
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
    for (const n of this._nodes) {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    this._nodes = [];
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) {
      this.stop();
    }
  }

  _startSynth() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.playing = true;

    const master = this.ctx.createGain();
    master.gain.value = 0.22;
    master.connect(this.ctx.destination);
    this._nodes.push(master);

    // Light room-ish delay
    const delay = this.ctx.createDelay(0.5);
    delay.delayTime.value = 0.18;
    const delayGain = this.ctx.createGain();
    delayGain.gain.value = 0.18;
    delay.connect(delayGain);
    delayGain.connect(master);
    this._nodes.push(delay, delayGain);

    const tempo = 168; // jaunty chase
    const beat = 60 / tempo;

    // Original comedy-chase riff (NOT Yakety Sax) — bouncing 6/8-ish feel in C mixolydian-ish
    // Melody notes as MIDI; pattern loops
    const melody = [
      72, 74, 76, 79, 76, 74, 72, 69,
      71, 72, 74, 76, 74, 72, 69, 67,
      72, 76, 79, 81, 79, 76, 74, 72,
      74, 76, 74, 71, 72, 69, 67, 65,
    ];
    const bass = [
      48, 48, 55, 55, 50, 50, 57, 57,
      48, 48, 55, 55, 53, 53, 50, 50,
    ];

    const scheduleAhead = 0.25;
    let nextNoteTime = this.ctx.currentTime + 0.05;
    let melIndex = 0;
    let bassIndex = 0;

    const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

    const playSaxish = (time, midi, dur) => {
      const osc = this.ctx.createOscillator();
      // Slightly reedy: triangle + soft square blend
      osc.type = 'triangle';
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'square';
      const g = this.ctx.createGain();
      const g2 = this.ctx.createGain();
      g2.gain.value = 0.22;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      filter.Q.value = 1.2;

      osc.frequency.setValueAtTime(freq(midi), time);
      osc2.frequency.setValueAtTime(freq(midi), time);
      // Little scoop bend for comedy
      osc.frequency.linearRampToValueAtTime(freq(midi) * 1.03, time + 0.04);
      osc.frequency.linearRampToValueAtTime(freq(midi), time + 0.1);

      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.55, time + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(g);
      osc2.connect(g2);
      g2.connect(g);
      g.connect(filter);
      filter.connect(master);
      filter.connect(delay);

      osc.start(time);
      osc2.start(time);
      osc.stop(time + dur + 0.02);
      osc2.stop(time + dur + 0.02);
    };

    const playBass = (time, midi, dur) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 280;
      const g = this.ctx.createGain();
      osc.frequency.setValueAtTime(freq(midi), time);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.35, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(filter);
      filter.connect(g);
      g.connect(master);
      osc.start(time);
      osc.stop(time + dur + 0.02);
    };

    const tick = () => {
      if (!this.playing || !this.ctx) return;
      const now = this.ctx.currentTime;
      while (nextNoteTime < now + scheduleAhead) {
        const melDur = beat * 0.9;
        playSaxish(nextNoteTime, melody[melIndex % melody.length], melDur);
        if (melIndex % 2 === 0) {
          playBass(nextNoteTime, bass[(bassIndex++) % bass.length], beat * 1.7);
        }
        melIndex++;
        nextNoteTime += beat;
      }
      const id = setTimeout(tick, 40);
      this._timers.push(id);
    };

    tick();
  }
}
