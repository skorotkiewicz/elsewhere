/* SYNTHESIS: continuous sources feed four independent buses, then master.
   Transients are bounded and self-cleaning. No audio files are used. */
export class Soundscape {
  constructor(state, levels) {
    this.state = state;
    this.levels = levels;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('Web Audio is not supported in this browser.');
    this.ctx = new Context();
    this.master = this.ctx.createGain(); this.master.gain.value = 0;
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -18; compressor.ratio.value = 5;
    this.master.connect(compressor); compressor.connect(this.ctx.destination);
    this.buses = {};
    for (const channel of ['ambience', 'rain', 'passengers', 'voice']) {
      this.buses[channel] = this.ctx.createGain();
      this.buses[channel].gain.value = this.levels[channel];
      this.buses[channel].connect(this.master);
    }
    this.white = this.noise(false); this.brown = this.noise(true);
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass'; this.engineFilter.frequency.value = 190;
    this.engine = this.ctx.createGain(); this.engine.gain.value = .45;
    this.loop(this.brown, this.engineFilter);
    this.engineFilter.connect(this.engine); this.engine.connect(this.buses.ambience);
    const rainFilter = this.ctx.createBiquadFilter(); rainFilter.type = 'bandpass'; rainFilter.frequency.value = 2200; rainFilter.Q.value = .55;
    this.rainGain = this.ctx.createGain(); this.rainGain.gain.value = .14;
    this.loop(this.white, rainFilter); rainFilter.connect(this.rainGain); this.rainGain.connect(this.buses.rain);
    this.nextPassenger = this.ctx.currentTime + 3;
    this.activeNodes = new Set();
    this.setMix();
  }
  noise(brown) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 4, this.ctx.sampleRate);
    const data = buffer.getChannelData(0); let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) { last = (last + .02 * white) / 1.02; data[i] = last * 3.5; }
      else data[i] = white;
    }
    return buffer;
  }
  loop(buffer, destination) {
    const source = this.ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
    source.connect(destination); source.start(); return source;
  }
  ramp(param, value, time = .3) { param.setTargetAtTime(value, this.ctx.currentTime, time); }
  setMix() {
    for (const name of Object.keys(this.buses)) this.ramp(this.buses[name].gain, this.levels[name]);
    this.ramp(this.master.gain, this.state.muted || this.state.sleepFading ? 0 : this.levels.master * .65);
    this.ramp(this.rainGain.gain, this.state.rain ? .2 : 0);
  }
  async resume() { await this.ctx.resume(); this.setMix(); }
  async suspend() { await this.ctx.suspend(); }
  update(speed, playing) {
    this.ramp(this.engine.gain, .2 + speed * .8, .6);
    this.ramp(this.engineFilter.frequency, 95 + speed * (this.state.journey.vehicle === 'tram' ? 310 : 190), .7);
    if (playing && this.ctx.currentTime > this.nextPassenger) {
      this.nextPassenger = this.ctx.currentTime + 4 + Math.random() * 9;
      const random = Math.random();
      if (random < .62) this.murmur(); else if (random < .77) this.cough(); else if (random < .9) this.rustle(); else this.notification();
    }
  }
  burst(bus, frequency, q, length, gain, delay = 0, type = 'bandpass') {
    const time = this.ctx.currentTime + delay;
    const source = this.ctx.createBufferSource(); source.buffer = this.white; source.loop = true;
    const filter = this.ctx.createBiquadFilter(); filter.type = type; filter.frequency.value = frequency; filter.Q.value = q;
    const envelope = this.ctx.createGain(); envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), time + Math.min(.05, length / 4));
    envelope.gain.exponentialRampToValueAtTime(.0001, time + length);
    source.connect(filter); filter.connect(envelope); envelope.connect(this.buses[bus]);
    source.start(time, Math.random() * 2); source.stop(time + length + .05);
    this.activeNodes.add(source);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); this.activeNodes.delete(source); };
  }
  tone(bus, hz, length, gain, delay = 0, type = 'sine', endHz = hz) {
    const time = this.ctx.currentTime + delay;
    const oscillator = this.ctx.createOscillator(), envelope = this.ctx.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(hz, time); oscillator.frequency.exponentialRampToValueAtTime(endHz, time + length);
    envelope.gain.setValueAtTime(.0001, time); envelope.gain.exponentialRampToValueAtTime(gain, time + .015); envelope.gain.exponentialRampToValueAtTime(.0001, time + length);
    oscillator.connect(envelope); envelope.connect(this.buses[bus]); oscillator.start(time); oscillator.stop(time + length + .05);
    this.activeNodes.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); this.activeNodes.delete(oscillator); };
  }
  murmur(boarding = false) {
    const groups = boarding ? 4 : 1 + Math.floor(Math.random() * 2);
    for (let j = 0; j < groups; j++) {
      const shift = .8 + Math.random() * .5;
      for (let i = 0; i < 3; i++) {
        const delay = j * .45 + i * .19, length = .13 + Math.random() * .14;
        // Two formants make a soft, nonverbal vowel-like murmur.
        this.burst('passengers', 530 * shift, 5, length, .1, delay);
        this.burst('passengers', 1450 * shift, 7, length, .035, delay);
      }
    }
  }
  cough() { this.burst('passengers', 650, 1.8, .16, .13); this.burst('passengers', 850, 2, .12, .09, .18); }
  rustle() { for (let i = 0; i < 4; i++) this.burst('passengers', 3100, .6, .16, .055, i * .11); }
  notification() { this.tone('passengers', 1174, .2, .055); this.tone('passengers', 1568, .35, .04, .13); }
  chime() { this.tone('voice', 659, .65, .13); this.tone('voice', 523, .9, .1, .3); }
  jingle() { [523, 659, 784].forEach((note, i) => this.tone('voice', note, .45, .065, i * .17)); }
  stop() {
    this.tone('ambience', 1800, .85, .017, 0, 'sine', 750);
    this.burst('ambience', 1400, .8, 1.6, .13, .55);
    this.murmur(true);
  }
  clearTransients() { for (const source of this.activeNodes) { try { source.stop(); } catch (_) {} } }
}
