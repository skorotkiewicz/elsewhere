import { JOURNEYS } from './journeys.js';
import { Soundscape } from './audio/soundscape.js';
import { createRainEffect } from './effects/rain.js';
import tokyo from '../assets/images/tokyo.jpg';
import lisbon from '../assets/images/lisbon.jpg';
import berlin from '../assets/images/berlin.jpg';
import newyork from '../assets/images/newyork.jpg';

const IMAGES = { tokyo, lisbon, berlin, newyork };
const $ = id => document.getElementById(id);
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
$('scene-photo').src = IMAGES.tokyo;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const levels = { ambience: .65, rain: .45, passengers: .25, voice: .5, master: .7 };
const state = { journey: JOURNEYS[0], boarded: false, paused: false, muted: false, rain: true, night: true, videoPlaying: false, playerReady: false, videoError: false, elapsed: 0, duration: 0, lastTime: null, fired: new Set(), speed: .55, stopping: false, requested: false, sleepAt: 0, sleepFading: false, seekDragging: false };
let player, audio, subtitleTimeout, toastTimeout, videoWatchdog, voices = [];

function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 3300); }
function setRange(input) { input.style.setProperty('--value', `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`); }
function formatTime(seconds) { if (!Number.isFinite(seconds) || seconds < 0) return '--:--'; const n = Math.floor(seconds); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; }
function syncSoundUI() {
  const audible = Boolean(audio) && state.boarded && !state.muted && !state.paused && levels.master > 0;
  $('sound-toggle').classList.toggle('active', audible); $('sound-toggle').setAttribute('aria-pressed', String(audible));
  $('sound-toggle').querySelector('span').textContent = audible ? 'Sound is on' : 'Sound is off';
  $('sound-toggle').querySelector('use').setAttribute('href', audible ? '#i-volume' : '#i-mute');
  $('master-icon').setAttribute('href', state.muted ? '#i-mute' : '#i-volume');
  $('master-mute').setAttribute('aria-pressed', String(state.muted));
  $('master-mute').setAttribute('aria-label', state.muted ? 'Unmute all sound' : 'Mute all sound');
}
async function board() {
  if (state.boarded) return;
  state.boarded = true; state.paused = false; state.sleepFading = false;
  try { audio = new Soundscape(state, levels); await audio.resume(); }
  catch (error) { toast('Audio is unavailable here. You can still enjoy the window.'); console.warn(error); }
  $('boarding').classList.add('hidden'); $('play-button').setAttribute('aria-label', 'Pause journey');
  $('play-icon').setAttribute('href', '#i-pause');
  if (state.playerReady) { resetTimeline(0); player.seekTo(state.journey.startSeconds, true); player.playVideo(); }
  $('request-stop').disabled = !state.videoPlaying;
  syncSoundUI(); updateRideState();
  toast('Your seat is saved. Enjoy the long way home.');
}
function stopSpeech() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }
function clearAnnouncement() { clearTimeout(subtitleTimeout); $('subtitle').classList.remove('visible'); stopSpeech(); }
function setPaused(paused, sleep = false) {
  if (!state.boarded) { board(); return; }
  state.paused = paused;
  if (state.playerReady) { if (paused) player.pauseVideo(); else player.playVideo(); }
  if (paused) { if (audio) audio.suspend().catch(() => {}); clearAnnouncement(); }
  else { state.sleepFading = false; if (audio) audio.resume().catch(() => {}); }
  $('play-icon').setAttribute('href', paused ? '#i-play' : '#i-pause');
  $('play-button').setAttribute('aria-label', paused ? 'Resume journey' : 'Pause journey');
  syncSoundUI(); updateRideState();
  if (sleep) toast('Your ride is resting. Sleep well.');
}
function toggleMute() {
  state.muted = !state.muted; if (audio) audio.setMix();
  if (state.muted) stopSpeech(); syncSoundUI();
  if (!state.boarded) toast(state.muted ? 'Your soundscape will be muted when you board.' : 'Sound will start when you board.');
}
function toggleRain() {
  state.rain = !state.rain; $('rain-switch').setAttribute('aria-checked', String(state.rain)); $('window-rain').setAttribute('aria-pressed', String(state.rain));
  $('rain-canvas').style.opacity = state.rain ? '.64' : '0';
  $('weather-label').textContent = state.rain ? (state.night ? 'A rainy kind of night' : 'A little passing rain') : (state.night ? 'A quiet kind of night' : 'A little daylight');
  $('weather-icon').querySelector('use').setAttribute('href', state.rain ? '#i-rain' : state.night ? '#i-moon' : '#i-sun');
  if (audio) audio.setMix();
}
function setLighting(night) {
  state.night = night; $('ride-window').classList.toggle('day', !night);
  $('day-button').classList.toggle('active', !night); $('night-button').classList.toggle('active', night);
  $('day-button').setAttribute('aria-pressed', String(!night)); $('night-button').setAttribute('aria-pressed', String(night));
  // Reuse weather label rendering without changing the rain state.
  state.rain = !state.rain; toggleRain();
}
function speakEvent(event, jingle = true) {
  if (!state.boarded || state.paused) return;
  if (jingle && audio) audio.jingle();
  $('subtitle-local').textContent = event.text || '';
  $('subtitle-local').lang = state.journey.language;
  $('subtitle-translation').textContent = event.subtitle || '';
  $('subtitle-translation').lang = state.journey.language.startsWith('en') ? 'es' : 'en';
  $('subtitle').classList.add('visible'); clearTimeout(subtitleTimeout);
  subtitleTimeout = setTimeout(() => $('subtitle').classList.remove('visible'), 10000);
  stopSpeech();
  if ('speechSynthesis' in window && !state.muted && levels.voice > 0 && levels.master > 0 && !state.sleepFading) {
    const utterance = new SpeechSynthesisUtterance(event.text);
    const local = voices.find(voice => voice.lang.toLowerCase() === state.journey.language.toLowerCase()) || voices.find(voice => voice.lang.split('-')[0] === state.journey.language.split('-')[0]);
    if (local) utterance.voice = local;
    utterance.lang = state.journey.language; utterance.rate = .88; utterance.pitch = .94;
    // Web Speech does not route through AudioContext; apply its mix explicitly.
    utterance.volume = clamp(levels.voice * levels.master, 0, 1);
    window.speechSynthesis.speak(utterance);
  }
}
function runEvent(event) {
  if (event.type === 'announce') speakEvent(event);
  if (event.type === 'stop') {
    if (audio) { audio.chime(); audio.stop(); }
    state.requested = false; $('request-stop').classList.remove('requested'); $('request-stop').querySelector('span').textContent = 'Request stop';
  }
  if (event.type === 'ticketCheck') {
    speakEvent(event); $('ticket-button').classList.add('ticket-alert');
    toast('A little ticket check. Your ticket is ready below.');
  }
}
function resetTimeline(time = 0) {
  state.lastTime = time; state.elapsed = time;
  // Past events are considered consumed on seeks; never replay a backlog.
  state.fired = new Set(state.journey.stops.map((event, i) => event.at <= time ? i : -1).filter(i => i >= 0));
  state.requested = false; state.stopping = false;
  $('request-stop').classList.remove('requested'); $('request-stop').querySelector('span').textContent = 'Request stop';
  $('ticket-button').classList.remove('ticket-alert'); clearAnnouncement(); if (audio) audio.clearTransients();
  updateNextStop();
}
function syncTimeline(time) {
  const delta = state.lastTime === null ? 0 : time - state.lastTime;
  if (state.lastTime === null || delta < -.6 || delta > 2.5) resetTimeline(time);
  else {
    if (state.boarded && !state.paused) {
      state.journey.stops.forEach((event, i) => {
        if (!state.fired.has(i) && event.at > state.lastTime && event.at <= time) { state.fired.add(i); runEvent(event); }
      });
    }
    state.elapsed = time; state.lastTime = time;
  }
  state.stopping = state.journey.stops.some(event => event.type === 'stop' && time >= event.at && time < event.at + (event.duration || 8));
  updateNextStop();
}
function updateNextStop() {
  const stop = state.journey.stops.find(event => event.type === 'stop' && event.at + (event.duration || 8) > state.elapsed);
  $('next-stop').textContent = stop ? stop.name || state.journey.destination : 'The long way home';
}
function updateRideState() {
  $('ride-state').textContent = !state.boarded ? 'Waiting for you' : state.paused ? 'Taking a breath' : !state.videoPlaying ? 'Ambient mode' : state.stopping ? 'At your stop' : 'On the way';
}
function requestStop() {
  if (!state.boarded) { board(); return; }
  if (state.paused) { toast('Resume your ride to request a stop.'); return; }
  if (state.requested) { toast('Your driver has your request. Sit back.'); return; }
  const index = state.journey.stops.findIndex((event, i) => event.type === 'announce' && event.at > state.elapsed && !state.fired.has(i));
  const next = state.journey.stops.find(event => event.type === 'stop' && event.at > state.elapsed);
  if (audio) audio.chime();
  if (index >= 0) { state.fired.add(index); speakEvent(state.journey.stops[index], false); }
  else speakEvent({ text: state.journey.language === 'ja-JP' ? '次の停留所で止まります。' : state.journey.language === 'de-DE' ? 'Wir halten an der nächsten Haltestelle.' : state.journey.language === 'pt-PT' ? 'Vamos parar na próxima paragem.' : 'We will stop at the next safe place.', subtitle: 'Stop requested. Settle in until the next stop.' }, false);
  state.requested = true; $('request-stop').classList.add('requested'); $('request-stop').querySelector('span').textContent = 'Stop requested';
  toast(next ? `Stop requested · ${next.name || 'next stop'}` : 'Your driver has your request.');
}

/* PLAYER: YouTube is always muted. Timeline state follows video time,
   including explicit seeks, backwards jumps, buffering, and loops. */
function showVideoStatus(message, retry = false) {
  $('video-status').replaceChildren(document.createTextNode(message));
  if (retry) { const button = document.createElement('button'); button.textContent = 'Retry'; button.onclick = () => loadVideo(); $('video-status').append(button); }
  $('video-status').classList.add('show');
}
function loadVideo() {
  clearTimeout(videoWatchdog); state.videoPlaying = false; state.videoError = false; state.duration = 0;
  $('video-mount').classList.remove('live'); $('seek').disabled = true; $('request-stop').disabled = true; $('seek').value = 0; setRange($('seek'));
  $('time-elapsed').textContent = '00:00'; $('time-duration').textContent = '--:--';
  resetTimeline(0); $('video-status').classList.remove('show');
  if (state.playerReady) {
    player.mute();
    player.loadVideoById({ videoId: state.journey.videoId, startSeconds: state.journey.startSeconds });
    if (state.paused) player.pauseVideo();
  } else if (!player) loadYouTubeAPI();
  videoWatchdog = setTimeout(() => {
    if (!state.videoPlaying) showVideoStatus('The window is taking a moment. Your soundscape is still here.', true);
  }, 15000);
}
window.onYouTubeIframeAPIReady = function () {
  if (player) return;
  player = new YT.Player('youtube-player', {
    width: '100%', height: '100%', videoId: state.journey.videoId,
    playerVars: { autoplay: 1, mute: 1, controls: 0, playsinline: 1, rel: 0, disablekb: 1, start: state.journey.startSeconds, ...(location.protocol.startsWith('http') ? { origin: location.origin } : {}) },
    events: {
      onReady: event => { state.playerReady = true; event.target.mute(); loadVideo(); },
      onStateChange: event => {
        const status = event.data;
        state.videoPlaying = status === YT.PlayerState.PLAYING;
        if (state.videoPlaying) {
          clearTimeout(videoWatchdog); state.videoError = false;
          $('video-mount').classList.add('live'); $('video-status').classList.remove('show');
          player.mute();
          if (state.boarded && state.paused) { player.pauseVideo(); return; }
          const duration = Math.max(0, player.getDuration() - state.journey.startSeconds);
          state.duration = duration; $('seek').max = Math.max(1, duration); $('seek').disabled = duration <= 0;
          $('time-duration').textContent = formatTime(duration); $('request-stop').disabled = !state.boarded;
        }
        if (status === YT.PlayerState.ENDED) { resetTimeline(0); player.seekTo(state.journey.startSeconds, true); if (!state.paused) player.playVideo(); }
        updateRideState();
      },
      onError: event => {
        state.videoError = true; state.videoPlaying = false; $('video-mount').classList.remove('live');
        $('seek').disabled = true; $('request-stop').disabled = true; clearTimeout(videoWatchdog);
        showVideoStatus(`Footage unavailable (${event.data}). Enjoy the ambient window, or choose another city.`, true); updateRideState();
      }
    }
  });
};
function selectJourney(id) {
  const journey = JOURNEYS.find(item => item.id === id); if (!journey || journey.id === state.journey.id) return;
  state.journey = journey; resetTimeline(0);
  $('scene-photo').src = IMAGES[journey.image]; $('scene-photo').alt = `A scenic view of ${journey.city}`;
  $('place-city').textContent = journey.city; $('place-country').textContent = journey.country;
  $('window-label').textContent = `YOUR WINDOW TO ${journey.city.toUpperCase()}`;
  $('route-caption').textContent = journey.mood; $('line-badge').textContent = `${journey.vehicle.toUpperCase()} ${journey.line}`;
  $('ambience-label').textContent = journey.vehicle === 'tram' ? 'Along the rails' : 'The engine';
  $('ambience-icon').setAttribute('href', journey.vehicle === 'tram' ? '#i-train' : '#i-car');
  $('boarding-vehicle').setAttribute('href', journey.vehicle === 'tram' ? '#i-train' : '#i-car');
  $('board-label').textContent = `Board the ${journey.vehicle}`;
  renderJourneySelection(); updateClock(); loadVideo();
  toast(`A window seat in ${journey.city}.`);
}
function renderJourneySelection() {
  document.querySelectorAll('.journey-card').forEach(card => {
    const selected = card.dataset.journey === state.journey.id;
    card.classList.toggle('selected', selected); card.setAttribute('aria-pressed', String(selected));
    card.querySelector('.selected-label').hidden = !selected;
  });
}
function updateClock() {
  const now = new Date(); $('city-clock').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: state.journey.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  $('city-clock').dateTime = now.toISOString(); $('city-clock').title = `${state.journey.city} local time`;
}

createRainEffect({
  canvas: $('rain-canvas'),
  windowElement: $('ride-window'),
  videoMount: $('video-mount'),
  state,
});

function openTicket() {
  $('ticket-city').textContent = state.journey.city; $('ticket-line').textContent = state.journey.line;
  $('ticket-description').textContent = `${state.journey.title}. ${state.journey.mood}`;
  $('ticket-button').classList.remove('ticket-alert'); $('ticket-dialog').showModal();
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('ride-window').requestFullscreen) await $('ride-window').requestFullscreen();
    else toast('Your browser does not support fullscreen here.');
  } catch (_) { toast('Fullscreen is not available in this browser window.'); }
}
JOURNEYS.forEach(journey => {
  const button = document.createElement('button'); button.className = 'journey-card'; button.dataset.journey = journey.id;
  button.setAttribute('aria-label', `${journey.city}: ${journey.title}, ${journey.vehicle} journey`);
  button.innerHTML = `<img src="${IMAGES[journey.image]}" alt="" loading="lazy"><div class="card-top"><span class="card-tag">${journey.tag}</span><span class="selected-label">${icon('voice')}NOW SELECTED</span></div><div class="card-bottom"><div class="card-city">${journey.city}${icon('arrow')}</div><div class="card-description">${journey.mood}</div><div class="card-meta"><span>${journey.country}</span><span class="dot"></span><span>${journey.durationLabel} escape</span></div></div>`;
  button.addEventListener('click', () => selectJourney(journey.id)); $('journey-grid').append(button);
  const item = document.createElement('li'), link = document.createElement('a'); link.href = `https://www.youtube.com/watch?v=${journey.videoId}`; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = `${journey.city} — original recorded journey`; item.append(link); $('footage-credits').append(item);
});
renderJourneySelection();
// The barcode is decorative; this is not a real transit ticket.
document.querySelector('.ticket-code').innerHTML = '<i></i>'.repeat(55);
document.querySelectorAll('[data-channel]').forEach(input => input.addEventListener('input', () => {
  const channel = input.dataset.channel; levels[channel] = Number(input.value) / 100; setRange(input); $(`${channel}-value`).textContent = `${input.value}%`;
  if (audio) audio.setMix();
  if ((channel === 'voice' || channel === 'master') && 'speechSynthesis' in window) stopSpeech();
  syncSoundUI();
}));
$('board-button').onclick = board; $('play-button').onclick = () => state.boarded ? setPaused(!state.paused) : board();
$('sound-toggle').onclick = () => state.boarded ? toggleMute() : board(); $('master-mute').onclick = toggleMute;
$('rain-switch').onclick = toggleRain; $('window-rain').onclick = toggleRain;
$('day-button').onclick = () => setLighting(false); $('night-button').onclick = () => setLighting(true);
$('request-stop').onclick = requestStop; $('ticket-button').onclick = openTicket; $('fullscreen-button').onclick = fullscreen;
$('about-button').onclick = () => $('about-dialog').showModal(); $('credits-button').onclick = () => $('about-dialog').showModal();
document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => $(button.dataset.close).close());
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
$('seek').addEventListener('input', () => { state.seekDragging = true; setRange($('seek')); $('time-elapsed').textContent = formatTime(Number($('seek').value)); });
$('seek').addEventListener('change', () => {
  if (state.playerReady) { const time = Number($('seek').value); resetTimeline(time); player.seekTo(state.journey.startSeconds + time, true); }
  state.seekDragging = false;
});
$('sleep-timer').onchange = () => {
  const minutes = Number($('sleep-timer').value); state.sleepAt = minutes ? Date.now() + minutes * 60000 : 0; state.sleepFading = false;
  if (audio) audio.setMix(); toast(minutes ? `We’ll quiet your ride in ${minutes} minutes.` : 'Sleep timer is off. No rush.');
};
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target.closest('input, select, textarea, button, a, [contenteditable="true"]') || document.querySelector('dialog[open]')) return;
  if (event.code === 'Space') { event.preventDefault(); state.boarded ? setPaused(!state.paused) : board(); }
  else if (event.key.toLowerCase() === 'm') { event.preventDefault(); toggleMute(); }
  else if (event.key.toLowerCase() === 'f') { event.preventDefault(); fullscreen(); }
});
if ('speechSynthesis' in window) {
  const loadVoices = () => { voices = window.speechSynthesis.getVoices(); };
  loadVoices(); window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}
// The wall-clock timer works even while the ride is paused or buffering.
setInterval(() => {
  updateClock();
  if (state.sleepAt) {
    const remaining = state.sleepAt - Date.now();
    if (remaining < 8000 && !state.sleepFading) {
      state.sleepFading = true; stopSpeech();
      if (audio) audio.ramp(audio.master.gain, 0, Math.max(.1, remaining / 3000));
    }
    if (remaining <= 0) { state.sleepAt = 0; $('sleep-timer').value = '0'; if (state.boarded) setPaused(true, true); }
  }
  if (state.playerReady && !state.videoError) {
    const absoluteTime = player.getCurrentTime();
    const time = Math.max(0, absoluteTime - state.journey.startSeconds);
    syncTimeline(time);
    if (!state.seekDragging) { $('seek').value = Math.min(time, state.duration || 100); setRange($('seek')); $('time-elapsed').textContent = formatTime(time); }
  }
  if (audio && state.boarded && !state.paused) {
    const speedTime = state.videoPlaying ? state.elapsed : performance.now() / 1000;
    const targetSpeed = state.stopping ? .02 : .55 + Math.sin(speedTime / 19) * .2 + Math.sin(speedTime / 6) * .08;
    state.speed += (targetSpeed - state.speed) * .14;
    audio.update(state.speed, !state.playerReady || state.videoPlaying || state.videoError);
  }
  updateRideState();
}, 250);
updateClock(); syncSoundUI();
window.addEventListener('pagehide', () => { stopSpeech(); if (audio) audio.suspend().catch(() => {}); });
function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) { window.onYouTubeIframeAPIReady(); return; }
  const previous = $('youtube-api'); if (previous) previous.remove();
  const api = document.createElement('script'); api.id = 'youtube-api';
  api.src = 'https://www.youtube.com/iframe_api'; api.async = true;
  api.onerror = () => showVideoStatus('Video could not connect. The ambient window is still yours.', true);
  document.head.append(api);
}
loadYouTubeAPI();
videoWatchdog = setTimeout(() => { if (!state.playerReady) showVideoStatus('Video is offline. Board to enjoy the soundscape, or retry.', true); }, 15000);
