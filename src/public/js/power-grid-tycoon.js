/* === Annotated copy (comments only; logic unchanged) ===
   Generated: 2025-11-14T20:46:55
   Notes:
     - Comments were inserted above functions/classes/handlers/config/state.
     - You can safely edit code; comments won't affect behavior.
     - Search for 'SECTION' or 'Function' to jump around.
*/

import { applyEventAdjustments, finalizeSupplyDemandBalance } from './power-grid-sim-core.js';
import { createSupplyDemandToleranceTracker } from './supply-demand-tolerance.js';
import { computeBatterySaturation, isBatteryFleetFull } from './battery-state.js';
import { computeReserveRequirement } from './reserve-requirement.js';
import {
  clampOutageLevel,
  computeGasOutageDuration,
  describeGasOutageLevel,
  formatOutageDuration
} from './gas-outage.js';
import {
  CUSTOMER_MARKUP_RATE,
  createFuelSpendTracker,
  recordFuelSpend,
  resetFuelSpendTracker,
  computeCustomerPayment,
  computeReputationIncomeMultiplier,
  computeCustomerLoadPenalty
} from './power-grid-economy.js';

(function(){
  // ---------- Utilities ----------
  const el = q => document.querySelector(q);
// Function (arrow): els(q) — purpose: [describe].
  const els = q => Array.from(document.querySelectorAll(q));
// Function (arrow): fmt(n) — purpose: [describe].
  const fmt = n => Math.round(n).toLocaleString();
// Function (arrow): clamp(n, lo, hi) — purpose: [describe].
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
// Function (arrow): rand(a, b) — purpose: [describe].
  const rand = (a, b) => a + Math.random()*(b-a);
// Function (arrow): choice(arr) — purpose: [describe].
  const choice = arr => arr[Math.floor(Math.random()*arr.length)];
  const padClock = n => n.toString().padStart(2,'0');
  const weightedChoice = (options=[]) => {
    const safeOptions = options.filter(opt => typeof opt?.weight === 'number' && opt.weight > 0);
    const total = safeOptions.reduce((sum,opt)=>sum+opt.weight,0);
    if(!safeOptions.length || total<=0) return safeOptions[0]?.type;
    let pick = Math.random()*total;
    for(const opt of safeOptions){
      pick -= opt.weight;
      if(pick<=0) return opt.type;
    }
    return safeOptions[safeOptions.length-1]?.type;
  };
  const escapeHtml = (str='') => String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');

  // ---------- Elements ----------
  const demandEl = el('#demand'), supplyEl = el('#supply'), balanceEl = el('#balance');
  const freqEl = el('#freq'), priceEl = el('#price'), cashEl = el('#cash');
  const repEl = el('#rep'), uptimeEl = el('#uptime');
  const dLbl = el('#demandLbl'), sLbl = el('#supplyLbl'), dBar = el('#dBar'), sBar = el('#sBar');
  const needle = el('#needle'), toast = el('#toast');
  const notificationLogEl = el('#notificationLog');
  const notificationLogWrapperEl = el('#notificationLogWrapper');
  const historyCanvas = el('#history'), ctx = historyCanvas.getContext('2d');
  const seasonHudEl = el('#seasonHud');
  const timerEl = el('#timer'),
        seasonEl = el('#hudSeason'),
        dayEl = el('#hudDay'),
        timeEl = el('#hudTime'),
        sunlightInfoEl = el('#hudSunlightInfo'),
        windInfoEl = el('#hudWindInfo'),
        demandAvgEl = el('#hudDemandAvg'),
        supplyAvgEl = el('#hudSupplyAvg'),
        incomeAvgEl = el('#hudIncomeAvg');
  const genList = el('#genList'), custList = el('#custList');
  const batteryStatusEl = el('#batteryStatus');
  const buildTbody = el('#buildTable tbody'), buildQueueEl = el('#buildQueue');
  const offersArea = el('#offersArea'), upgradesArea = el('#upgradesArea');
  const leaderNameInput = el('#leaderName'), leaderSaveBtn = el('#saveScoreBtn'), leaderSaveStatus = el('#leaderSaveStatus');
  const openDailyReportBtn = el('#openDailyReport'), openSeasonReportBtn = el('#openSeasonReport');
  const dailyReportModal = el('#dailyReportModal'),
        dailyReportPanel = el('#dailyReportPanel'),
        dailyReportTitleEl = el('#dailyReportTitle'),
        dailyReportSubtitleEl = el('#dailyReportSubtitle'),
        dailyReportLeadEl = el('#dailyReportLead'),
        dailyReportMetricsEl = el('#dailyReportMetrics'),
        dailyReportLogEl = el('#dailyReportLog'),
        dailyReportEmptyEl = el('#dailyReportEmpty');
  const seasonReportModal = el('#seasonReportModal'),
        seasonReportPanel = el('#seasonReportPanel'),
        seasonReportTitleEl = el('#seasonReportTitle'),
        seasonReportSubtitleEl = el('#seasonReportSubtitle'),
        seasonReportLeadEl = el('#seasonReportLead'),
        seasonReportMetricsEl = el('#seasonReportMetrics'),
        seasonReportLogEl = el('#seasonReportLog'),
        seasonReportEmptyEl = el('#seasonReportEmpty');

  // ---------- Config ----------
  const TICK_MS_BASE = 1000;
  const SAFE_HZ_MIN = 58.5, SAFE_HZ_MAX = 61.5, TARGET_HZ = 60.0;
  const DAY_SECONDS = 240;          // 4 real minutes = 24h in-game (1 in-game hour ≈ 10s)
  const CUSTOMER_DISCONNECT_GRACE_SECONDS = 3;
  const CUSTOMER_DISCONNECT_PENALTY_INTERVAL = 3;
  const HISTORY_LEN = 60;           // seconds for chart
  const SEASONS = ['Spring','Summer','Fall','Winter'];
  const DAYS_PER_SEASON = 28;
  const SEASON_CLASS_MAP = {
    spring: 'season-theme--spring',
    summer: 'season-theme--summer',
    fall: 'season-theme--fall',
    winter: 'season-theme--winter'
  };

  const SEASONAL_CLIMATE = {
    Spring: {
      sunrise: 6.5,   // ~6:30 AM average in Columbia, SC
      sunset: 19.0,   // ~7:00 PM
      solarPeak: 0.95,
      windRange: [3, 18],
      windRefSpeed: 26,
      lateSeasonWindBoost: 1.12
    },
    Summer: {
      sunrise: 6.0,  // ~6:00 AM
      sunset: 21.0,  // ~9:00 PM (most sunlight)
      solarPeak: 1.05,
      windRange: [3, 9],
      windRefSpeed: 24,
      lateSeasonWindBoost: 1.02
    },
    Fall: {
      sunrise: 7.5,   // ~7:30 AM
      sunset: 18.5,   // ~6:30 PM
      solarPeak: 0.9,
      windRange: [5, 21],
      windRefSpeed: 27,
      lateSeasonWindBoost: 1.15
    },
    Winter: {
      sunrise: 8.0,   // ~8:00 AM
      sunset: 17.25,  // ~5:15 PM
      solarPeak: 0.8,
      windRange: [2, 12],
      windRefSpeed: 23,
      lateSeasonWindBoost: 1.05
    }
  };

  const WEATHER_TYPES = {
    sunny: { label:'Sunny', solarMultiplier:1.0, windMultiplier:0.7, windSpeedBonus:0 },
    cloudy: { label:'Cloudy', solarMultiplier:0.75, windMultiplier:1.2, windSpeedBonus:-0.5 },
    rainy: { label:'Rainy', solarMultiplier:0.55, windMultiplier:1.5, windSpeedBonus:0.8 },
    winterRain: { label:'Cold Rain', solarMultiplier:0.45, windMultiplier:0.9, windSpeedBonus:1.1 }
  };

  const WEATHER_WEIGHTS = {
    Spring: [
      { type:'sunny', weight:0.5 },
      { type:'cloudy', weight:0.3 },
      { type:'rainy', weight:0.2 }
    ],
    Summer: [
      { type:'sunny', weight:0.6 },
      { type:'cloudy', weight:0.25 },
      { type:'rainy', weight:0.15 }
    ],
    Fall: [
      { type:'sunny', weight:0.4 },
      { type:'cloudy', weight:0.3 },
      { type:'rainy', weight:0.3 }
    ],
    Winter: [
      { type:'sunny', weight:0.3 },
      { type:'cloudy', weight:0.35 },
      { type:'rainy', weight:0.2 },
      { type:'winterRain', weight:0.15 }
    ]
  };

  const BATTERY_FULL_THRESHOLD = 0.98; // how full storage must be before oversupply trips safety

// SECTION: Configuration object `DIFFICULTY` — tweak constants/knobs here
  const DIFFICULTY = {
    easy:   { noise: 3, mismatchHzFactor: 0.013, payoutMul: 1.0 },
    normal: { noise: 6, mismatchHzFactor: 0.018, payoutMul: 1.0 },
    hard:   { noise: 9, mismatchHzFactor: 0.026, payoutMul: 0.9 }
  };

  const oversupplyGuard = ({ context }) => {
    const batteriesFull = Boolean(context?.batteriesFull);
    const beyondReserve = Number(context?.oversupplyBeyondReserve) || 0;
    return batteriesFull && beyondReserve > 0;
  };

  const SUPPLY_DEMAND_TOLERANCE = {
    baseTolerancePct: 0,
    bands: [
      { name: 'major oversupply', direction: 'oversupply', minPct: 0.13, maxPct: 0.18, duration: 45, guard: oversupplyGuard },
      { name: 'moderate oversupply', direction: 'oversupply', minPct: 0.08, maxPct: 0.12, duration: 60, guard: oversupplyGuard },
      { name: 'deficit', direction: 'undersupply', minPct: 0.08, maxPct: 0.08, duration: 90 }
    ]
  };

  // Buildable definitions
  const BLUEPRINTS = [
    { key:'coal',  name:'Coal Unit',  fuel:'coal',  cap:60,  startup:3,  opex:55,  co2:900, buildTime:16, capex:35000 },
    { key:'gas',   name:'Gas Turbine',fuel:'gas',   cap:20,  startup:2,  opex:70,  co2:450, buildTime:14, capex:18000 },
    { key:'wind',  name:'Wind Farm',  fuel:'wind',  cap:30,  startup:0,  opex:5,   co2:0,   buildTime:12, capex:18000, variable:true },
    { key:'solar', name:'Solar PV',   fuel:'solar', cap:25,  startup:0,  opex:4,   co2:0,   buildTime:10, capex:15000, variable:true },
    { key:'nuclear', name:'Nuclear',  fuel:'nuclear', cap:120,startup:12,opex:25,  co2:0,   buildTime:30, capex:120000, locked:true, unlockNote:'Profits ≥ $150k' },
    { key:'battery', name:'Battery',  fuel:'battery', cap:25, startup:0,  opex:6,  co2:0,   buildTime:12, capex:32000, isBattery:true, energyMax:25, roundTrip:1 }
  ];

// SECTION: Data table/enum `UPGRADES` — list-like configuration
  const UPGRADES = [
    { id:'agc', name:'Auto-Dispatch (AGC)', desc:'Automatically toggles a gas unit to hold ±5 MW balance.', cost:20000, owned:false },
    { id:'fore', name:'Forecast HUD', desc:'Shows next-hour demand and solar/wind forecast bands.', cost:8000, owned:false },
    { id:'marketing', name:'Marketing', desc:'+10 Reputation cap and +15% offer rate.', cost:12000, owned:false }
  ];

  // ---------- Game State ----------
  let running=false, timer=null, difficulty='normal', speed=1;
  let t=0, day=0, secondsInDay=0, seasonIndex=0;
  let freq=TARGET_HZ, price=80, cash=250000, rep=50;
  let totalDeliveredMWh=0, totalEmissionsT=0, totalOpex=0, totalRevenue=0, profit=0;
  let uptimeTicks=0, ticks=0;
  let history = [];
  let leaderboardEntries = [];
  let latestResult = null;
  let leaderboardSaving = false;
  const TELEMETRY_VERSION = 1;
  const MAX_TELEMETRY_FRAMES = 3600;
  let runTelemetry = [];
  let currentHourIndex = 0;
  let hourlyTotals = { demand:0, supply:0, income:0, ticks:0 };
  let hourlyAverages = { demand:0, supply:0, income:0 };
  let dailyTotals = createPeriodTotals();
  let seasonTotals = createPeriodTotals();
  let seasonDayCount = 0;
  let dailyLogEntries = [];
  let seasonLogEntries = [];
  let totalSeasonsCompleted = 0;
  let lastSeasonSkin = null;
  let notificationLog = [];
  let dailyAtmosphere = null;
  let hourlyFuelSpend = createFuelSpendTracker();

  const mismatchTracker = createSupplyDemandToleranceTracker(SUPPLY_DEMAND_TOLERANCE);

  // Entities
  let generators = [];
  let customers  = [];
  let buildQueue = [];
  let offers     = [];
  let events     = []; // active timed events
  let fuelMultipliers = { coal:1, gas:1 };
  let batteryCounter = 0;

  // ---------- Initialization ----------
  function initGame(){
    // Start assets (altered: include a 100 MW starter battery and four independent 10 MW gas turbines; max 40 MW thermal)
      batteryCounter = 0;
      const starterBattery = makeBattery({
        id: 'battery-1',
        name: 'Battery 1',
        power: 100,
        energyMax: 100,
        order: batteryCounter++,
        initialEnergy: 0
      });
      generators = [
        starterBattery,
        makeGen('coal-1','Coal Unit','coal',60,3,55,900,false, /*on*/ true),
        makeGen('wind-1','Wind Farm','wind',30,0,5,0,true,true),
        makeGen('solar-1','Solar PV','solar',25,0,4,0,true,true),
        makeGen('gas-1','Gas Turbine GT-1','gas',10,3,70,450,false),
        makeGen('gas-2','Gas Turbine GT-2','gas',10,3,70,450,false),
        makeGen('gas-3','Gas Turbine GT-3','gas',10,3,70,450,false),
        makeGen('gas-4','Gas Turbine GT-4','gas',10,3,70,450,false),
    ];

    // Customers: homes, store, small DC (businesses can be turned off individually)
    customers = [
      makeCustomer('Homes — Oakview', 'residential-block', 35, 'evening-peaker', 1.2, true),
      makeCustomer('Market Street Store', 'retail', 12, 'business-hours', 1.0, true),
      makeCustomer('HashBlock Mining Co.', 'crypto', 20, 'flat', 1.0, true),
      makeCustomer('Tiny Datacenter', 'datacenter', 18, 'flat', 1.0, true),
    ];

    buildQueue = [];
    offers = [];
    events = [];
    fuelMultipliers = { coal:1, gas:1 };

    running=false; clearInterval(timer); timer=null;
    t=0; day=1; seasonIndex=0;
    secondsInDay = Math.round(DAY_SECONDS * (6/24)); // start at 06:00
    resetHourlyStats(hourIndexFromSeconds(secondsInDay));
    hourlyFuelSpend = resetFuelSpendTracker(hourlyFuelSpend);
    freq=TARGET_HZ; price=80; cash=250000; rep=50;
    totalDeliveredMWh=0; totalEmissionsT=0; totalOpex=0; totalRevenue=0; profit=0;
    uptimeTicks=0; ticks=0; history=[]; runTelemetry=[]; latestResult=null;
    resetPeriodTotals(dailyTotals);
    resetPeriodTotals(seasonTotals);
    seasonDayCount = 0;
    dailyLogEntries = [];
    seasonLogEntries = [];
    totalSeasonsCompleted = 0;
    lastSeasonSkin = null;
    notificationLog = [];
    renderNotificationLog();
    renderDailyLog();
    renderSeasonLog();
    dailyAtmosphere = rollDailyAtmosphere({ announce:false });
    announceDailyAtmosphere();
    if(dailyReportMetricsEl) dailyReportMetricsEl.innerHTML = '';
    if(seasonReportMetricsEl) seasonReportMetricsEl.innerHTML = '';
    if(dailyReportLeadEl) dailyReportLeadEl.textContent = 'No daily reports yet.';
    if(seasonReportLeadEl) seasonReportLeadEl.textContent = 'No seasonal reports yet.';
    if(dailyReportSubtitleEl) dailyReportSubtitleEl.textContent = `${SEASONS[seasonIndex]} — Day ${day}`;
    const initYear = Math.floor(totalSeasonsCompleted / SEASONS.length) + 1;
    if(seasonReportSubtitleEl) seasonReportSubtitleEl.textContent = `${SEASONS[seasonIndex]} • Year ${initYear} (0 days)`;
    mismatchTracker.reset();
    els('.modal').forEach(m=>m.style.display='none');

    renderGenList(); renderCustList(); renderBuildables(); renderUpgrades();
    updateUI(0,0,0,0); drawHistory();
    setButtons();
    toastMsg('Ready. Build your grid.');
    updateClock();
    updateSeasonSkin();
    applySeasonSkin(dailyReportPanel, SEASONS[seasonIndex]);
    applySeasonSkin(seasonReportPanel, SEASONS[seasonIndex]);
  }

// Function: setButtons() — purpose: [describe]. Returns: [value/void].
  function setButtons(){
    el('#startBtn').disabled = running;
    el('#pauseBtn').disabled = !running;
    el('#resetBtn').disabled = running && ticks<2 ? true : false;
  }

  // ---------- Entity Factories ----------
  function makeGen(id,name,fuel,cap,startup,opex,co2,variable=false,on=false){
    return {
      id, name, fuel, cap, startup, opex, co2, variable, on, enabled:true, actual:0,
      isBattery: fuel==='battery', // filled when built
      energy:0, energyMax:0, roundTrip:1,
      age:0, fault:false, maint:1.0, building:false,
      gasOutage:false
    };
  }
// Function: makeBattery({ id, name, power, energyMax, roundTrip, initialEnergy, order }) — purpose: creates a battery generator with
// configured storage defaults and ordering metadata for charge/discharge priority. Returns: generator object.
  function makeBattery({ id, name, power, energyMax, roundTrip = 1, initialEnergy = 0, order = 0 }){
    const g = makeGen(id, name, 'battery', power, 0, 6, 0, false, true);
    g.isBattery = true;
    g.energyMax = Math.max(0, energyMax);
    g.energy = clamp(initialEnergy, 0, g.energyMax);
    g.roundTrip = roundTrip;
    g.batteryOrder = order;
    return g;
  }

// Function: makeCustomer(name, klass, baseMW, profile, volatility=1.0, connected=true) — purpose: [describe]. Returns: [value/void].
  function makeCustomer(name, klass, baseMW, profile, volatility=1.0, connected=true){
    return {
      id: 'c-'+Math.random().toString(36).slice(2,8),
      name,
      klass,
      baseMW,
      profile,
      volatility,
      connected,
      priceAdj:1.0,
      disconnectStartTick:null,
      disconnectPenaltyCount:0
    };
  }

  // ---------- Rendering: Generators ----------
  function renderGenList(){
    genList.innerHTML='';
    // Split gas vs. others for UI
     const gasUnits = generators.filter(g=>g.fuel==='gas');
     const others   = generators
        .filter(g=>g.fuel!=='gas' && !g.isBattery)
        .sort((a,b)=> a.name.localeCompare(b.name));
     // Render non-gas as individual rows (unchanged behavior)
     for(const g of others){
       const row = document.createElement('div');
       row.className='row';
       const tags = `<span class="tag">${g.fuel}</span>` + (g.variable?`<span class="tag">variable</span>`:'');
       const detailId = `${g.id}-detail`;
       const detailText = `Capacity ${g.cap} MW`;
       const statusHtml = g.gasOutage
         ? '<span class="bad">Gas outage</span>'
         : g.fault
           ? '<span class="bad">FAULT</span>'
           : (g.enabled? (g.on?'Online':'OFF') : `Starting (${g._startRemain||g.startup}s)`);
       row.innerHTML = `
         <div class="name">${g.name} ${tags} <div class="muted small" id="${detailId}">${detailText}</div></div>
         <div class="status">${statusHtml}</div>
         <div class="status">Out: <strong id="${g.id}-out">0</strong> MW <span class="muted">| OPEX $${g.opex}</span></div>
         <div class="right">
           <label class="switch ${g.on?'on':''}" id="${g.id}-switch" aria-label="Toggle ${g.name}"><input type="checkbox" ${g.on?'checked':''}/><div class="knob"></div></label>
         </div>`;
       genList.appendChild(row);
// UI: Event listener for 'click'
       el(`#${g.id}-switch`).addEventListener('click', (e)=>{ e.preventDefault(); toggleGen(g.id); });
     }
     // Render gas fleet as a single row with 0–N selector
      if(gasUnits.length){
        renderGasFleet(gasUnits);
      }
      renderBatteryStatus();
   }

  function renderBatteryStatus(){
    if(!batteryStatusEl) return;
    const batts = generators.filter(g=>g.isBattery);
    if(batts.length===0){
      batteryStatusEl.innerHTML = '<div class="muted small">No batteries deployed yet.</div>';
      return;
    }
    batteryStatusEl.innerHTML = '';
    const sorted = [...batts].sort((a,b)=> (a.batteryOrder??0) - (b.batteryOrder??0));
    for(const b of sorted){
      const pct = b.energyMax>0 ? Math.round((b.energy/b.energyMax)*100) : 0;
      const clampedPct = clamp(pct, 0, 100);
      const row = document.createElement('div');
      row.className = 'battery-status-row';
      const statusLabel = b.fault ? 'Faulted' : 'Auto dispatch';
      row.classList.toggle('battery-status-off', !!b.fault);
      const actual = Number.isFinite(b.actual) ? b.actual : 0;
      const outputText = (actual>0? '+' : (actual<0? '' : '')) + fmt(actual);
      row.innerHTML = `
        <div class="battery-status-meta">
          <div class="battery-status-name">${b.name}</div>
          <div class="muted small" id="${b.id}-battery-detail">Stored ${fmt(Math.round(b.energy))}/${fmt(b.energyMax)} MW (${clampedPct}%) • Output ${outputText} MW • ${statusLabel}</div>
        </div>
        <div class="battery-status-bar"><div class="battery-status-fill" style="width:${clampedPct}%"></div></div>
        <div class="battery-status-pct">${clampedPct}%</div>`;
      batteryStatusEl.appendChild(row);
    }
  }
// Function: renderGasFleet(gasUnits) — purpose: [describe]. Returns: [value/void].
   function renderGasFleet(gasUnits){
     const total = gasUnits.length;
     const online = gasUnits.filter(g=>g.on && g.enabled && !g.fault).length;
     const totalOut = gasUnits.reduce((s,g)=> s + Math.max(0,g.actual||0), 0);
     const capEach = gasUnits[0]?.cap || 0;
     const opexEach = gasUnits[0]?.opex || 0;
     const outageActive = gasUnits.some(g=>g.gasOutage);
     const row = document.createElement('div');
     row.className = 'row gas-fleet';
     row.innerHTML = `
       <div class="name">Gas Turbines (Fleet)
         <span class="tag">gas</span>
         <div class="muted small">${total} × ${capEach} MW • Startup 3s</div>
       </div>
       <div class="status">Online: <strong id="gas-online">${online}</strong> / ${total}</div>
       <div class="status">Out: <strong id="gas-out">${fmt(totalOut)}</strong> MW <span class="muted">| OPEX $${opexEach} each</span></div>
       <div class="status${outageActive?' bad':''}" id="gas-outage-status" style="${outageActive?'':'display:none'}">Gas supply outage</div>
       <div class="right">
         <div class="tight small" id="gas-controls">
           ${Array.from({length: total+1}, (_,n)=>`<button class="btn small" data-gas-n="${n}">${n}</button>`).join(' ')}
         </div>
       </div>
       `;

     genList.appendChild(row);
     // Wire 0–N buttons
     row.querySelectorAll('[data-gas-n]').forEach(btn=>{
// UI: Event listener for 'click'
       btn.addEventListener('click', ()=>{
         const n = Number(btn.getAttribute('data-gas-n'));
         setGasFleet(gasUnits, n);
       });
     });
   }
// Function: setGasFleet(gasUnits, target) — purpose: [describe]. Returns: [value/void].
    function setGasFleet(gasUnits, target){
    // Count units that are ON and not faulted (includes those starting)
    const active   = gasUnits.filter(g=>g.on && !g.fault && !g.gasOutage);
    const current  = active.length;

    // Need to start more
    if(target > current){
      const toStart  = target - current;
      const available = gasUnits.filter(g=>!g.on && !g.fault && !g.gasOutage);
      for(let i=0;i<toStart && i<available.length;i++){
        toggleGen(available[i].id);
      }
      if(toStart > available.length){
        toastMsg('Not enough healthy gas units to meet target.');
      }
    }

    // Need to stop some (prefer stopping those still starting)
    if(target < current){
      const toStop   = current - target;
      const starting = active.filter(g=>!g.enabled); // on but still starting
      const running  = active.filter(g=> g.enabled); // fully online
      const stopList = [...starting, ...running];
      for(let i=0;i<toStop && i<stopList.length;i++){
        toggleGen(stopList[i].id);
      }
    }
    updateGasFleetUI?.();
  }
// Function: toggleGen(id) — purpose: [describe]. Returns: [value/void].
  function toggleGen(id){
    const g = generators.find(x=>x.id===id); if(!g) return; // allow toggling during faults; output remains 0 until repaired
    if(g.gasOutage){
      toastMsg('Gas supply outage — unit unavailable.');
      return;
    }
    if(g.isBattery){ g.on = !g.on; updateSwitchUI(g); return; }
      const turningOn = !g.on;
    g.on = turningOn; updateSwitchUI(g);

    // If turning OFF, cancel any pending startup and clean state
    if(!turningOn){
      if(g._startTimer){ clearInterval(g._startTimer); g._startTimer = null; }
      g._startRemain = 0; g.enabled = true;
      updateStatus(g,'OFF');
      return;
    }

    if(g.startup>0){
      g.enabled=false; g._startRemain = g.startup; updateStatus(g,`Starting (${g._startRemain}s)`);
// Timer: setInterval — periodic task
      g._startTimer = setInterval(()=>{
        // Abort if player turned it OFF during startup
        if(!g.on){ clearInterval(g._startTimer); g._startTimer=null; g._startRemain=0; return; }
        g._startRemain--;
        updateStatus(g, g._startRemain>0?`Starting (${g._startRemain}s)`:'Online');
        if(g._startRemain<=0){
          clearInterval(g._startTimer); g._startTimer=null;
          g.enabled=true; g._startRemain=0;
        }
      }, 1000/Math.max(1,speed));
    }else{
      g.enabled=true; updateStatus(g,'Online');
    }
  }
// Function: updateSwitchUI(g) — purpose: [describe]. Returns: [value/void].
  function updateSwitchUI(g){
    const sw = el(`#${g.id}-switch`); if(!sw) return;
    sw.classList.toggle('on', !!g.on);
    const input = sw.querySelector('input'); if(input) input.checked = !!g.on;
  }
// Function: updateStatus(g, text) — purpose: [describe]. Returns: [value/void].
  function updateStatus(g, text){ const s = el(`#${g.id}-out`)?.parentElement?.previousElementSibling; if(s) s.innerHTML = text; }

  // ---------- Rendering: Customers ----------
  function renderCustList(){
    custList.innerHTML='';
    for(const c of customers){
      const row = document.createElement('div');
      row.className='row';
      row.innerHTML = `
        <div class="name">${c.name} <span class="tag">${c.klass.replace('-',' ')}</span><div class="muted small">Contract ${fmt(c.baseMW)} MW • Profile ${c.profile}</div></div>
        <div class="status">Status: ${c.connected?'<span class="good">Connected</span>':'<span class="warn">Disconnected</span>'}</div>
        <div class="status">Load: <strong id="${c.id}-d">0</strong> MW</div>
        <div class="right">
          <label class="switch ${c.connected?'on':''}" id="${c.id}-switch" aria-label="Connect ${c.name}"><input type="checkbox" ${c.connected?'checked':''}/><div class="knob"></div></label>
        </div>`;
      custList.appendChild(row);
// UI: Event listener for 'click'
      el(`#${c.id}-switch`).addEventListener('click', (e)=>{ e.preventDefault(); c.connected=!c.connected; updateCustSwitch(c); });
    }
  }
// Function: updateCustSwitch(c) — purpose: [describe]. Returns: [value/void].
  function updateCustSwitch(c){
    const sw = el(`#${c.id}-switch`); if(!sw) return;
    sw.classList.toggle('on', !!c.connected);
    const input=sw.querySelector('input'); if(input) input.checked = !!c.connected;
    if(c.connected){
      c.disconnectStartTick = null;
      c.disconnectPenaltyCount = 0;
    }else{
      c.disconnectStartTick = t;
      c.disconnectPenaltyCount = 0;
    }
    // minor rep effect for disconnects
    rep = clamp(rep + (c.connected? +1 : -2), 0, 110);
  }

  function processCustomerDisconnectPenalties(){
    if(!Array.isArray(customers) || !customers.length) return;
    for(const c of customers){
      if(!c || c.connected !== false) continue;
      if(typeof c.disconnectStartTick !== 'number') continue;
      const elapsed = Math.max(0, t - c.disconnectStartTick);
      const overGrace = elapsed - CUSTOMER_DISCONNECT_GRACE_SECONDS;
      if(overGrace < 0) continue;
      const penaltySteps = Math.floor(overGrace / CUSTOMER_DISCONNECT_PENALTY_INTERVAL) + 1;
      const applied = Number.isFinite(c.disconnectPenaltyCount) ? c.disconnectPenaltyCount : 0;
      if(penaltySteps <= applied) continue;
      const penaltyAmount = computeCustomerLoadPenalty(c.baseMW);
      const increments = penaltySteps - applied;
      for(let i=0;i<increments;i++){
        applyCustomerDisconnectPenalty(c, penaltyAmount);
      }
      c.disconnectPenaltyCount = applied + increments;
    }
  }

  function applyCustomerDisconnectPenalty(customer, penaltyAmount){
    const amount = Math.max(0, Number.isFinite(penaltyAmount) ? penaltyAmount : computeCustomerLoadPenalty(customer?.baseMW));
    if(amount <= 0) return;
    rep = clamp(rep - amount, 0, 110);
    logNotification(`${customer?.name || 'Customer'} upset — reputation −${amount.toFixed(1)} for extended shutdown.`);
  }

  // ---------- Buildables / Upgrades ----------
  function renderBuildables(){
    buildTbody.innerHTML='';
    for(const bp of BLUEPRINTS){
      const locked = bp.locked && !(profit>=150000);
      const tr = document.createElement('tr');
      tr.className = locked?'ghost':'';
      tr.innerHTML = `
        <td>${bp.name} ${bp.variable?'<span class="tag">variable</span>':''}${bp.isBattery?'<span class="tag">battery</span>':''}</td>
        <td>${bp.cap} MW</td>
        <td>${bp.startup}s</td>
        <td>$${bp.opex}</td>
        <td>${bp.co2} t/GWh</td>
        <td>${bp.buildTime}s</td>
        <td>$${fmt(bp.capex)}</td>
        <td class="right">${locked?`<span class="muted small">${bp.unlockNote}</span>`:`<button class="btn small" data-build="${bp.key}">Build</button>`}</td>
      `;
      buildTbody.appendChild(tr);
    }
    buildTbody.querySelectorAll('[data-build]').forEach(btn=>{
// UI: Event listener for 'click'
      btn.addEventListener('click', ()=>{
        const key = btn.getAttribute('data-build');
        const bp = BLUEPRINTS.find(b=>b.key===key); if(!bp) return;
        if(cash < bp.capex){ toastMsg('Not enough cash.'); return; }
        cash -= bp.capex;
        let taskName = bp.name;
        let batteryOrderForTask = null;
        if(bp.isBattery){
          batteryOrderForTask = batteryCounter++;
          taskName = `Battery ${batteryOrderForTask+1}`;
        }
        const task = {
          id:'b-'+Math.random().toString(36).slice(2,8),
          bpKey:key,
          name:taskName,
          remain:bp.buildTime,
          total:bp.buildTime,
          batteryOrder: batteryOrderForTask
        };
        buildQueue.push(task); renderQueue();
        toastMsg(`Construction started: ${taskName}.`);
      });
    });
    renderQueue();
  }
// Function: renderQueue() — purpose: [describe]. Returns: [value/void].
  function renderQueue(){
    buildQueueEl.innerHTML='';
    if(buildQueue.length===0){ buildQueueEl.innerHTML = '<div class="muted small">Nothing under construction.</div>'; return; }
    for(const q of buildQueue){
      const wrap = document.createElement('div');
      wrap.style.marginBottom='8px';
      wrap.innerHTML = `<div class="tight small"><strong>${q.name}</strong><span class="muted"> ${q.remain}s left</span></div>
                        <div class="progress"><div style="width:${(100*(q.total-q.remain)/q.total).toFixed(1)}%"></div></div>`;
      buildQueueEl.appendChild(wrap);
    }
  }

// Function: renderUpgrades() — purpose: [describe]. Returns: [value/void].
  function renderUpgrades(){
    upgradesArea.innerHTML='';
    for(const up of UPGRADES){
      const owned = !!up.owned;
      const row = document.createElement('div');
      row.className='row';
      row.innerHTML = `
        <div class="name">${up.name}<div class="muted small">${up.desc}</div></div>
        <div class="status">${owned?'<span class="good">Owned</span>':`$${fmt(up.cost)}`}</div>
        <div></div>
        <div class="right">${owned?'<span class="pill">✔</span>':`<button class="btn small" data-up="${up.id}">Buy</button>`}</div>`;
      upgradesArea.appendChild(row);
    }
    upgradesArea.querySelectorAll('[data-up]').forEach(btn=>{
// UI: Event listener for 'click'
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-up');
        const up = UPGRADES.find(u=>u.id===id); if(!up || up.owned) return;
        if(cash<up.cost){ toastMsg('Not enough cash.'); return; }
        cash -= up.cost; up.owned=true; renderUpgrades();
        toastMsg(`${up.name} purchased.`);
      });
    });
  }

  // ---------- Demand Model ----------
  function demandProfileMultiplier(c, hour){
    switch(c.profile){
      case 'evening-peaker':
        return 0.65 + 0.55*peak(hour, 18, 22) + 0.25*peak(hour,6,8);
      case 'business-hours':
        return 0.3 + 0.9*peak(hour,9,18);
      case 'flat':
        return 1.0;
      case 'factory':
        return 0.6 + 0.5*peak(hour,7,19);
      case 'town':
        return 0.55 + 0.65*peak(hour,18,23) + 0.15*peak(hour,6,8);
      default:
        return 1.0;
    }
  }

  function demandOfCustomer(c, sec){
    const h = (sec % DAY_SECONDS) / DAY_SECONDS * 24; // hour 0..24
    const shape = demandProfileMultiplier(c, h);
    const noise = rand(-0.06,0.06) * DIFFICULTY[difficulty].noise/6;
    let mw = c.baseMW * shape * c.volatility * (1+noise) * (c.connected?1:0);
    mw = clamp(mw, 0, c.baseMW*1.8);
    return mw;
  }

  function forecastDemandAt(secondsAhead){
    const sec = (secondsAhead % DAY_SECONDS + DAY_SECONDS) % DAY_SECONDS;
    const hour = (sec / DAY_SECONDS) * 24;
    let total = 0;
    for(const c of customers){
      const shape = demandProfileMultiplier(c, hour);
      const mw = c.baseMW * shape * c.volatility * (c.connected?1:0);
      total += clamp(mw, 0, c.baseMW*1.8);
    }
    return Math.round(total);
  }
// Function: peak(hour, start, end) — purpose: [describe]. Returns: [value/void].
  function peak(hour, start, end){
    if(end<start) end+=24;
    const inWindow = (hour>=start && hour<=end) || (hour+24>=start && hour+24<=end);
    if(!inWindow) return 0;
    const mid = (start+end)/2;
    const width = (end-start)/2;
    const x = Math.abs((hour-mid));
    return clamp(1 - x/width, 0, 1);
  }

  // ---------- Renewable Output ----------
  function updateRenewables(sec){
    const climate = getActiveClimate();
    const weather = WEATHER_TYPES[dailyAtmosphere?.weather] || WEATHER_TYPES.sunny;
    const solarFactor = computeSolarFactor(sec, climate, weather);
    const windSnapshot = computeWindSnapshot(sec, climate, weather);
    if(dailyAtmosphere) dailyAtmosphere.latestWindSpeed = windSnapshot.speed;
    for(const g of generators){
      if(g.variable){
        if(g.fuel==='wind'){
          if(g.on){
            const jitter = rand(-0.05,0.05);
            const factor = clamp((windSnapshot.factor || 0) + jitter, 0, 1.15);
            g.actual = Math.round(g.cap * factor);
          }else g.actual=0;
        }
        if(g.fuel==='solar'){
          if(g.on){
            const noise = rand(0.92,1.05);
            g.actual = Math.round(g.cap * solarFactor * noise);
          }else g.actual=0;
        }
      }
    }
  }

  // ---------- Thermal / Battery Output ----------
  function updateThermalAndBattery(){
    for(const g of generators){
      if(g.isBattery) continue;
      if(g.fuel!=='wind' && g.fuel!=='solar'){
        if(g.on && g.enabled && !g.fault) g.actual = g.cap; else g.actual = 0;
      }
    }
  }

// Function: batteryDispatch(balance) — purpose: [describe]. Returns: [value/void].
  function batteryDispatch(balance){
    // positive balance means surplus supply; negative means deficit
    const batts = generators.filter(g=>g.isBattery && g.on && g.enabled !== false && !g.fault);
    if(!batts.length) return 0;

    let adjust = 0;
    // reset outputs each tick before applying new action
    for(const b of batts){ b.actual = 0; }

    if(balance < -1){
      let remainingNeed = Math.abs(balance);
      const dischargeOrder = [...batts].sort((a,b)=> (b.batteryOrder??0) - (a.batteryOrder??0));
      for(const b of dischargeOrder){
        if(remainingNeed <= 0) break;
        const available = Math.min(b.cap, Math.max(0, b.energy));
        if(available <= 0) continue;
        const deliver = Math.min(remainingNeed, available);
        b.actual = deliver;
        b.energy = Math.max(0, b.energy - deliver);
        adjust += deliver;
        remainingNeed -= deliver;
      }
    } else if(balance > 1){
      let excess = balance;
      const chargeOrder = [...batts].sort((a,b)=> (a.batteryOrder??0) - (b.batteryOrder??0));
      for(const b of chargeOrder){
        if(excess <= 0) break;
        const capacityLeft = Math.min(b.cap, Math.max(0, b.energyMax - b.energy));
        if(capacityLeft <= 0) continue;
        const take = Math.min(excess, capacityLeft);
        b.actual = -take;
        b.energy = Math.min(b.energyMax, b.energy + take);
        adjust -= take;
        excess -= take;
      }
    }

    return adjust; // MW added to supply (negative means charging)
  }

  // ---------- Market Price ----------
  function computePrice(demand, supply){
    const scarcity = clamp((demand - supply)/Math.max(1,demand), -0.6, 1.2); // -60% to +120%
    const base = 70;
    const fuel = 8*(fuelMultipliers.coal-1) + 12*(fuelMultipliers.gas-1);
    const noise = rand(-6,6);
    let p = base + 90*scarcity + noise + fuel;
    p = clamp(p, 25, 380);
    return Math.round(p);
  }

  // ---------- Offers / Names ----------
  function maybeOffer(){
    const rate = 0.05 * (UPGRADES.find(u=>u.id==='marketing')?.owned?1.15:1); // base probability per 5s block
    if(t%5!==0) return;
    const chance = rate * (0.5 + rep/120);
    if(Math.random() < chance){
      const o = makeOffer();
      offers.push(o);
      toastMsg(`New contract offer: ${o.name} (${o.baseMW} MW)`);
    }
  }
// Function: makeOffer() — purpose: [describe]. Returns: [value/void].
  function makeOffer(){
    const types = [
      { klass:'office', base:[8,20], profile:'business-hours' },
      { klass:'factory', base:[15,35], profile:'factory' },
      { klass:'datacenter', base:[12,30], profile:'flat' },
      { klass:'town', base:[25,60], profile:'town' },
      { klass:'retail', base:[6,16], profile:'business-hours' },
      { klass:'residential-block', base:[12,28], profile:'evening-peaker' },
      { klass:'crypto', base:[18,35], profile:'flat' }
    ];
    const t = choice(types);
    const mw = Math.round(rand(t.base[0], t.base[1]));
    const name = genName(t.klass);
    return { id:'o-'+Math.random().toString(36).slice(2,8), name, klass:t.klass, baseMW:mw, profile:t.profile, volatility:1.0, bonus: Math.round(rand(0,10)) };
  }
// Function: genName(klass) — purpose: [describe]. Returns: [value/void].
  function genName(klass){
    const cities = ['Riverton','Northfield','Pinecrest','Silver Run','Clearwater','Stonehaven','Lakeside','Maple Heights','Brookvale','Westford'];
    const inds   = ['Alpha','Nova','Apex','Zenith','Atlas','Nimbus','Vertex','Quantum','Cobalt','Orchid'];
    switch(klass){
      case 'datacenter': return `${inds[Math.floor(Math.random()*inds.length)]} Cloud Node`;
      case 'factory': return `${inds[Math.floor(Math.random()*inds.length)]} Components Plant`;
      case 'office': return `${inds[Math.floor(Math.random()*inds.length)]} Offices`;
      case 'town': return `${cities[Math.floor(Math.random()*cities.length)]} Township`;
      case 'retail': return `${cities[Math.floor(Math.random()*cities.length)]} Plaza`;
      case 'crypto': return `${inds[Math.floor(Math.random()*inds.length)]} Mining Hub`;
      default: return `${cities[Math.floor(Math.random()*cities.length)]} Homes`;
    }
  }
// Function: renderOffers() — purpose: [describe]. Returns: [value/void].
  function renderOffers(){
    offersArea.innerHTML='';
    if(offers.length===0){ offersArea.innerHTML='<div class="muted small">No pending offers.</div>'; return; }
    for(const o of offers){
      const row = document.createElement('div');
      row.className='row';
      row.innerHTML = `
        <div class="name">${o.name} <span class="tag">${o.klass}</span><div class="muted small">Contract ${o.baseMW} MW • Profile ${o.profile}</div></div>
        <div class="status">Reputation bonus: +${o.bonus}</div>
        <div></div>
        <div class="right">
          <button class="btn small" data-accept="${o.id}">Accept</button>
          <button class="btn small" data-reject="${o.id}">Reject</button>
        </div>`;
      offersArea.appendChild(row);
    }
    offersArea.querySelectorAll('[data-accept]').forEach(btn=>{
// UI: Event listener for 'click'
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-accept');
        const o = offers.find(x=>x.id===id); if(!o) return;
        customers.push(makeCustomer(o.name,o.klass,o.baseMW,o.profile,1.0,true));
        rep = clamp(rep + o.bonus, 0, 110);
        offers = offers.filter(x=>x.id!==id);
        renderCustList(); renderOffers();
        toastMsg(`Contract accepted: ${o.name} (+${o.baseMW} MW)`);
      });
    });
    offersArea.querySelectorAll('[data-reject]').forEach(btn=>{
// UI: Event listener for 'click'
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-reject');
        const o = offers.find(x=>x.id===id); if(!o) return;
        rep = clamp(rep - 2, 0, 110);
        offers = offers.filter(x=>x.id!==id);
        renderOffers(); toastMsg(`Offer rejected: ${o.name}`);
      });
    });
  }

  // ---------- Random Events ----------
  function maybeEvent(){
    if(t%30!==0) return; // check periodically
    if(Math.random()<0.35){
      const ev = choice(['storm','trip','fuel-spike','heatwave','gas-outage']);
      switch(ev){
        case 'storm': startEvent({type:'storm', secs:rand(10,20)|0, effect:()=>{}}); break;
        case 'trip':  startEvent({type:'trip', secs:rand(6,12)|0}); break;
        case 'fuel-spike': startEvent({type:'fuel', secs:rand(15,25)|0, fuel: choice(['gas','coal'])}); break;
        case 'heatwave': startEvent({type:'heat', secs:rand(10,18)|0}); break;
        case 'gas-outage': startEvent({ type:'gas-outage' }); break;
      }
    }
  }
// Function: startEvent(e) — purpose: [describe]. Returns: [value/void].
  function startEvent(e){
    if(!e || !e.type) return;
    if(e.type==='gas-outage' && !prepareGasOutageEvent(e)) return;
    const duration = Math.max(1, Math.round(e.secs || 1));
    e.secs = duration;
    e.endAt = t + duration;
    events.push(e);
    if(e.type==='storm'){ toastMsg('Storm front: wind & solar output reduced.'); }
      if(e.type === 'trip'){
        const cand = generators.filter(g=>!g.variable  && !g.isBattery && g.on && !g.fault && g.fuel!=='coal');
      if(cand.length){
        const g = choice(cand);
        g.fault = true;
        g.on    = false;     // take it truly offline so fleet math is correct
        g.enabled = true;    // clear any startup state
        updateSwitchUI(g);
        e.genId = g.id; toastMsg(`Unit trip: ${g.name} offline.`);
      }
    }
    if(e.type==='fuel'){ fuelMultipliers[e.fuel] = 1.35; toastMsg(`${e.fuel.toUpperCase()} fuel spike: OPEX up.`); }
    if(e.type==='heat'){ toastMsg('Heat wave: residential & commercial demand up.'); }
  }
// Function: applyEventEffects(demand) — purpose: [describe]. Returns: [value/void].
// Function: cleanupEvents() — purpose: [describe]. Returns: [value/void].
  function prepareGasOutageEvent(event){
    if(events.some(ev=>ev?.type==='gas-outage')) return false;
    const gasUnits = generators.filter(g=>g.fuel==='gas');
    if(!gasUnits.length) return false;
    const rolledLevel = Number.isFinite(event?.level) ? event.level : Math.ceil(rand(1, 11));
    const level = clampOutageLevel(rolledLevel);
    const duration = computeGasOutageDuration(level);
    event.level = level;
    event.secs = duration;
    event.affectedUnits = gasUnits.map(g=>({
      id: g.id,
      wasOn: !!g.on,
      wasEnabled: !!g.enabled,
      wasFault: !!g.fault
    }));
    gasUnits.forEach(forceGasUnitOutage);
    const descriptor = describeGasOutageLevel(level);
    const eta = formatOutageDuration(duration);
    toastMsg(`${descriptor} gas supply outage (Level ${level}) — estimated ${eta} to resolve.`);
    return true;
  }

  function forceGasUnitOutage(g){
    if(!g) return;
    g.gasOutage = true;
    g.fault = true;
    g.on = false;
    g.enabled = true;
    g.actual = 0;
    g._startRemain = 0;
    if(g._startTimer){ clearInterval(g._startTimer); g._startTimer = null; }
    updateSwitchUI(g);
    updateStatus(g,'<span class="bad">Gas outage</span>');
  }

  function resolveGasOutage(event){
    if(!Array.isArray(event?.affectedUnits)) return;
    for(const state of event.affectedUnits){
      const g = generators.find(x=>x.id===state.id);
      if(!g) continue;
      g.gasOutage = false;
      g.fault = !!state.wasFault;
      g.enabled = !!state.wasEnabled;
      g.on = false;
      updateSwitchUI(g);
      if(state.wasOn && !state.wasFault){
        toggleGen(g.id);
      }else{
        updateStatus(g, state.wasFault ? '<span class="bad">FAULT</span>' : 'OFF');
      }
    }
    updateGasFleetUI?.();
  }

  function cleanupEvents(){
    events = events.filter(e=>{
      if(t>=e.endAt){
        if(e.type==='trip'){
          const g = generators.find(x=>x.id===e.genId);
          if(g){ g.fault=false; updateSwitchUI(g); toastMsg(`Unit restored: ${g.name}.`); }
        }
        if(e.type==='fuel'){ fuelMultipliers[e.fuel]=1; toastMsg('Fuel markets normalized.'); }
        if(e.type==='gas-outage'){
          resolveGasOutage(e);
          toastMsg('Gas supply restored. Turbines cleared to restart.');
        }
        return false;
      }
      return true;
    });
  }

  // ---------- Main Tick ----------
  function tick(){
    ticks++;
    t += 1;
    const endedDay = day;
    const endedSeasonIndex = seasonIndex;
    secondsInDay = (secondsInDay+1) % DAY_SECONDS;
    if(secondsInDay===0){
      const hadDailySummary = finalizeDailyPeriod(endedSeasonIndex, endedDay);
      if(hadDailySummary){
        seasonDayCount += 1;
      }
      const seasonEnded = hadDailySummary && seasonDayCount >= DAYS_PER_SEASON;
      if(seasonEnded){
        finalizeSeasonPeriod(endedSeasonIndex, seasonDayCount);
        resetPeriodTotals(seasonTotals);
        seasonDayCount = 0;
        seasonIndex = (seasonIndex + 1) % SEASONS.length;
        day = 1;
      }else{
        day = endedDay + 1;
      }
      resetPeriodTotals(dailyTotals);
      updateSeasonSkin();
      rollDailyAtmosphere();
    }

    const hourIndex = hourIndexFromSeconds(secondsInDay);
    if(hourIndex !== currentHourIndex){
      finalizeHourlyCustomerBilling();
      resetHourlyStats(hourIndex);
    }
    processCustomerDisconnectPenalties();
    // 1) Demand
    let demand = 0;
    for(const c of customers){
      const mw = demandOfCustomer(c, secondsInDay);
      const dEl = el(`#${c.id}-d`); if(dEl) dEl.textContent = fmt(mw);
      demand += mw;
    }
    demand = Math.round(demand);

    // 2) Generation
    updateRenewables(secondsInDay);
    updateThermalAndBattery();

    // Apply event effects before finalizing supply and battery response
    const generatorSnapshots = generators.map(g=>({...g}));
    const adjustedDemandPreview = applyEventAdjustments({
      demand,
      generators: generatorSnapshots,
      events
    });

    const baseReserveRatio = 0.12 + (DIFFICULTY[difficulty]?.mismatchHzFactor || 0) * 0.5;
    const reserveTarget = computeReserveRequirement({
      adjustedDemand: adjustedDemandPreview,
      generators: generatorSnapshots,
      forecastDemandFn: (offset)=> forecastDemandAt(secondsInDay + offset),
      baseReserveRatio
    });

    const balance = finalizeSupplyDemandBalance({
      demand,
      generators,
      events,
      reserveMW: reserveTarget,
      batteryDispatch: batteryDispatch
    });

    demand = balance.demand;
    let supply = balance.supply;
    const rawBalance = balance.rawBalance;
    const oversupply = balance.oversupply;
    const reserveMW = balance.reserveMW;
    const oversupplyBeyondReserve = balance.oversupplyBeyondReserve;
    const deficit = balance.deficit;

    // 3) Frequency dynamics with reserve band
    const effectiveBalance = oversupply>0 ? Math.max(0, oversupply - reserveMW) : rawBalance; // ignore reserve oversupply
    const df = effectiveBalance * DIFFICULTY[difficulty].mismatchHzFactor;
    const relax = (TARGET_HZ - freq) * 0.06;
    freq = clamp(freq + df + relax, 57.0, 63.0);

    // 4) Market & Economy
    price = computePrice(demand, supply);
    const delivered = Math.max(0, Math.min(supply, demand)); // MW served
    const tickHours = 1/3600 * speed; // 1-second ticks scaled by speed

    // OPEX and emissions
    let opex = 0, emissions = 0;
    for(const g of generators){
      if(g.isBattery){
        if(Math.abs(g.actual)>0) opex += g.opex*0.5;
      }else if(g.on && (g.enabled||g.variable) && !g.fault){
        const mult = fuelMultipliers[g.fuel]||1;
        if((g.actual||0)>0 || g.variable){
          const fuelCost = g.opex * mult;
          opex += fuelCost;
          if(g.fuel === 'gas' || g.fuel === 'coal'){
            hourlyFuelSpend = recordFuelSpend(hourlyFuelSpend, g.fuel, fuelCost);
          }
        }
        emissions += (g.co2/1000) * (Math.max(0,g.actual) * tickHours);
      }
    }
    const installedCap = generators.filter(g=>!g.isBattery).reduce((s,g)=>s+g.cap,0);
    const targetCap = Math.max(80, 1.4 * (demand||80));
    const maint = installedCap>targetCap ? (installedCap-targetCap) * 0.6 : 0;
    opex += maint;

    totalOpex += opex;
    totalEmissionsT += emissions;
    totalDeliveredMWh += delivered * tickHours;

    const revenue = 0;
    const income = -opex;
    cash += income;
    profit = totalRevenue - totalOpex;

    accumulatePeriodTotals(dailyTotals, { demand, supply, delivered, revenue, opex, income, emissions, tickHours });
    accumulatePeriodTotals(seasonTotals, { demand, supply, delivered, revenue, opex, income, emissions, tickHours });

    // 5) Reputation / uptime
    if(delivered>=demand-0.1){ uptimeTicks++; rep = clamp(rep + 0.04, 0, 110); }
    else rep = clamp(rep - 0.15, 0, 110);

    // 6) Safety / overload — immediately stop if tolerance windows are exceeded
    const batterySnapshot = computeBatterySaturation(generators);
    const batteriesFull = isBatteryFleetFull(batterySnapshot, { threshold: BATTERY_FULL_THRESHOLD });

    const imbalanceResult = mismatchTracker.step({
      demand,
      supply,
      context: {
        batteriesFull,
        oversupplyBeyondReserve,
        batteryHeadroom: batterySnapshot.headroom
      }
    });

    if(imbalanceResult.triggered){
      const band = imbalanceResult.activeLevel?.name || 'imbalance';
      const direction = imbalanceResult.activeLevel?.direction === 'undersupply' ? 'deficit' : 'oversupply';
      const pct = Math.abs(imbalanceResult.mismatchRatio || 0) * 100;
      const pctText = Number.isFinite(pct) ? `${pct.toFixed(1)}%` : 'unsafe';
      const durationLabel = imbalanceResult.activeLevel?.duration ? `${imbalanceResult.activeLevel.duration}s` : 'sustained';
      const baseReason = `sustained ${direction === 'deficit' ? 'demand shortfall' : 'oversupply'} (${band}, ${pctText} mismatch ${durationLabel})`;
      const reason = direction === 'oversupply' ? `${baseReason} — batteries full` : baseReason;
      logNotification(`Safety shutdown: ${reason}.`);
      endGame(false, `Blackout — ${reason}`);
      return;
    }

    // 7) Autopilot (AGC)
    if(UPGRADES.find(u=>u.id==='agc')?.owned){
      const g = generators.find(x=>x.fuel==='gas' && !x.fault);
      if(g){
        if((supply - demand) < -7 && !g.on) toggleGen(g.id);
        if((supply - demand) > 6 && g.on) toggleGen(g.id);
      }
    }

    // Hourly aggregates for HUD
    hourlyTotals.demand += demand;
    hourlyTotals.supply += supply;
    hourlyTotals.income += income;
    hourlyTotals.ticks += 1;
    if(hourlyTotals.ticks>0){
      hourlyAverages = {
        demand: hourlyTotals.demand / hourlyTotals.ticks,
        supply: hourlyTotals.supply / hourlyTotals.ticks,
        income: hourlyTotals.income / hourlyTotals.ticks
      };
    }

    // 8) Timers
    updateBuildQueue();
    maybeOffer();
    maybeEvent();
    cleanupEvents();

    // 9) Telemetry + UI
    recordTelemetryFrame({ demand, supply, price, freq, tickHours });
    updateUI(demand, supply, rawBalance, reserveMW);
    pushHistory(demand, supply, rawBalance, freq);
    drawHistory();
    updateClock();
  }

  function recordTelemetryFrame({ demand, supply, price, freq, tickHours }){
    if(runTelemetry.length >= MAX_TELEMETRY_FRAMES) return;
    const toNumber = (value, fallback = 0)=>{
      const num = Number(value);
      return Number.isFinite(num) ? num : fallback;
    };
    const sanitizedTickHours = toNumber(tickHours, 0);
    if(sanitizedTickHours <= 0) return;
    const frame = {
      tick: ticks,
      demand: toNumber(demand, 0),
      supply: toNumber(supply, 0),
      price: toNumber(price, 0),
      freq: toNumber(freq, TARGET_HZ),
      tickHours: Number(sanitizedTickHours.toFixed(6)),
      fuelMultipliers: {
        coal: toNumber(fuelMultipliers.coal, 1),
        gas: toNumber(fuelMultipliers.gas, 1)
      },
      generators: generators.map(g=>({
        id: g.id,
        fuel: g.fuel,
        cap: toNumber(g.cap, 0),
        actual: toNumber(g.actual, 0),
        on: !!g.on,
        enabled: !!g.enabled,
        variable: !!g.variable,
        fault: !!g.fault,
        isBattery: !!g.isBattery,
        opex: toNumber(g.opex, 0),
        co2: toNumber(g.co2, 0)
      }))
    };
    runTelemetry.push(frame);
  }

  function normalizeDaySeconds(sec){
    return ((sec % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS;
  }

  function hourIndexFromSeconds(sec){
    return Math.floor((normalizeDaySeconds(sec) / DAY_SECONDS) * 24);
  }

  function resetHourlyStats(hourIndex=0){
    currentHourIndex = Number.isFinite(hourIndex) ? hourIndex : 0;
    hourlyTotals = { demand:0, supply:0, income:0, ticks:0 };
    hourlyAverages = { demand:0, supply:0, income:0 };
  }

  function finalizeHourlyCustomerBilling(){
    const billing = computeCustomerPayment({
      tracker: hourlyFuelSpend,
      customers,
      activeCustomers: 0,
      hourIndex: currentHourIndex,
      markup: CUSTOMER_MARKUP_RATE
    });
    const basePayment = billing?.amount || 0;
    if(basePayment > 0){
      const repMultiplier = computeReputationIncomeMultiplier(rep);
      const payment = basePayment * repMultiplier;
      cash += payment;
      totalRevenue += payment;
      profit = totalRevenue - totalOpex;
      const summary = { demand:0, supply:0, delivered:0, revenue:payment, opex:0, income:payment, emissions:0, tickHours:0 };
      accumulatePeriodTotals(dailyTotals, summary);
      accumulatePeriodTotals(seasonTotals, summary);
      const markupPct = Math.round(Math.max(0, (billing?.markup ?? CUSTOMER_MARKUP_RATE)) * 100);
      logNotification(`Customer payments received: ${formatMoney(payment)} (markup ${markupPct}% • rep ×${repMultiplier.toFixed(2)}).`);
    }
    hourlyFuelSpend = resetFuelSpendTracker(hourlyFuelSpend);
  }

  function formatHourlyIncome(value){
    const rounded = Math.round(Number.isFinite(value) ? value : 0);
    const prefix = rounded < 0 ? '−' : '+';
    const absVal = Math.abs(rounded);
    return `${prefix}$${fmt(absVal)}`;
  }

  // ---------- Atmosphere & Weather ----------
  function rollDailyAtmosphere({ announce=true } = {}){
    const state = createDailyAtmosphereState();
    dailyAtmosphere = state;
    if(announce) announceDailyAtmosphere(state);
    renderAtmosphereHud();
    return state;
  }

  function announceDailyAtmosphere(state = dailyAtmosphere){
    if(!state) return;
    const weatherLabel = WEATHER_TYPES[state.weather]?.label || 'Forecast';
    const daylightHours = Number.isFinite(state.daylightHours) ? state.daylightHours.toFixed(1) : '0.0';
    const sunriseLabel = formatHourLabel(state.sunrise);
    const sunsetLabel = formatHourLabel(state.sunset);
    const windLabel = `${Math.round(state.windLow)}–${Math.round(state.windHigh)} mph`;
    logNotification(`Forecast: ${weatherLabel} • ${daylightHours}h sun (${sunriseLabel}–${sunsetLabel}) • Winds ${windLabel}`);
  }

  function createDailyAtmosphereState(){
    const seasonName = SEASONS[seasonIndex] || SEASONS[0];
    const climate = getActiveClimate();
    const weights = WEATHER_WEIGHTS[seasonName] || WEATHER_WEIGHTS.Spring || [];
    const picked = weightedChoice(weights) || 'sunny';
    const weather = WEATHER_TYPES[picked] ? picked : 'sunny';
    const sunrise = Number.isFinite(climate?.sunrise) ? climate.sunrise : 6.5;
    const sunset = Number.isFinite(climate?.sunset) ? climate.sunset : 19.5;
    const daylightHours = Math.max(0, sunset - sunrise);
    const upcomingDayIndex = Math.min(DAYS_PER_SEASON, Math.max(1, (seasonDayCount % DAYS_PER_SEASON) + 1));
    const lateSeasonBoost = upcomingDayIndex > (DAYS_PER_SEASON/2) ? (climate?.lateSeasonWindBoost || 1) : 1;
    const range = Array.isArray(climate?.windRange) ? climate.windRange : [6,18];
    const baseMin = rand(range[0], range[0]+3);
    const baseMax = rand(Math.max(range[0]+3, range[1]-3), range[1]);
    const weatherBonus = WEATHER_TYPES[weather]?.windSpeedBonus || 0;
    const windLow = Math.max(1, (baseMin * lateSeasonBoost) + weatherBonus);
    const windHigh = Math.max(windLow + 1, (baseMax * lateSeasonBoost) + weatherBonus);
    const swing = windHigh - windLow;
    let windDescriptor = 'steady';
    if(lateSeasonBoost > 1.05) windDescriptor = 'late-season gusts';
    else if(swing > 8) windDescriptor = 'gusty';
    else if(swing > 5) windDescriptor = 'breezy';
    return {
      season: seasonName,
      weather,
      sunrise,
      sunset,
      daylightHours,
      windLow,
      windHigh,
      windPhase: rand(0, Math.PI*2),
      windDescriptor,
      lateSeasonBoosted: lateSeasonBoost > 1.02
    };
  }

  function getActiveClimate(){
    const seasonName = SEASONS[seasonIndex] || SEASONS[0];
    return SEASONAL_CLIMATE[seasonName] || SEASONAL_CLIMATE[SEASONS[0]];
  }

  function computeSolarFactor(sec, climate, weatherCfg){
    const climateData = climate || getActiveClimate();
    const weatherData = weatherCfg || WEATHER_TYPES.sunny;
    const hour = (normalizeDaySeconds(sec) / DAY_SECONDS) * 24;
    const sunrise = Number.isFinite(dailyAtmosphere?.sunrise) ? dailyAtmosphere.sunrise : climateData.sunrise;
    const sunset = Number.isFinite(dailyAtmosphere?.sunset) ? dailyAtmosphere.sunset : climateData.sunset;
    if(!Number.isFinite(sunrise) || !Number.isFinite(sunset) || hour < sunrise || hour > sunset) return 0;
    const daylight = Math.max(0.25, sunset - sunrise);
    const progress = clamp((hour - sunrise) / daylight, 0, 1);
    const solarArc = Math.sin(Math.PI * progress);
    const seasonMultiplier = climateData?.solarPeak ?? 1;
    const weatherMultiplier = weatherData?.solarMultiplier ?? 1;
    return clamp(solarArc * seasonMultiplier * weatherMultiplier, 0, 1.2);
  }

  function computeWindSnapshot(sec, climate, weatherCfg){
    const climateData = climate || getActiveClimate();
    const weatherData = weatherCfg || WEATHER_TYPES.sunny;
    const windSpeed = getWindSpeedForTime(sec, climateData);
    const ref = climateData?.windRefSpeed || 25;
    const baseFactor = ref>0 ? windSpeed / ref : 0;
    const seasonMultiplier = dailyAtmosphere?.lateSeasonBoosted ? 1.05 : 1;
    const weatherMultiplier = weatherData?.windMultiplier ?? 1;
    const factor = clamp(baseFactor * seasonMultiplier * weatherMultiplier, 0, 1.25);
    return { speed: windSpeed, factor };
  }

  function getWindSpeedForTime(sec, climateData){
    const normalized = normalizeDaySeconds(sec) / DAY_SECONDS;
    const wave = Math.sin((normalized * Math.PI * 2) + (dailyAtmosphere?.windPhase || 0)) * 0.4 + 0.5;
    const minSpeed = Number.isFinite(dailyAtmosphere?.windLow) ? dailyAtmosphere.windLow : (climateData?.windRange?.[0] || 6);
    const maxSpeed = Number.isFinite(dailyAtmosphere?.windHigh) ? dailyAtmosphere.windHigh : (climateData?.windRange?.[1] || 18);
    const base = minSpeed + (maxSpeed - minSpeed) * clamp(wave, 0, 1);
    const gust = rand(-1.5, 1.5);
    return Math.max(0, base + gust);
  }

  function formatHourLabel(hourValue){
    if(!Number.isFinite(hourValue)) return '--:--';
    const normalized = ((hourValue % 24) + 24) % 24;
    let hh = Math.floor(normalized);
    let mm = Math.round((normalized - hh) * 60);
    if(mm === 60){
      hh = (hh + 1) % 24;
      mm = 0;
    }
    return `${padClock(hh)}:${padClock(mm)}`;
  }

  function renderAtmosphereHud(){
    if(!sunlightInfoEl && !windInfoEl) return;
    if(!dailyAtmosphere){
      if(sunlightInfoEl) sunlightInfoEl.textContent = '—';
      if(windInfoEl) windInfoEl.textContent = '—';
      return;
    }
    const weatherLabel = WEATHER_TYPES[dailyAtmosphere.weather]?.label || '—';
    const daylightLabel = Number.isFinite(dailyAtmosphere.daylightHours)
      ? dailyAtmosphere.daylightHours.toFixed(1)
      : '0.0';
    const sunriseLabel = formatHourLabel(dailyAtmosphere.sunrise);
    const sunsetLabel = formatHourLabel(dailyAtmosphere.sunset);
    if(sunlightInfoEl){
      sunlightInfoEl.textContent = `${daylightLabel}h (${sunriseLabel}–${sunsetLabel}, ${weatherLabel})`;
    }
    if(windInfoEl){
      const windRange = `${Math.round(dailyAtmosphere.windLow)}–${Math.round(dailyAtmosphere.windHigh)} mph`;
      const descriptor = dailyAtmosphere.windDescriptor ? dailyAtmosphere.windDescriptor.trim() : '';
      windInfoEl.textContent = descriptor ? `${windRange} • ${descriptor}` : windRange;
    }
  }

  function createPeriodTotals(){
    return {
      demandMWh: 0,
      supplyMWh: 0,
      deliveredMWh: 0,
      revenue: 0,
      opex: 0,
      income: 0,
      emissions: 0,
      tickHours: 0,
      tickCount: 0,
      maxDemand: 0,
      maxSupply: 0
    };
  }

  function resetPeriodTotals(target){
    if(!target) return;
    Object.assign(target, createPeriodTotals());
  }

  function accumulatePeriodTotals(target, { demand=0, supply=0, delivered=0, revenue=0, opex=0, income=0, emissions=0, tickHours=0 }){
    if(!target) return;
    const safeHours = Number.isFinite(tickHours) ? tickHours : 0;
    const safeDemand = Number.isFinite(demand) ? demand : 0;
    const safeSupply = Number.isFinite(supply) ? supply : 0;
    const safeDelivered = Number.isFinite(delivered) ? delivered : 0;
    target.demandMWh += Math.max(0, safeDemand) * safeHours;
    target.supplyMWh += Math.max(0, safeSupply) * safeHours;
    target.deliveredMWh += Math.max(0, safeDelivered) * safeHours;
    target.revenue += Number.isFinite(revenue) ? revenue : 0;
    target.opex += Number.isFinite(opex) ? opex : 0;
    target.income += Number.isFinite(income) ? income : 0;
    target.emissions += Number.isFinite(emissions) ? emissions : 0;
    target.tickHours += safeHours;
    target.tickCount += 1;
    target.maxDemand = Math.max(target.maxDemand, safeDemand);
    target.maxSupply = Math.max(target.maxSupply, safeSupply);
  }

  function formatMoney(value, { signed=false } = {}){
    const number = Number.isFinite(value) ? value : 0;
    const rounded = Math.round(number);
    const absStr = fmt(Math.abs(rounded));
    if(signed){
      const sign = rounded < 0 ? '−' : '+';
      return `${sign}$${absStr}`;
    }
    if(rounded < 0){
      return `−$${absStr}`;
    }
    return `$${absStr}`;
  }

  function formatPercent(value){
    const num = Number.isFinite(value) ? value : 0;
    return `${num.toFixed(1)}%`;
  }

  function formatEnergy(value){
    const num = Number.isFinite(value) ? value : 0;
    return `${num.toFixed(1)} MWh`;
  }

  function applySeasonSkin(target, seasonName){
    if(!target) return;
    const normalized = (seasonName || '').toLowerCase();
    target.classList.add('season-themed');
    for(const cls of Object.values(SEASON_CLASS_MAP)){
      target.classList.remove(cls);
    }
    const mapped = SEASON_CLASS_MAP[normalized];
    if(mapped) target.classList.add(mapped);
  }

  function updateSeasonSkin(){
    const activeSeason = SEASONS[seasonIndex] || SEASONS[0];
    if(activeSeason === lastSeasonSkin) return;
    lastSeasonSkin = activeSeason;
    applySeasonSkin(seasonHudEl, activeSeason);
  }

  function buildDailySummary(seasonIdx, dayNumber){
    if(!dailyTotals || dailyTotals.tickCount<=0) return null;
    const seasonName = SEASONS[seasonIdx] || SEASONS[0];
    const hours = Number.isFinite(dailyTotals.tickHours) ? dailyTotals.tickHours : 0;
    const demandMWh = Number.isFinite(dailyTotals.demandMWh) ? dailyTotals.demandMWh : 0;
    const supplyMWh = Number.isFinite(dailyTotals.supplyMWh) ? dailyTotals.supplyMWh : 0;
    const deliveredMWh = Number.isFinite(dailyTotals.deliveredMWh) ? dailyTotals.deliveredMWh : 0;
    const unservedMWh = Math.max(0, demandMWh - deliveredMWh);
    const avgDemand = hours>0 ? demandMWh / hours : 0;
    const avgSupply = hours>0 ? supplyMWh / hours : 0;
    const servedPct = demandMWh>0 ? (deliveredMWh / demandMWh) * 100 : 100;
    const cycle = Math.floor(totalSeasonsCompleted / SEASONS.length) + 1;
    return {
      type: 'daily',
      seasonIndex: seasonIdx,
      seasonName,
      dayNumber,
      cycle,
      hours,
      avgDemand,
      avgSupply,
      demandMWh,
      supplyMWh,
      deliveredMWh,
      unservedMWh,
      servedPct,
      revenue: dailyTotals.revenue,
      opex: dailyTotals.opex,
      income: dailyTotals.income,
      emissions: dailyTotals.emissions,
      peakDemand: dailyTotals.maxDemand,
      peakSupply: dailyTotals.maxSupply
    };
  }

  function buildSeasonSummary(seasonIdx, daysCompleted){
    if(!seasonTotals || seasonTotals.tickCount<=0 || !daysCompleted) return null;
    const seasonName = SEASONS[seasonIdx] || SEASONS[0];
    const hours = Number.isFinite(seasonTotals.tickHours) ? seasonTotals.tickHours : 0;
    const demandMWh = Number.isFinite(seasonTotals.demandMWh) ? seasonTotals.demandMWh : 0;
    const supplyMWh = Number.isFinite(seasonTotals.supplyMWh) ? seasonTotals.supplyMWh : 0;
    const deliveredMWh = Number.isFinite(seasonTotals.deliveredMWh) ? seasonTotals.deliveredMWh : 0;
    const unservedMWh = Math.max(0, demandMWh - deliveredMWh);
    const avgDemand = hours>0 ? demandMWh / hours : 0;
    const avgSupply = hours>0 ? supplyMWh / hours : 0;
    const servedPct = demandMWh>0 ? (deliveredMWh / demandMWh) * 100 : 100;
    const avgDailyIncome = daysCompleted>0 ? seasonTotals.income / daysCompleted : seasonTotals.income;
    const cycle = Math.floor(totalSeasonsCompleted / SEASONS.length) + 1;
    const seasonOrder = totalSeasonsCompleted + 1;
    return {
      type: 'season',
      seasonIndex: seasonIdx,
      seasonName,
      daysCompleted,
      cycle,
      seasonOrder,
      hours,
      avgDemand,
      avgSupply,
      demandMWh,
      supplyMWh,
      deliveredMWh,
      unservedMWh,
      servedPct,
      revenue: seasonTotals.revenue,
      opex: seasonTotals.opex,
      income: seasonTotals.income,
      avgDailyIncome,
      emissions: seasonTotals.emissions,
      peakDemand: seasonTotals.maxDemand,
      peakSupply: seasonTotals.maxSupply
    };
  }

  function renderMetrics(target, metrics){
    if(!target) return;
    target.innerHTML = metrics.map(metric=>{
      const note = metric.note ? `<span class="note">${metric.note}</span>` : '';
      return `<div class="period-metric"><span class="label">${metric.label}</span><span class="value">${metric.value}</span>${note}</div>`;
    }).join('');
  }

  function renderDailyReport(summary){
    if(!summary) return;
    applySeasonSkin(dailyReportPanel, summary.seasonName);
    if(dailyReportTitleEl) dailyReportTitleEl.textContent = 'Daily Report';
    if(dailyReportSubtitleEl) dailyReportSubtitleEl.textContent = `${summary.seasonName} — Day ${summary.dayNumber}`;
    if(dailyReportLeadEl){
      const details = [
        `${formatEnergy(summary.deliveredMWh)} delivered of ${formatEnergy(summary.demandMWh)} demand`,
        `${formatPercent(summary.servedPct)} served`
      ];
      if(Number.isFinite(summary.peakDemand) && summary.peakDemand>0){
        details.push(`Peak ${fmt(Math.round(summary.peakDemand))} MW`);
      }
      dailyReportLeadEl.textContent = details.join(' • ');
    }
    const emissionsValue = Number.isFinite(summary.emissions) ? summary.emissions : 0;
    renderMetrics(dailyReportMetricsEl, [
      { label:'Avg Demand', value:`${fmt(Math.round(summary.avgDemand))} MW` },
      { label:'Avg Supply', value:`${fmt(Math.round(summary.avgSupply))} MW` },
      { label:'Energy Delivered', value:formatEnergy(summary.deliveredMWh), note:`${formatPercent(summary.servedPct)} served` },
      { label:'Unserved Energy', value:formatEnergy(summary.unservedMWh) },
      { label:'Revenue', value:formatMoney(summary.revenue) },
      { label:'OPEX', value:formatMoney(summary.opex) },
      { label:'Net Income', value:formatMoney(summary.income, { signed:true }) },
      { label:'Emissions', value:`${emissionsValue.toFixed(1)} t` }
    ]);
  }

  function renderSeasonReport(summary){
    if(!summary) return;
    applySeasonSkin(seasonReportPanel, summary.seasonName);
    if(seasonReportTitleEl) seasonReportTitleEl.textContent = 'Season Summary';
    if(seasonReportSubtitleEl){
      seasonReportSubtitleEl.textContent = `${summary.seasonName} • Year ${summary.cycle} (${summary.daysCompleted} days)`;
    }
    if(seasonReportLeadEl){
      const details = [
        `${formatEnergy(summary.deliveredMWh)} delivered of ${formatEnergy(summary.demandMWh)} demand`,
        `${formatPercent(summary.servedPct)} served`
      ];
      if(Number.isFinite(summary.peakDemand) && summary.peakDemand>0){
        details.push(`Peak ${fmt(Math.round(summary.peakDemand))} MW`);
      }
      seasonReportLeadEl.textContent = details.join(' • ');
    }
    const emissionsValue = Number.isFinite(summary.emissions) ? summary.emissions : 0;
    renderMetrics(seasonReportMetricsEl, [
      { label:'Avg Demand', value:`${fmt(Math.round(summary.avgDemand))} MW` },
      { label:'Avg Supply', value:`${fmt(Math.round(summary.avgSupply))} MW` },
      { label:'Energy Delivered', value:formatEnergy(summary.deliveredMWh), note:`${formatPercent(summary.servedPct)} served` },
      { label:'Unserved Energy', value:formatEnergy(summary.unservedMWh) },
      { label:'Revenue', value:formatMoney(summary.revenue) },
      { label:'OPEX', value:formatMoney(summary.opex) },
      { label:'Net Income', value:formatMoney(summary.income, { signed:true }) },
      { label:'Avg Daily Income', value:formatMoney(summary.avgDailyIncome, { signed:true }) },
      { label:'Emissions', value:`${emissionsValue.toFixed(1)} t` }
    ]);
  }

  function buildPeriodLogItem(entry, type){
    if(type==='daily'){
      const heading = `${entry.seasonName} Day ${entry.dayNumber}`;
      const details = [
        `${formatPercent(entry.servedPct)} served`,
        `Income ${formatMoney(entry.income, { signed:true })}`,
        `Revenue ${formatMoney(entry.revenue)}`,
        `OPEX ${formatMoney(entry.opex)}`,
        `Energy ${formatEnergy(entry.deliveredMWh)}`
      ];
      return `<li class="period-log-item"><div class="period-log-title">${heading}</div><div class="period-log-body">${details.join(' • ')}</div></li>`;
    }
    const heading = `${entry.seasonName} • Year ${entry.cycle}`;
    const details = [
      `${entry.daysCompleted} days`,
      `${formatPercent(entry.servedPct)} served`,
      `Income ${formatMoney(entry.income, { signed:true })}`,
      `Avg day ${formatMoney(entry.avgDailyIncome, { signed:true })}`,
      `Energy ${formatEnergy(entry.deliveredMWh)}`
    ];
    return `<li class="period-log-item"><div class="period-log-title">${heading}</div><div class="period-log-body">${details.join(' • ')}</div></li>`;
  }

  function renderPeriodLog(entries, targetEl, emptyEl, type){
    if(!targetEl) return;
    if(!Array.isArray(entries) || entries.length===0){
      targetEl.innerHTML = '';
      if(emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if(emptyEl) emptyEl.style.display = 'none';
    const items = [...entries].reverse().map(entry=> buildPeriodLogItem(entry, type)).join('');
    targetEl.innerHTML = items;
  }

  function renderDailyLog(){
    renderPeriodLog(dailyLogEntries, dailyReportLogEl, dailyReportEmptyEl, 'daily');
  }

  function renderSeasonLog(){
    renderPeriodLog(seasonLogEntries, seasonReportLogEl, seasonReportEmptyEl, 'season');
  }

  function finalizeDailyPeriod(seasonIdx, dayNumber){
    const summary = buildDailySummary(seasonIdx, dayNumber);
    if(!summary) return false;
    dailyLogEntries.push(summary);
    renderDailyLog();
    renderDailyReport(summary);
    openModal('#dailyReportModal');
    return true;
  }

  function finalizeSeasonPeriod(seasonIdx, daysCompleted){
    const summary = buildSeasonSummary(seasonIdx, daysCompleted);
    if(!summary) return false;
    seasonLogEntries.push(summary);
    renderSeasonLog();
    renderSeasonReport(summary);
    openModal('#seasonReportModal');
    totalSeasonsCompleted += 1;
    return true;
  }

  function showLatestDailyReport(){
    if(!dailyLogEntries.length){
      toastMsg('No daily reports yet.');
      return;
    }
    const latest = dailyLogEntries[dailyLogEntries.length-1];
    renderDailyReport(latest);
    renderDailyLog();
    openModal('#dailyReportModal');
  }

  function showLatestSeasonReport(){
    if(!seasonLogEntries.length){
      toastMsg('No seasonal reports yet.');
      return;
    }
    const latest = seasonLogEntries[seasonLogEntries.length-1];
    renderSeasonReport(latest);
    renderSeasonLog();
    openModal('#seasonReportModal');
  }

// Function: updateBuildQueue() — purpose: [describe]. Returns: [value/void].
  function updateBuildQueue(){
    for(const q of buildQueue){ q.remain = Math.max(0, q.remain-1); }
    const done = buildQueue.filter(q=>q.remain<=0);
    if(done.length){
      for(const q of done){
        const bp = BLUEPRINTS.find(b=>b.key===q.bpKey);
        if(bp.isBattery){
          let order = Number.isFinite(q.batteryOrder) ? q.batteryOrder : batteryCounter++;
          if(!Number.isFinite(q.batteryOrder)){
            q.batteryOrder = order;
            q.name = `Battery ${order+1}`;
          }
          const label = q.name || `Battery ${order+1}`;
          const b = makeBattery({
            id: 'bat-'+Math.random().toString(36).slice(2,7),
            name: label,
            power: bp.cap,
            energyMax: bp.energyMax,
            roundTrip: bp.roundTrip,
            order,
            initialEnergy: 0
          });
          generators.push(b);
        }else{
          const id = bp.key+'-'+Math.random().toString(36).slice(2,7);
          const g = makeGen(id, bp.name, bp.fuel, bp.cap, bp.startup, bp.opex, bp.co2, !!bp.variable, (bp.fuel==='wind'||bp.fuel==='solar'));
          generators.push(g);
        }
        toastMsg(`${q.name} commissioned.`);
      }
      buildQueue = buildQueue.filter(q=>q.remain>0);
      renderQueue(); renderGenList();
    }else if(t%1===0){ renderQueue(); }
  }

  // ---------- UI ----------
  function updateUI(demand, supply, balance, reserveMW=0){
    demandEl.textContent = fmt(demand);
    supplyEl.textContent = fmt(supply);
    const reserveText = (balance>0 && balance<=reserveMW) ? ' (reserve)' : '';
    balanceEl.textContent = (balance>0?'+':'') + fmt(balance) + reserveText;
    freqEl.textContent = freq.toFixed(2);
    priceEl.textContent = fmt(price);
    cashEl.textContent = fmt(cash);
    repEl.textContent = Math.round(rep);
    uptimeEl.textContent = ticks? Math.round(100*uptimeTicks/ticks):0;

    dLbl.textContent = fmt(demand)+' MW';
    sLbl.textContent = fmt(supply)+' MW';
    dBar.style.width = Math.min(100, demand/1.6) + '%';
    sBar.style.width = Math.min(100, supply/1.6) + '%';

    // update asset outputs and battery state
    for(const g of generators){
      const out = el(`#${g.id}-out`);
      if(out){
        if(g.isBattery){
          out.textContent = (g.actual>0? '+' : (g.actual<0? '' : '')) + fmt(g.actual);
          const detail = el(`#${g.id}-detail`);
          if(detail){
            const pct = g.energyMax>0 ? Math.round((g.energy/g.energyMax)*100) : 0;
            detail.textContent = `Power ${g.cap} MW • Charge ${fmt(Math.round(g.energy))}/${fmt(g.energyMax)} MW (${pct}%)`;
          }
        }else{
          out.textContent = fmt(Math.max(0,g.actual||0));
        }
      }
    }

    // needle uses raw balance
    const ang = clamp((balance/50)*70, -80, 80);
    needle.style.transform = `rotate(${ang}deg)`;

    // buttons
    setButtons();
    updateGasFleetUI?.();
    renderBatteryStatus();
  }
// Function: updateGasFleetUI() — purpose: [describe]. Returns: [value/void].
function updateGasFleetUI(){
  const gasUnits = generators.filter(g=>g.fuel==='gas');
  if(!gasUnits.length) return;
  const online = gasUnits.filter(g=>g.on && g.enabled && !g.fault).length;
  const totalOut = gasUnits.reduce((s,g)=> s + Math.max(0,g.actual||0), 0);
  const onEl = el('#gas-online'); if(onEl) onEl.textContent = online;
  const outEl = el('#gas-out');   if(outEl) outEl.textContent = fmt(totalOut);
  const outageEl = el('#gas-outage-status');
  const outageActive = gasUnits.some(g=>g.gasOutage);
  if(outageEl){
    outageEl.style.display = outageActive ? '' : 'none';
    outageEl.classList.toggle('bad', outageActive);
    if(outageActive){
      outageEl.textContent = 'Gas supply outage';
    }
  }
}
// Function: updateClock() — purpose: [describe]. Returns: [value/void].
  function updateClock(){
    const normalized = normalizeDaySeconds(secondsInDay);
    const hourFloat = (normalized / DAY_SECONDS) * 24;
    const hh = Math.floor(hourFloat);
    const mm = Math.floor((hourFloat - hh)*60);

    if(timeEl) timeEl.textContent = `${padClock(hh)}:${padClock(mm)}`;
    if(dayEl) dayEl.textContent = `Day ${day}`;
    if(seasonEl) seasonEl.textContent = SEASONS[seasonIndex] || SEASONS[0];

    const avgDemand = Number.isFinite(hourlyAverages.demand) ? hourlyAverages.demand : 0;
    const avgSupply = Number.isFinite(hourlyAverages.supply) ? hourlyAverages.supply : 0;
    if(demandAvgEl) demandAvgEl.textContent = fmt(avgDemand);
    if(supplyAvgEl) supplyAvgEl.textContent = fmt(avgSupply);
    if(incomeAvgEl) incomeAvgEl.textContent = formatHourlyIncome(hourlyAverages.income);

    if(timerEl) timerEl.textContent = 'Sandbox';
    renderAtmosphereHud();
  }

  function formatLogClock(){
    const normalized = normalizeDaySeconds(secondsInDay);
    const hourFloat = (normalized / DAY_SECONDS) * 24;
    const hh = Math.floor(hourFloat);
    const mm = Math.floor((hourFloat - hh) * 60);
    return `${padClock(hh)}:${padClock(mm)}`;
  }

  function logNotification(message){
    if(!message) return;
    const entry = {
      season: SEASONS[seasonIndex] || SEASONS[0],
      day: day || 1,
      gameTime: formatLogClock(),
      message
    };
    notificationLog.push(entry);
    renderNotificationLog();
  }

  function renderNotificationLog(){
    if(!notificationLogEl) return;
    if(!notificationLog.length){
      notificationLogEl.innerHTML = '<li class="notification-log__empty">Notifications will appear here.</li>';
      if(notificationLogWrapperEl) notificationLogWrapperEl.scrollTop = 0;
      return;
    }

    const items = notificationLog.map(entry => {
      const meta = `${entry.season} • Day ${entry.day} • ${entry.gameTime}`;
      return `<li class="notification-log__item"><span class="notification-log__meta">${escapeHtml(meta)}</span><span class="notification-log__message">${escapeHtml(entry.message)}</span></li>`;
    }).join('');

    notificationLogEl.innerHTML = items;

    if(notificationLogWrapperEl){
      requestAnimationFrame(()=>{
        notificationLogWrapperEl.scrollTop = notificationLogWrapperEl.scrollHeight;
      });
    }
  }

// Function: pushHistory(demand, supply, balance, freq) — purpose: [describe]. Returns: [value/void].
  function pushHistory(demand, supply, balance, freq){
    history.push({demand,supply,balance,freq});
    while(history.length>HISTORY_LEN) history.shift();
  }
// Function: drawHistory() — purpose: [describe]. Returns: [value/void].
  function drawHistory(){
    const W = historyCanvas.width, H = historyCanvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.save(); ctx.translate(0,0);
    // grid
    ctx.globalAlpha = 0.15; ctx.strokeStyle = '#7aa1ff'; ctx.lineWidth=1;
    ctx.beginPath();
    for(let i=0;i<=6;i++){ const y=i*H/6; ctx.moveTo(0,y); ctx.lineTo(W,y); }
    ctx.stroke(); ctx.globalAlpha=1;

    // scale
    const maxDemand = Math.max(100, ...history.map(h=>h.demand));
    const maxSupply = Math.max(100, ...history.map(h=>h.supply));
    const maxVal = Math.max(maxDemand, maxSupply, 150);

// Function: pathFor(key) — purpose: [describe]. Returns: [value/void].
    function pathFor(key){
      ctx.beginPath();
      history.forEach((h,i)=>{
        const x = i/(HISTORY_LEN-1)*W;
        const y = H - (h[key]/maxVal)*H;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
    }
    // Demand (line)
    ctx.strokeStyle = '#6ee7ff'; pathFor('demand'); ctx.stroke();
    // Supply (line)
    ctx.strokeStyle = '#7afabf'; pathFor('supply'); ctx.stroke();

    // Frequency dots
    ctx.fillStyle='#ffd166';
    history.forEach((h,i)=>{
      const x = i/(HISTORY_LEN-1)*W;
      const y = H - ((h.freq-57)/(63-57))*H;
      ctx.fillRect(x-1, y-1, 2, 2);
    });
    ctx.restore();
  }

  // ---------- Game Over / Leaderboard ----------
  function endGame(victory, reason){
    running=false; clearInterval(timer); timer=null; setButtons();
    const score = Math.round( profit + (uptimeTicks/ticks)*25000 - totalEmissionsT*500 );
    const rows = [
      ['Result', victory?'Stable run':'Blackout'],
      ['Reason', reason],
      ['Profit', '$'+fmt(profit)],
      ['Uptime', (ticks?Math.round(100*uptimeTicks/ticks):0)+'%'],
      ['Energy Delivered', fmt(totalDeliveredMWh.toFixed?Number(totalDeliveredMWh.toFixed(0)):totalDeliveredMWh)+' MWh'],
      ['Emissions', fmt(totalEmissionsT.toFixed?Number(totalEmissionsT.toFixed(0)):totalEmissionsT)+' t'],
      ['Final Cash', '$'+fmt(cash)],
      ['Reputation', Math.round(rep)],
      ['Score', fmt(score)]
    ];
    const st = el('#scoreTable'); st.innerHTML='';
    rows.forEach(r=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<th>${r[0]}</th><td>${r[1]}</td>`;
      st.appendChild(tr);
    });
    prepareLeaderboardSave();
    renderLeaderboard();
    loadLeaderboard();
    el('#goTitle').textContent = victory?'You made it!':'Game Over';
    el('#goMsg').textContent = reason;
    openModal('#modalGameOver');
  }
// Function: renderLeaderboard() - purpose: [describe]. Returns: [value/void].
  function renderLeaderboard(){
    const lt = el('#leaderTable'); if(!lt) return;
    lt.innerHTML='';
    const head = document.createElement('tr');
    head.innerHTML='<th>Rank</th><th>Name</th><th>Score</th><th>Profit</th><th>Uptime</th><th>Emissions</th>';
    lt.appendChild(head);
    if(!leaderboardEntries.length){
      const empty=document.createElement('tr');
      empty.innerHTML = '<td colspan="6" class="muted">No saved runs yet.</td>';
      lt.appendChild(empty);
      return;
    }
    leaderboardEntries.forEach((r,i)=>{
      const tr=document.createElement('tr');
      const name = r && typeof r.name==='string' ? r.name : 'Unknown';
      const uptime = Number.isFinite(r?.uptime) ? Math.round(r.uptime) : 0;
      tr.innerHTML = `<td>${i+1}</td><td>${name}</td><td>${fmt(r?.score||0)}</td><td>$${fmt(r?.profit||0)}</td><td>${uptime}%</td><td>${fmt(Math.round(r?.emissions||0))} t</td>`;
      lt.appendChild(tr);
    });
  }

  async function loadLeaderboard(){
    try{
      const res = await fetch('/games/power-grid-tycoon/leaderboard/data?limit=10');
      if(!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      leaderboardEntries = Array.isArray(data?.entries)?data.entries:[];
      renderLeaderboard();
    }catch(err){
      console.error('Failed to load leaderboard', err);
    }
  }

  function setLeaderboardStatus(text='', tone){
    if(!leaderSaveStatus) return;
    leaderSaveStatus.textContent = text;
    leaderSaveStatus.classList.remove('bad','good');
    if(tone==='error') leaderSaveStatus.classList.add('bad');
    if(tone==='success') leaderSaveStatus.classList.add('good');
  }

  function prepareLeaderboardSave(){
    latestResult = buildRunExport();
    leaderboardSaving = false;
    const hasResult = !!latestResult;
    setLeaderboardStatus(hasResult ? 'Enter a name to save your score.' : 'Finish a run to save your score.');
    if(!leaderNameInput || !leaderSaveBtn) return;
    leaderNameInput.value = '';
    leaderSaveBtn.textContent = 'Save Score';
    if(hasResult){
      leaderNameInput.disabled = false;
      leaderSaveBtn.disabled = false;
    }else{
      leaderNameInput.disabled = true;
      leaderSaveBtn.disabled = true;
    }
  }

  function buildRunExport(){
    if(!runTelemetry.length) return null;
    return {
      version: TELEMETRY_VERSION,
      difficulty,
      frames: runTelemetry.map(frame=>({
        ...frame,
        fuelMultipliers: { ...frame.fuelMultipliers },
        generators: frame.generators.map(g=>({ ...g }))
      }))
    };
  }

  async function saveLeaderboardEntry(){
    if(!leaderSaveBtn) return;
    if(!latestResult){
      setLeaderboardStatus('Finish a run before saving.', 'error');
      return;
    }
    if(leaderboardSaving) return;
    leaderboardSaving = true;
    leaderSaveBtn.disabled = true;
    leaderSaveBtn.textContent = 'Saving...';
    setLeaderboardStatus('Saving score...');
    const payload = {
      name: leaderNameInput ? leaderNameInput.value.trim() : '',
      run: latestResult
    };
    try{
      const res = await fetch('/games/power-grid-tycoon/leaderboard', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      let data = null;
      try{
        data = await res.json();
      }catch(parseErr){
        if(res.ok){
          throw parseErr;
        }
      }
      if(!res.ok){
        const message = data && typeof data.error === 'string'
          ? data.error
          : `Failed to save (status ${res.status})`;
        throw new Error(message);
      }
      leaderboardEntries = Array.isArray(data?.entries)?data.entries:leaderboardEntries;
      renderLeaderboard();
      latestResult = null;
      runTelemetry = [];
      setLeaderboardStatus('Saved! Thanks for playing.', 'success');
      if(leaderNameInput) leaderNameInput.disabled = true;
      leaderSaveBtn.textContent = 'Saved';
    }catch(err){
      console.error('Failed to save leaderboard entry', err);
      const msg = err && typeof err.message === 'string' && err.message.trim()
        ? err.message
        : 'Unable to save score. Please try again.';
      setLeaderboardStatus(msg, 'error');
      leaderSaveBtn.disabled = false;
      leaderSaveBtn.textContent = 'Save Score';
    }finally{
      leaderboardSaving = false;
    }
  }

  // ---------- Loop Controls ----------
  function start(){
    if(running) return;
    difficulty = el('#difficulty').value;
    speed = Number(el('#speed').value);
    running=true;
// Timer: setInterval — periodic task
    timer = setInterval(()=>{ for(let i=0;i<speed;i++) tick(); }, TICK_MS_BASE);
    el('#startBtn').disabled=true; el('#pauseBtn').disabled=false; el('#resetBtn').disabled=false;
    toastMsg('Simulation started.');
  }
// Function: pause() — purpose: [describe]. Returns: [value/void].
  function pause(){
    if(!running) return;
    running=false; clearInterval(timer); timer=null; setButtons(); toastMsg('Paused.');
  }
// Function: reset() — purpose: [describe]. Returns: [value/void].
  function reset(){ initGame(); }

  // ---------- Build & Offers UI ----------
  function openModal(sel){ const m = el(sel); if(m){ m.style.display='flex'; } }
// Function: closeModal(sel) — purpose: [describe]. Returns: [value/void].
  function closeModal(sel){ const m = el(sel); if(m){ m.style.display='none'; } }

  // ---------- Events ----------
  function toastMsg(text){
    toast.textContent = text; toast.style.display='block';
    clearTimeout(toast._t);
// Timer: setTimeout — one-shot delayed task
    toast._t = setTimeout(()=> toast.style.display='none', 2400);
    logNotification(text);
  }

  // ---------- Wire UI ----------
  el('#startBtn').addEventListener('click', start);
// UI: Event listener for 'click'
  el('#pauseBtn').addEventListener('click', pause);
// UI: Event listener for 'click'
  el('#resetBtn').addEventListener('click', reset);
// UI: Event listener for 'change'
  el('#speed').addEventListener('change', ()=>{ speed=Number(el('#speed').value); if(running){ pause(); start(); }});

// UI: Event listener for 'click'
  el('#openBuild').addEventListener('click', ()=>{ renderBuildables(); openModal('#modalBuild'); });
// UI: Event listener for 'click'
  el('#openOffers').addEventListener('click', ()=>{ renderOffers(); openModal('#modalOffers'); });
// UI: Event listener for 'click'
  el('#openUpgrades').addEventListener('click', ()=>{ renderUpgrades(); openModal('#modalUpgrades'); });

// UI: Event listener for 'click'
  el('#howto').addEventListener('click', ()=> openModal('#modalHowto'));
  if(openDailyReportBtn) openDailyReportBtn.addEventListener('click', showLatestDailyReport);
  if(openSeasonReportBtn) openSeasonReportBtn.addEventListener('click', showLatestSeasonReport);
// UI: Event listener for 'click'
  els('.close').forEach(btn=> btn.addEventListener('click', ()=> closeModal(btn.getAttribute('data-close'))));
// UI: Event listener for 'click'
  els('.modal').forEach(m=> m.addEventListener('click', (e)=>{ if(e.target===m) m.style.display='none'; }));
  if(leaderSaveBtn) leaderSaveBtn.addEventListener('click', saveLeaderboardEntry);
  if(leaderNameInput) leaderNameInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); saveLeaderboardEntry(); }});

// Function: renderLegend() - purpose: [describe]. Returns: [value/void].
  function renderLegend(){
    const lg = el('#chartLegend'); if(!lg) return;
    lg.innerHTML = '<div class="legend-item"><span class="legend-swatch" style="background:#6ee7ff"></span> Demand</div>' +
                   '<div class="legend-item"><span class="legend-swatch" style="background:#7afabf"></span> Supply</div>' +
                   '<div class="legend-item"><span class="legend-dot" style="background:#ffd166"></span> Frequency</div>';
  }

  // ---------- Bootstrap ----------
  initGame();
  renderLegend();
  prepareLeaderboardSave();
  renderLeaderboard();
  loadLeaderboard();

  // Draw loop (history) - keep smooth even when paused
  function rafLoop(){
    drawHistory();
// Game Loop/Animation: requestAnimationFrame used for per-frame updates
    requestAnimationFrame(rafLoop);
  }
  rafLoop();

})();



