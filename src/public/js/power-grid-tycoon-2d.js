const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const readNumberFromText = (selector) => {
  const el = document.querySelector(selector);
  if (!el) return 0;
  const text = el.textContent?.replace(/,/g, '') ?? '';
  const numeric = parseFloat(text.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

const readText = (selector) => {
  const el = document.querySelector(selector);
  return el?.textContent?.trim() ?? '';
};

const parseIntensity = (text) => {
  if (!text) return 0.5;
  const lowered = text.toLowerCase();
  if (lowered.includes('high') || lowered.includes('strong')) return 0.95;
  if (lowered.includes('medium') || lowered.includes('avg')) return 0.65;
  if (lowered.includes('low') || lowered.includes('weak')) return 0.35;
  const numeric = parseFloat(text);
  if (Number.isFinite(numeric)) {
    return clamp(numeric / 10, 0.15, 1);
  }
  return 0.5;
};

class GridCommandScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext?.('2d') ?? null;
    this.nodes = [];
    this.flows = [];
    this.phase = 0;
    this.size = { width: 0, height: 0 };
    this.frame = null;
    if (this.ctx) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.start();
    }
  }

  resize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = this.canvas;
    this.canvas.width = Math.round(clientWidth * dpr);
    this.canvas.height = Math.round(clientHeight * dpr);
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
    this.size = { width: clientWidth, height: clientHeight };
  }

  setSceneData({ nodes = [], flows = [] }) {
    this.nodes = nodes;
    this.flows = flows;
  }

  start() {
    if (this.frame) cancelAnimationFrame(this.frame);
    const loop = () => {
      this.phase = (this.phase + 0.6) % 360;
      this.draw();
      this.frame = requestAnimationFrame(loop);
    };
    loop();
  }

  drawBackground() {
    const { ctx } = this;
    if (!ctx) return;
    const { width, height } = this.size;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    const gridSize = 48;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFlows() {
    const { ctx } = this;
    if (!ctx) return;
    const lookup = new Map(this.nodes.map((node) => [node.id, node]));
    ctx.save();
    for (const flow of this.flows) {
      const from = lookup.get(flow.from);
      const to = lookup.get(flow.to);
      if (!from || !to) continue;
      const width = 2 + flow.strength * 10;
      ctx.strokeStyle = flow.color || 'rgba(96,165,250,0.9)';
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.setLineDash([12, 18]);
      ctx.lineDashOffset = -this.phase * (flow.speed || 1);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawNodes() {
    const { ctx } = this;
    if (!ctx) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 14px "Inter", "Segoe UI", sans-serif';
    for (const node of this.nodes) {
      const radius = 20 + node.value * 26;
      const gradient = ctx.createRadialGradient(node.x, node.y, radius * 0.1, node.x, node.y, radius);
      gradient.addColorStop(0, node.innerColor || 'rgba(255,255,255,0.9)');
      gradient.addColorStop(1, node.color || 'rgba(59,130,246,0.5)');
      ctx.fillStyle = gradient;
      ctx.shadowColor = node.glowColor || node.color || 'rgba(59,130,246,0.8)';
      ctx.shadowBlur = 25 * node.value + 10;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 13px "Inter", "Segoe UI", sans-serif';
      ctx.fillText(node.label, node.x, node.y - radius - 4);
      ctx.font = '400 12px "Inter", "Segoe UI", sans-serif';
      if (node.subtitle) {
        ctx.fillText(node.subtitle, node.x, node.y + radius + 14);
      }
    }
    ctx.restore();
  }

  draw() {
    if (!this.ctx) return;
    this.drawBackground();
    this.drawFlows();
    this.drawNodes();
  }
}

const buildSceneData = (metrics) => {
  const {
    demand,
    supply,
    balance,
    freq,
    cash,
    reputation,
    sunlight,
    wind,
    storageMode,
    storageIntensity,
  } = metrics;

  const maxLoad = Math.max(demand, supply, 1);
  const demandIntensity = clamp(demand / maxLoad, 0, 1);
  const supplyIntensity = clamp(supply / maxLoad, 0, 1);
  const controlStress = clamp(Math.abs(freq - 60) / 1.5, 0, 1);
  const repFactor = clamp(reputation / 100, 0, 1);
  const storageValue = clamp(storageIntensity, 0, 1);
  const renewableFactor = clamp((sunlight + wind) / 2, 0, 1);

  const nodes = [
    {
      id: 'hub',
      label: 'Dispatch Hub',
      subtitle: `${freq.toFixed(2)} Hz • $${cash.toLocaleString()}`,
      x: 0.55,
      y: 0.45,
      value: clamp(1 - controlStress, 0.15, 1),
      color: 'rgba(248,250,252,0.85)',
      innerColor: 'rgba(190,227,248,0.9)',
      glowColor: controlStress > 0.5 ? 'rgba(248,113,113,0.8)' : 'rgba(14,165,233,0.9)',
    },
    {
      id: 'thermal',
      label: 'Thermal Fleet',
      subtitle: `${Math.round(supply * 0.45).toLocaleString()} MW`,
      x: 0.2,
      y: 0.3,
      value: clamp(supplyIntensity * (0.45 + repFactor * 0.2), 0.05, 1),
      color: 'rgba(52,211,153,0.9)',
      innerColor: 'rgba(167,243,208,0.95)',
    },
    {
      id: 'renewable',
      label: 'Renewables',
      subtitle: `${Math.round(supply * renewableFactor * 0.6).toLocaleString()} MW`,
      x: 0.85,
      y: 0.25,
      value: clamp(renewableFactor, 0.05, 1),
      color: 'rgba(251,191,36,0.9)',
      innerColor: 'rgba(254,243,199,0.95)',
    },
    {
      id: 'storage',
      label: storageMode === 'discharge' ? 'Storage (assist)' : 'Storage (charging)',
      subtitle: storageMode === 'discharge' ? 'Blue pulse = discharge' : 'Purple pulse = charging',
      x: 0.82,
      y: 0.75,
      value: clamp(storageValue, 0.1, 1),
      color: storageMode === 'discharge' ? 'rgba(96,165,250,0.9)' : 'rgba(168,85,247,0.9)',
      innerColor: 'rgba(191,219,254,0.95)',
    },
    {
      id: 'city',
      label: 'Metro Demand',
      subtitle: `${Math.round(demand).toLocaleString()} MW`,
      x: 0.28,
      y: 0.78,
      value: demandIntensity,
      color: 'rgba(248,191,36,0.95)',
      innerColor: 'rgba(254,243,199,0.9)',
    },
  ].map((node) => ({
    ...node,
    x: node.x * (metrics.stageWidth ?? 0) + 40,
    y: node.y * (metrics.stageHeight ?? 0) + 40,
  }));

  const flows = [
    { from: 'thermal', to: 'hub', color: 'rgba(52,211,153,0.9)', strength: clamp(supplyIntensity * 0.6, 0, 1), speed: 1 },
    { from: 'renewable', to: 'hub', color: 'rgba(251,191,36,0.9)', strength: clamp(renewableFactor, 0, 1), speed: 0.8 },
    { from: 'storage', to: 'hub', color: nodes.find((n) => n.id === 'storage')?.color, strength: storageValue, speed: storageMode === 'discharge' ? 1.2 : 0.6 },
    { from: 'hub', to: 'city', color: balance >= 0 ? 'rgba(59,130,246,0.85)' : 'rgba(248,113,113,0.85)', strength: clamp(Math.abs(balance) / maxLoad, 0.05, 1), speed: balance >= 0 ? 1.1 : 1.4 },
  ];

  return { nodes, flows };
};

const collectMetrics = (stageSize) => {
  const demand = readNumberFromText('#demand');
  const supply = readNumberFromText('#supply');
  const balance = supply - demand;
  const freq = parseFloat(readText('#freq')) || 60;
  const cash = readNumberFromText('#cash');
  const reputation = readNumberFromText('#rep');
  const sunlight = parseIntensity(readText('#hudSunlightInfo'));
  const wind = parseIntensity(readText('#hudWindInfo'));
  const storageMode = balance < 0 ? 'discharge' : 'charge';
  const storageIntensity = clamp(Math.abs(balance) / Math.max(demand, 1), 0, 1);

  return {
    demand,
    supply,
    balance,
    freq,
    cash,
    reputation,
    sunlight,
    wind,
    storageMode,
    storageIntensity,
    stageWidth: Math.max(stageSize.width - 80, 120),
    stageHeight: Math.max(stageSize.height - 80, 120),
  };
};

const boot = () => {
  const canvas = document.querySelector('#gridCommandCanvas');
  if (!canvas) return;
  const scene = new GridCommandScene(canvas);

  const sync = () => {
    const metrics = collectMetrics(scene.size);
    const data = buildSceneData(metrics);
    scene.setSceneData(data);
  };

  sync();
  setInterval(sync, 600);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
