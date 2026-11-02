/**
 * The Impossible Spirit Level — Precision Carpenter & Absurd Physics Toy
 * Pure Vanilla JavaScript & Procedural Web Audio API
 */

(function () {
  'use strict';

  // --- State Variables ---
  const state = {
    angle: 0.428571,        // Current tilt angle in degrees
    targetAngle: 0.428571,  // Target angle being aimed at
    bubblePos: 0.28,        // -1.0 (far left) to +1.0 (far right)
    bubbleVel: 0.0,         // Bubble velocity
    isDragging: false,
    dragAnchor: null,
    audioEnabled: true,
    holdingBreath: false,
    breathTimeLeft: 6.0,
    breathExhausted: false,
    autoLeveling: false,
    autoLevelInterval: null,
    closestApproach: 0.428571,
    disastersCount: 0,
    timePursuingSec: 0,
    inDeadCenterTime: 0.0,
    isSabotaging: false,
    realityMode: false,
    beerActive: false,
    beerSpilled: false,
    flyActive: false,
    lastTime: performance.now(),
    microBubbles: []
  };

  // --- DOM Elements ---
  const stageWrapper = document.getElementById('stage-wrapper');
  const levelBeam = document.getElementById('level-beam');
  const bubbleCanvas = document.getElementById('bubble-canvas');
  const oledDigits = document.getElementById('angle-digits');
  const oledSign = document.getElementById('angle-sign');
  const toleranceBadge = document.getElementById('tolerance-badge');
  const deltaVal = document.getElementById('delta-val');
  const bestVal = document.getElementById('best-val');
  const angleSlider = document.getElementById('angle-slider');
  const bubble45 = document.getElementById('bubble-45');
  const bubble90 = document.getElementById('bubble-90');
  const btnSound = document.getElementById('btn-sound');
  const btnAutoLevel = document.getElementById('btn-autolevel');
  const btnSlap = document.getElementById('btn-slap');
  const btnBeer = document.getElementById('btn-beer');
  const btnReality = document.getElementById('btn-reality');
  const btnGyro = document.getElementById('btn-gyro');
  const btnBreath = document.getElementById('btn-breath');
  const btnSnapZero = document.getElementById('btn-snap-zero');
  const breathIndicator = document.getElementById('breath-indicator');
  const sabotageBanner = document.getElementById('sabotage-banner');
  const sabotageIcon = document.getElementById('sabotage-icon');
  const sabotageTitle = document.getElementById('sabotage-title');
  const sabotageDesc = document.getElementById('sabotage-desc');
  const statClosest = document.getElementById('stat-closest');
  const statDisasters = document.getElementById('stat-disasters');
  const statTime = document.getElementById('stat-time');
  const slapOverlay = document.getElementById('slap-overlay');
  const beerCan = document.getElementById('beer-can');
  const flyActor = document.getElementById('fly-actor');
  const handleLeft = document.getElementById('handle-left');
  const handleRight = document.getElementById('handle-right');
  const vialGlitch = document.getElementById('vial-glitch');

  // Setup Canvas Context
  const ctx = bubbleCanvas.getContext('2d');
  let canvasWidth = 320;
  let canvasHeight = 56;

  function resizeCanvas() {
    const rect = bubbleCanvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvasWidth = rect.width;
      canvasHeight = rect.height;
      bubbleCanvas.width = canvasWidth * window.devicePixelRatio;
      bubbleCanvas.height = canvasHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
  }

  // --- Procedural Web Audio Engine ---
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTickSound(frequency = 1200, duration = 0.015) {
    if (!state.audioEnabled) return;
    try {
      const actx = getAudioContext();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, actx.currentTime + duration);

      gain.gain.setValueAtTime(0.08, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + duration);

      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + duration);
    } catch (e) {
      // Audio autoplay restriction fallback
    }
  }

  function playBubbleSloshSound(speed) {
    if (!state.audioEnabled || speed < 0.05) return;
    try {
      const actx = getAudioContext();
      const bufferSize = actx.sampleRate * 0.08;
      const noiseBuffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = actx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = actx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(350 + Math.min(speed * 200, 600), actx.currentTime);
      filter.Q.value = 5.0;

      const gain = actx.createGain();
      const vol = Math.min(0.06 * speed, 0.12);
      gain.gain.setValueAtTime(vol, actx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, actx.currentTime + 0.08);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);

      whiteNoise.start();
    } catch (e) {}
  }

  function playAngelicChime() {
    if (!state.audioEnabled) return;
    try {
      const actx = getAudioContext();
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, actx.currentTime + idx * 0.03);
        gain.gain.setValueAtTime(0.04, actx.currentTime + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.6 + idx * 0.03);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(actx.currentTime + idx * 0.03);
        osc.stop(actx.currentTime + 0.65 + idx * 0.03);
      });
    } catch (e) {}
  }

  function playSlapSound() {
    if (!state.audioEnabled) return;
    try {
      const actx = getAudioContext();
      [0, 0.18].forEach(delay => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, actx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(35, actx.currentTime + delay + 0.15);

        gain.gain.setValueAtTime(0.35, actx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + delay + 0.18);

        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(actx.currentTime + delay);
        osc.stop(actx.currentTime + delay + 0.2);
      });
    } catch (e) {}
  }

  function playBeerSound() {
    if (!state.audioEnabled) return;
    try {
      const actx = getAudioContext();
      // Can pop + hiss
      const bufferSize = actx.sampleRate * 0.35;
      const noiseBuffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = actx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = actx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2500, actx.currentTime);

      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.2, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      noise.start();
    } catch (e) {}
  }

  function playDisasterAudio(type) {
    if (!state.audioEnabled) return;
    try {
      const actx = getAudioContext();
      const now = actx.currentTime;

      if (type === 'truck') {
        // Diesel horn + bass rumble
        const horn1 = actx.createOscillator();
        const horn2 = actx.createOscillator();
        const hornGain = actx.createGain();
        horn1.type = 'sawtooth';
        horn2.type = 'sawtooth';
        horn1.frequency.setValueAtTime(196, now); // G3
        horn2.frequency.setValueAtTime(246.9, now); // B3
        hornGain.gain.setValueAtTime(0.35, now);
        hornGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        horn1.connect(hornGain);
        horn2.connect(hornGain);
        hornGain.connect(actx.destination);
        horn1.start(now);
        horn2.start(now);
        horn1.stop(now + 1.25);
        horn2.stop(now + 1.25);

        // Sub rumble
        const rumble = actx.createOscillator();
        const rumbleGain = actx.createGain();
        rumble.type = 'sine';
        rumble.frequency.setValueAtTime(42, now);
        rumbleGain.gain.setValueAtTime(0.4, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        rumble.connect(rumbleGain);
        rumbleGain.connect(actx.destination);
        rumble.start(now);
        rumble.stop(now + 1.4);

      } else if (type === 'quake') {
        // Seismic crunch
        const quake = actx.createOscillator();
        const qGain = actx.createGain();
        quake.type = 'sawtooth';
        quake.frequency.setValueAtTime(65, now);
        quake.frequency.exponentialRampToValueAtTime(22, now + 0.8);
        qGain.gain.setValueAtTime(0.45, now);
        qGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        quake.connect(qGain);
        qGain.connect(actx.destination);
        quake.start(now);
        quake.stop(now + 0.95);

      } else if (type === 'quantum') {
        // Quantum teleport laser
        const zap = actx.createOscillator();
        const zGain = actx.createGain();
        zap.type = 'sine';
        zap.frequency.setValueAtTime(120, now);
        zap.frequency.exponentialRampToValueAtTime(2400, now + 0.4);
        zap.frequency.exponentialRampToValueAtTime(80, now + 0.7);
        zGain.gain.setValueAtTime(0.3, now);
        zGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        zap.connect(zGain);
        zGain.connect(actx.destination);
        zap.start(now);
        zap.stop(now + 0.8);

      } else if (type === 'fly') {
        // Housefly buzz
        const fly = actx.createOscillator();
        const fGain = actx.createGain();
        fly.type = 'sawtooth';
        fly.frequency.setValueAtTime(180, now);
        // Vibrato
        const lfo = actx.createOscillator();
        lfo.frequency.setValueAtTime(24, now);
        const lfoGain = actx.createGain();
        lfoGain.gain.setValueAtTime(30, now);
        lfo.connect(fly.frequency);
        lfo.start(now);
        lfo.stop(now + 1.5);

        fGain.gain.setValueAtTime(0.2, now);
        fGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        fly.connect(fGain);
        fGain.connect(actx.destination);
        fly.start(now);
        fly.stop(now + 1.5);

      } else if (type === 'solar') {
        // Solar flare noise sweep
        const bufferSize = actx.sampleRate * 0.9;
        const noiseBuffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
        const out = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) out[i] = Math.random() * 2 - 1;
        const src = actx.createBufferSource();
        src.buffer = noiseBuffer;
        const filter = actx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(3200, now + 0.6);
        filter.Q.value = 8.0;
        const gain = actx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(actx.destination);
        src.start(now);

      } else if (type === 'bassdrop') {
        // Subwoofer 808
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.9);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(now);
        osc.stop(now + 1.15);

      } else if (type === 'ligo') {
        // Gravitational wave chirp (rising sine 40 -> 400Hz)
        const chirp = actx.createOscillator();
        const cGain = actx.createGain();
        chirp.type = 'sine';
        chirp.frequency.setValueAtTime(45, now);
        chirp.frequency.exponentialRampToValueAtTime(480, now + 0.45);
        cGain.gain.setValueAtTime(0.35, now);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        chirp.connect(cGain);
        cGain.connect(actx.destination);
        chirp.start(now);
        chirp.stop(now + 0.55);

      } else {
        // Generic sudden glitch buzz
        const buzz = actx.createOscillator();
        const bGain = actx.createGain();
        buzz.type = 'sawtooth';
        buzz.frequency.setValueAtTime(80, now);
        bGain.gain.setValueAtTime(0.3, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        buzz.connect(bGain);
        bGain.connect(actx.destination);
        buzz.start(now);
        buzz.stop(now + 0.45);
      }
    } catch (e) {}
  }

  // --- Sabotage Scenarios Pool ---
  const SABOTAGE_EVENTS = [
    {
      id: 'truck',
      icon: '🚚💨',
      title: '18-WHEELER ON INTERSTATE 95',
      desc: 'A Peterbilt semi hauling 40 tons of gravel rumbled by 1.2 miles away.',
      shakeClass: 'shake-truck',
      audio: 'truck',
      impulseAngle: 0.48,
      impulseBubble: -0.85
    },
    {
      id: 'quake',
      icon: '🌋',
      title: 'TECTONIC MICRO-SLIP (0.003 RICHTER)',
      desc: 'San Andreas fault sneezed. North American tectonic plate shifted 3 nanometers.',
      shakeClass: 'shake-quake',
      audio: 'quake',
      impulseAngle: -0.56,
      impulseBubble: 0.92
    },
    {
      id: 'quantum',
      icon: '⚛️',
      title: 'WAVEFUNCTION COLLAPSED!',
      desc: 'By staring directly at the center hairline, you measured the bubble. Position randomized!',
      shakeClass: 'shake-quantum',
      audio: 'quantum',
      impulseAngle: 0.39,
      impulseBubble: -0.75,
      triggerGlitch: true
    },
    {
      id: 'fly',
      icon: '🪰',
      title: 'TACTICAL HOUSEFLY TOUCHDOWN',
      desc: 'A Musca domestica landed on the right edge (+0.0042° ballast added). Click fly to swat!',
      shakeClass: '',
      audio: 'fly',
      impulseAngle: 0.32,
      impulseBubble: 0.65,
      spawnFly: true
    },
    {
      id: 'solar',
      icon: '☀️💥',
      title: 'CORONAL MASS EJECTION',
      desc: 'Geomagnetic solar flare ion stream distorted local gravitational curvature.',
      shakeClass: 'shake-quake',
      audio: 'solar',
      impulseAngle: -0.44,
      impulseBubble: -0.88
    },
    {
      id: 'bassdrop',
      icon: '🔊🔥',
      title: "NEIGHBOR'S HONDA CIVIC SUBWOOFER",
      desc: 'Dual 12-inch competition subs blasted 28Hz 808 bass through the workshop wall.',
      shakeClass: 'shake-truck',
      audio: 'bassdrop',
      impulseAngle: 0.64,
      impulseBubble: 0.95
    },
    {
      id: 'ligo',
      icon: '🌌',
      title: 'GRAVITATIONAL WAVE DETECTED',
      desc: 'Binary black hole merger in NGC 4993 warped spacetime through your workbench.',
      shakeClass: 'shake-quantum',
      audio: 'ligo',
      impulseAngle: -0.38,
      impulseBubble: -0.72
    },
    {
      id: 'sneeze',
      icon: '🤧',
      title: 'CONTRACTOR HEAVY SNEEZE',
      desc: 'Foreman sneezed in the hallway trailer. Barometric displacement wave arrived.',
      shakeClass: 'shake-truck',
      audio: 'truck',
      impulseAngle: 0.52,
      impulseBubble: 0.8
    }
  ];

  let sabotageIndex = 0;

  function triggerSabotage() {
    if (state.isSabotaging) return;
    state.isSabotaging = true;
    state.disastersCount++;
    statDisasters.textContent = state.disastersCount;

    // Pick event
    const event = SABOTAGE_EVENTS[sabotageIndex % SABOTAGE_EVENTS.length];
    sabotageIndex++;

    // Play Disaster Sound
    playDisasterAudio(event.audio);

    // Apply Physical Kick
    const dir = Math.random() > 0.5 ? 1 : -1;
    state.targetAngle += event.impulseAngle * dir;
    state.angle += event.impulseAngle * dir;
    state.bubbleVel += event.impulseBubble * -dir;

    // Screen Shake Animation
    if (event.shakeClass) {
      document.body.classList.add(event.shakeClass);
      setTimeout(() => {
        document.body.classList.remove(event.shakeClass);
      }, 900);
    }

    // Quantum Glitch
    if (event.triggerGlitch) {
      vialGlitch.classList.add('active');
      setTimeout(() => vialGlitch.classList.remove('active'), 600);
    }

    // Spawn fly
    if (event.spawnFly) {
      state.flyActive = true;
      flyActor.classList.remove('hidden');
    }

    // Show Sabotage Banner
    sabotageIcon.textContent = event.icon;
    sabotageTitle.textContent = event.title;
    sabotageDesc.textContent = event.desc;
    sabotageBanner.classList.remove('hidden');

    // Spawn a bunch of trailing panic bubbles
    for (let i = 0; i < 8; i++) {
      state.microBubbles.push({
        x: state.bubblePos + (Math.random() - 0.5) * 0.15,
        y: (Math.random() - 0.5) * 16,
        r: 1.5 + Math.random() * 2.5,
        vx: (Math.random() - 0.5) * 0.05,
        life: 1.0
      });
    }

    setTimeout(() => {
      sabotageBanner.classList.add('hidden');
      state.isSabotaging = false;
    }, 3800);
  }

  // --- Physical Simulation Loop ---
  function updatePhysics(dt) {
    // 1. Hand Tremor Simulation
    let tremor = 0;
    if (!state.holdingBreath) {
      const now = performance.now() * 0.008;
      tremor = (Math.sin(now * 3.7) * 0.0018 + Math.cos(now * 7.1) * 0.0012);
    } else {
      state.breathTimeLeft -= dt;
      if (state.breathTimeLeft <= 0) {
        // Ran out of breath! Sudden gasp shudder!
        state.holdingBreath = false;
        state.breathExhausted = true;
        btnBreath.classList.remove('holding');
        breathIndicator.textContent = 'GASP! EXHAUSTED (RECOVERING)';
        breathIndicator.classList.remove('steady');
        playTickSound(240, 0.2);
        state.targetAngle += (Math.random() - 0.5) * 0.12;
        setTimeout(() => {
          state.breathExhausted = false;
          state.breathTimeLeft = 6.0;
          breathIndicator.textContent = 'NORMAL HAND TREMOR (ACTIVE)';
        }, 3000);
      } else {
        breathIndicator.textContent = `HOLDING BREATH (${state.breathTimeLeft.toFixed(1)}s)`;
      }
    }

    // 2. Fly ballast effect
    let flyWeight = state.flyActive ? 0.008 : 0;

    // Smooth approach of actual angle to target angle
    const targetWithEffects = state.targetAngle + tremor + flyWeight;
    state.angle += (targetWithEffects - state.angle) * Math.min(dt * 18, 0.4);

    // Keep angle within [-45, 45]
    state.angle = Math.max(-45, Math.min(45, state.angle));

    // Update Slider UI
    angleSlider.value = state.angle;

    // 3. Fluid Bubble Dynamics
    // Buoyant acceleration is proportional to sin of angle (bubble wants to float to the highest end)
    const rad = (state.angle * Math.PI) / 180;
    const buoyantAccel = -Math.sin(rad) * 4.5; // Bubble floats uphill
    const fluidDrag = 3.6;

    state.bubbleVel += buoyantAccel * dt;
    state.bubbleVel -= state.bubbleVel * fluidDrag * dt;
    state.bubblePos += state.bubbleVel * dt;

    // Boundary bounce / squish inside vial (-0.88 to +0.88)
    const vialLimit = 0.88;
    if (state.bubblePos > vialLimit) {
      state.bubblePos = vialLimit;
      if (Math.abs(state.bubbleVel) > 0.05) {
        playBubbleSloshSound(Math.abs(state.bubbleVel));
      }
      state.bubbleVel = -state.bubbleVel * 0.25;
    } else if (state.bubblePos < -vialLimit) {
      state.bubblePos = -vialLimit;
      if (Math.abs(state.bubbleVel) > 0.05) {
        playBubbleSloshSound(Math.abs(state.bubbleVel));
      }
      state.bubbleVel = -state.bubbleVel * 0.25;
    }

    // Play subtle sloshing when bubble moves
    if (Math.abs(state.bubbleVel) > 0.4 && Math.random() < 0.1) {
      playBubbleSloshSound(Math.abs(state.bubbleVel));
    }

    // 4. Update Micro Bubbles
    for (let i = state.microBubbles.length - 1; i >= 0; i--) {
      const mb = state.microBubbles[i];
      mb.x += mb.vx * dt;
      mb.life -= dt * 0.9;
      if (mb.life <= 0) {
        state.microBubbles.splice(i, 1);
      }
    }

    // 5. Impossible Center Sabotage Detection
    const absAngle = Math.abs(state.angle);
    const absBubble = Math.abs(state.bubblePos);

    // Track best attempt record
    if (absAngle < state.closestApproach) {
      state.closestApproach = absAngle;
      statClosest.textContent = `${absAngle.toFixed(5)}°`;
      bestVal.textContent = `${absAngle.toFixed(5)}°`;
    }

    // DEAD CENTER ZONE: angle within 0.0006° and bubble within 0.008
    if (absAngle < 0.0008 || absBubble < 0.012) {
      state.inDeadCenterTime += dt;
      toleranceBadge.textContent = 'PERFECTION IMMINENT!';
      toleranceBadge.className = 'oled-status critical';

      if (state.inDeadCenterTime > 0.05 && state.inDeadCenterTime < 0.1) {
        playAngelicChime();
      }

      if (state.inDeadCenterTime >= 0.28 && !state.isSabotaging) {
        triggerSabotage();
        state.inDeadCenterTime = 0.0;
      }
    } else if (absAngle < 0.05) {
      state.inDeadCenterTime = 0.0;
      toleranceBadge.textContent = 'NEAR EQUILIBRIUM';
      toleranceBadge.className = 'oled-status near';
    } else {
      state.inDeadCenterTime = 0.0;
      toleranceBadge.textContent = 'OUT OF SPEC';
      toleranceBadge.className = 'oled-status';
    }

    // 6. Cold Beer Physics
    if (state.beerActive) {
      if (Math.abs(state.angle) > 14) {
        beerCan.classList.add('spilling');
        if (!state.beerSpilled) {
          state.beerSpilled = true;
          playBeerSound();
        }
      } else {
        beerCan.classList.remove('spilling');
        state.beerSpilled = false;
      }
    }

    // 7. Auxiliary Vials (45° and 90°)
    const pos45 = Math.max(-10, Math.min(10, (state.angle - 45) * 0.25));
    const pos90 = Math.max(-10, Math.min(10, (state.angle - 90) * 0.25));
    bubble45.style.transform = `translateX(${pos45}px)`;
    bubble90.style.transform = `translateX(${pos90}px)`;

    // 8. Render Level Beam Rotation or Reality Inversion
    if (!state.realityMode) {
      levelBeam.style.transform = `rotate(${state.angle}deg)`;
      document.body.style.setProperty('--reality-angle', '0deg');
    } else {
      levelBeam.style.transform = 'rotate(0deg)';
      document.body.style.setProperty('--reality-angle', `${-state.angle}deg`);
    }

    // 9. Update OLED Telemetry
    const sign = state.angle >= 0 ? '+' : '-';
    oledSign.textContent = sign;
    oledDigits.textContent = absAngle.toFixed(6);
    deltaVal.textContent = `${absAngle.toFixed(6)}°`;
  }

  // --- Canvas Bubble Rendering ---
  function renderVial() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const usableHalfWidth = (canvasWidth - 70) / 2;

    // Bubble Center Position in Pixels
    const bPixelX = centerX + state.bubblePos * usableHalfWidth;
    const bPixelY = centerY;

    // Squish factor based on acceleration and velocity
    const squish = 1.0 + Math.min(Math.abs(state.bubbleVel) * 0.15, 0.35);
    const bubbleRx = 24 * squish;
    const bubbleRy = 14 / (squish * 0.9);

    // Draw Micro-bubbles
    for (const mb of state.microBubbles) {
      const mbX = centerX + mb.x * usableHalfWidth;
      const mbY = centerY + mb.y;
      ctx.beginPath();
      ctx.arc(mbX, mbY, mb.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${mb.life * 0.75})`;
      ctx.fill();
    }

    // Draw Main Air Bubble
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(bPixelX, bPixelY, bubbleRx, bubbleRy, 0, 0, Math.PI * 2);

    // Outer Bubble Shadow / Contrast Ring
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.stroke();

    // Bubble Inner Shading / Fluid Refraction
    const bGrad = ctx.createRadialGradient(
      bPixelX - bubbleRx * 0.25,
      bPixelY - bubbleRy * 0.3,
      bubbleRx * 0.1,
      bPixelX,
      bPixelY,
      bubbleRx
    );
    bGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    bGrad.addColorStop(0.35, 'rgba(240, 253, 244, 0.85)');
    bGrad.addColorStop(0.7, 'rgba(187, 247, 208, 0.4)');
    bGrad.addColorStop(1, 'rgba(134, 239, 172, 0.1)');

    ctx.fillStyle = bGrad;
    ctx.fill();

    // Specular Highlight Glint on Glass
    ctx.beginPath();
    ctx.ellipse(bPixelX - bubbleRx * 0.3, bPixelY - bubbleRy * 0.35, bubbleRx * 0.35, bubbleRy * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();

    ctx.restore();
  }

  // --- Animation Frame Loop ---
  function loop(timestamp) {
    const dt = Math.min((timestamp - state.lastTime) / 1000, 0.1);
    state.lastTime = timestamp;

    updatePhysics(dt);
    renderVial();

    requestAnimationFrame(loop);
  }

  // --- Seconds Pursuing Perfection Counter ---
  setInterval(() => {
    state.timePursuingSec++;
    const m = Math.floor(state.timePursuingSec / 60).toString().padStart(2, '0');
    const s = (state.timePursuingSec % 60).toString().padStart(2, '0');
    statTime.textContent = `${m}:${s}`;
  }, 1000);

  // --- Interactive Dragging (Mouse & Touch) ---
  function startDrag(e) {
    e.preventDefault();
    getAudioContext();
    state.isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    state.dragAnchor = { x: clientX, y: clientY, startAngle: state.targetAngle };
  }

  function onDrag(e) {
    if (!state.isDragging || !state.dragAnchor) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = levelBeam.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angleNow = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    const angleStart = Math.atan2(state.dragAnchor.y - centerY, state.dragAnchor.x - centerX) * (180 / Math.PI);

    let delta = angleNow - angleStart;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    state.targetAngle = state.dragAnchor.startAngle + delta;
    playTickSound(800 + Math.abs(state.targetAngle) * 50, 0.008);
  }

  function stopDrag() {
    state.isDragging = false;
    state.dragAnchor = null;
  }

  levelBeam.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);

  levelBeam.addEventListener('touchstart', startDrag, { passive: false });
  window.addEventListener('touchmove', onDrag, { passive: false });
  window.addEventListener('touchend', stopDrag);

  handleLeft.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    state.targetAngle -= 0.5;
    playTickSound(900);
  });

  handleRight.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    state.targetAngle += 0.5;
    playTickSound(900);
  });

  // --- Step Adjustment Buttons ---
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      getAudioContext();
      const step = parseFloat(e.currentTarget.getAttribute('data-step'));
      state.targetAngle += step;
      playTickSound(1100 + step * 200);
    });
  });

  // Vernier Thumbwheel Slider
  angleSlider.addEventListener('input', (e) => {
    getAudioContext();
    state.targetAngle = parseFloat(e.target.value);
    playTickSound(1400, 0.005);
  });

  // Instant Snap Zero Button
  btnSnapZero.addEventListener('click', () => {
    getAudioContext();
    state.targetAngle = 0.0;
    state.angle = 0.0;
    state.bubblePos = 0.0;
    playTickSound(1600, 0.05);
  });

  // Hold Breath Button & Spacebar
  function toggleHoldBreath() {
    getAudioContext();
    if (state.breathExhausted) return;
    state.holdingBreath = !state.holdingBreath;
    if (state.holdingBreath) {
      btnBreath.classList.add('holding');
      breathIndicator.classList.add('steady');
      playTickSound(880, 0.05);
    } else {
      btnBreath.classList.remove('holding');
      breathIndicator.classList.remove('steady');
      breathIndicator.textContent = 'NORMAL HAND TREMOR (ACTIVE)';
    }
  }

  btnBreath.addEventListener('click', toggleHoldBreath);

  // Auto-Level Servo Routine (Teases the user down to 0.00000° before sabotage)
  btnAutoLevel.addEventListener('click', () => {
    getAudioContext();
    if (state.autoLeveling) return;
    state.autoLeveling = true;
    btnAutoLevel.classList.add('active');

    let currentVal = state.targetAngle || 2.5;
    let step = 0;
    const servoInterval = setInterval(() => {
      step++;
      currentVal = currentVal * 0.45;
      playTickSound(400 + step * 120, 0.04);
      state.targetAngle = currentVal;

      if (Math.abs(currentVal) < 0.00005 || step > 12) {
        clearInterval(servoInterval);
        state.targetAngle = 0.00000;
        state.autoLeveling = false;
        btnAutoLevel.classList.remove('active');
      }
    }, 180);
  });

  // Slap Level Twice Button ("YEP, THAT AIN'T GOIN' NOWHERE")
  btnSlap.addEventListener('click', () => {
    getAudioContext();
    playSlapSound();
    slapOverlay.classList.remove('hidden');
    state.targetAngle += (Math.random() - 0.5) * 0.08;
    setTimeout(() => {
      slapOverlay.classList.add('hidden');
    }, 1200);
  });

  // Cold Beer Rest Button
  btnBeer.addEventListener('click', () => {
    getAudioContext();
    state.beerActive = !state.beerActive;
    if (state.beerActive) {
      beerCan.classList.remove('hidden');
      btnBeer.classList.add('active');
      playBeerSound();
    } else {
      beerCan.classList.add('hidden');
      btnBeer.classList.remove('active');
    }
  });

  // Level Reality Mode (Inverted frame of reference)
  btnReality.addEventListener('click', () => {
    getAudioContext();
    state.realityMode = !state.realityMode;
    document.body.classList.toggle('reality-mode', state.realityMode);
    btnReality.classList.toggle('active', state.realityMode);
    playTickSound(state.realityMode ? 1600 : 800, 0.08);
  });

  // Device Gyroscope / Accelerometer
  btnGyro.addEventListener('click', () => {
    getAudioContext();
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            enableGyro();
          } else {
            alert('Device orientation permission denied.');
          }
        })
        .catch(console.error);
    } else {
      enableGyro();
    }
  });

  function enableGyro() {
    btnGyro.classList.add('active');
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma !== null) {
        // e.gamma is left-to-right tilt in degrees (-90 to +90)
        state.targetAngle = Math.max(-25, Math.min(25, e.gamma));
      }
    });
  }

  // Swat Rogue Fly Actor
  flyActor.addEventListener('click', (e) => {
    e.stopPropagation();
    getAudioContext();
    playTickSound(1400, 0.05);
    state.flyActive = false;
    flyActor.classList.add('hidden');
  });

  // Sound Toggle Button
  btnSound.addEventListener('click', () => {
    state.audioEnabled = !state.audioEnabled;
    btnSound.classList.toggle('active', state.audioEnabled);
    btnSound.querySelector('.btn-text').textContent = state.audioEnabled ? 'AUDIO ON' : 'MUTED';
    btnSound.querySelector('.btn-icon').textContent = state.audioEnabled ? '🔊' : '🔇';
  });

  // Keyboard Navigation & Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.repeat && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    getAudioContext();

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (e.shiftKey) {
          state.targetAngle -= 0.001;
        } else {
          state.targetAngle -= 0.05;
        }
        playTickSound(900);
        break;

      case 'ArrowRight':
      case 'd':
      case 'D':
        if (e.shiftKey) {
          state.targetAngle += 0.001;
        } else {
          state.targetAngle += 0.05;
        }
        playTickSound(1100);
        break;

      case ' ':
        e.preventDefault();
        toggleHoldBreath();
        break;

      case 's':
      case 'S':
        btnSlap.click();
        break;

      case 'b':
      case 'B':
        btnBeer.click();
        break;

      case 'r':
      case 'R':
        btnReality.click();
        break;

      case 'm':
      case 'M':
        btnSound.click();
        break;

      case '0':
        btnSnapZero.click();
        break;
    }
  });

  // Init Ruler Ticks in DOM
  function generateRulerTicks() {
    const ticksTop = document.getElementById('ticks-top');
    const ticksBottom = document.getElementById('ticks-bottom');
    if (ticksTop) {
      let topHtml = '';
      for (let i = 0; i <= 36; i++) {
        topHtml += `<span style="display:inline-block; width:1px; height:${i % 6 === 0 ? '8px' : '4px'}; background:#475569; margin: 0 5px;"></span>`;
      }
      ticksTop.innerHTML = topHtml;
    }
    if (ticksBottom) {
      let bHtml = '';
      for (let i = 0; i <= 50; i++) {
        bHtml += `<span style="display:inline-block; width:1px; height:${i % 10 === 0 ? '8px' : i % 5 === 0 ? '6px' : '3px'}; background:#475569; margin: 0 4px;"></span>`;
      }
      ticksBottom.innerHTML = bHtml;
    }
  }

  // Window Resize Listener
  window.addEventListener('resize', resizeCanvas);

  // --- Bootstrap ---
  generateRulerTicks();
  resizeCanvas();
  requestAnimationFrame(loop);
})();
