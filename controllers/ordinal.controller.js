const db = require('../models');
const Recursion = db.recursion;

// Basic in-memory or DB-backed storage for recursion configs
// If you have a specific model, swap this for persistence.
const configs = []

exports.saveRecursionConfig = async (req, res) => {
  try {
    const cfg = req.body || {}
    const rec = new Recursion({ userId: req.userId, config: cfg })
    await rec.save()
    return res.status(201).send({ ok: true, id: rec._id })
  } catch (e) {
    return res.status(400).send({ ok: false, error: e.message })
  }
}

function composeDerivedGenome (cfg) {
  const g = cfg.derivedGenome || {}
  // Produce a minimal HTML that reads the derived genome and renders a simple visual.
  const json = JSON.stringify(g)
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Recursion Genome</title><style>body{margin:0;background:#0a0a0a;color:#fff}canvas{width:100vw;height:100vh;display:block}</style></head><body><script>const G=${json};</script><canvas id="c"></canvas><script>(function(){const c=document.getElementById('c');const dpr=window.devicePixelRatio||1;function R(){c.width=innerWidth*dpr;c.height=innerHeight*dpr}R();addEventListener('resize',R);const ctx=c.getContext('2d');function rnd(s){s^=s<<13;s^=s>>17;s^=s<<5;return ((s>>>0)/0xffffffff)}let seed=Math.floor((G.dopamine||.5)*1e6)||1;function loop(){const w=c.width,h=c.height;ctx.clearRect(0,0,w,h);const hue=((G.hue||180)%360)|0;const sat=30+((G.coherence||.5)*50|0);const lite=10+(((1-(G.coherence||.5))*30)|0);ctx.fillStyle='hsl('+hue+','+sat+'%,'+lite+'%)';ctx.fillRect(0,0,w,h);let s=seed;function RND(){s^=s<<13;s^=s>>17;s^=s<<5;return ((s>>>0)/0xffffffff)}const count=50+((G.entropy||.5)*250|0);const base=.2+(G.rhythm||.5)*1.5;for(let i=0;i<count;i++){const x=RND()*w;const y=RND()*h;const ang=RND()*Math.PI*2;const sp=base+RND()*((G.entropy||.5)+.1);const nx=x+Math.cos(ang)*20*sp;const ny=y+Math.sin(ang)*20*sp;const a=.3+RND()*.7;ctx.strokeStyle='hsla('+((hue+(RND()*60|0))%360)+',70%,'+(50+(RND()*30|0))+'%,'+a+')';ctx.lineWidth=1+RND()*2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(nx,ny);ctx.stroke()}requestAnimationFrame(loop)}requestAnimationFrame(loop)})()</script></body></html>`
  return { html, json: g }
}

exports.createInscription = async (req, res) => {
  try {
    const cfg = req.body || {}
    const composed = composeDerivedGenome(cfg)
    const rec = new Recursion({ userId: req.userId, config: cfg, payload: composed })
    await rec.save()
    // TODO: integrate PSBT inscription create/broadcast flow here.
    return res.status(202).send({ ok: true, id: rec._id, config: cfg, payload: composed })
  } catch (e) {
    return res.status(400).send({ ok: false, error: e.message })
  }
}
