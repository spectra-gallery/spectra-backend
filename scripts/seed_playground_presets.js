#!/usr/bin/env node
/*
  Seed playground presets into MongoDB as Sketch documents.

  - Parses HTML files into html/css/javascript parts
  - Upserts by url = `preset:<name>` to keep idempotent

  Usage:
    node scripts/seed_playground_presets.js [--only name1,name2]

  DB connection reads spectra-backend/config/db.config.js and env.
*/
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = require('../config/db.config');
const Sketch = require('../models/sketch.model');

const PRESET_MAP = {
  spectra3: { file: ['sketchbook', 'data-sci-art', 'nn', 'spectra3.html'] },
  'sgi-spectra3': { file: ['sketchbook', 'generative-systems', 'spectral-grid-inference', 'spectra3.html'] },
  'sgi-spectra4': { file: ['sketchbook', 'generative-systems', 'spectral-grid-inference', 'spectra4.html'] },
  'sgi-spectra7': { file: ['sketchbook', 'generative-systems', 'spectral-grid-inference', 'spectra7.html'] },
  'gridflub-spectra4': { file: ['sketchbook', 'generative-systems', 'gridflub', 'spectra4.html'] },
  'gridflub-spectra7': { file: ['sketchbook', 'generative-systems', 'gridflub', 'spectra7.html'] },
  'gridflub-liquid2': { file: ['sketchbook', 'generative-systems', 'gridflub', 'liquidUntitledII.html'] },
  'exosys-origin-exosys': { file: ['sketchbook', 'generative-systems', 'exosys-origin', 'exosys.html'] },
  'exosys-origin-exosphere': { file: ['sketchbook', 'generative-systems', 'exosys-origin', 'exosphere.html'] },
  'exo-lissajou-boids': { file: ['sketchbook', 'generative-systems', 'exo-lissajou', 'exosys_webgl_boids.html'] },
  'exo-lissajou-blobby': { file: ['sketchbook', 'generative-systems', 'exo-lissajou', 'exosys_webgl_blobby.html'] },
  'exo-lissajou-hmfield': { file: ['sketchbook', 'generative-systems', 'exo-lissajou', 'hmfield.html'] },
  'exo-lissajou-lissa': { file: ['sketchbook', 'generative-systems', 'exo-lissajou', 'lissa.html'] },
  riemann: { file: ['sketchbook', 'data-sci-art', 'riemann.html'] },
  perceptral: { file: ['sketchbook', 'data-sci-art', 'perceptral.html'] },
  munsellQ: { file: ['sketchbook', 'data-sci-art', 'munsellQ.html'] },
  treemap: { file: ['sketchbook', 'data-viz-model-sandbox', 'treemap.html'] },
  multitimeline: { file: ['sketchbook', 'data-viz-model-sandbox', 'multitimeline.html'] }
};

function parseHtmlFile(absPath) {
  const raw = fs.readFileSync(absPath, 'utf8');
  const styles = [];
  const scripts = [];
  let remaining = raw;
  remaining = remaining.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => { styles.push(css); return ''; });
  remaining = remaining.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi, (_, js) => { scripts.push(js); return ''; });
  let html = '';
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) html = bodyMatch[1].trim();
  else html = remaining.replace(/<\/?html[^>]*>/gi, '').replace(/<\/?head[^>]*>[\s\S]*?<\/?head>/gi, '').trim();
  // retain external deps inside body for iframe usage
  const externalScripts = (raw.match(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi) || [])
    .map(tag => (tag.match(/src=["']([^"']+)["']/i) || [])[1]).filter(Boolean);
  const externalLinks = (raw.match(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi) || [])
    .map(tag => (tag.match(/href=["']([^"']+)["']/i) || [])[1]).filter(Boolean);
  const linkTags = externalLinks.map(href => `<link rel="stylesheet" href="${href}">`).join('\n');
  const scriptTags = externalScripts.map(src => `<script src="${src}"></script>`).join('\n');
  if (linkTags) html = linkTags + '\n' + html;
  if (scriptTags) html = html + '\n' + scriptTags;
  return { html, css: styles.join('\n\n'), javascript: scripts.join('\n\n') };
}

async function main() {
  const onlyArg = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
  const only = onlyArg ? new Set(onlyArg.split(',').map(s => s.trim()).filter(Boolean)) : null;

  const mongoUrl = process.env.MONGO_URL || `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;
  await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to', mongoUrl);

  const baseDir = path.resolve(__dirname, '..', '..');
  const entries = Object.entries(PRESET_MAP).filter(([name]) => !only || only.has(name));

  for (const [name, meta] of entries) {
    const absPath = path.join(baseDir, ...meta.file);
    if (!fs.existsSync(absPath)) {
      console.warn('Skipping missing preset file:', name, absPath);
      continue;
    }
    const { html, css, javascript } = parseHtmlFile(absPath);
    const url = `preset:${name}`;
    const update = { html, css, javascript, url };
    const doc = await Sketch.findOneAndUpdate(
      { url },
      { $set: update, $setOnInsert: { hash: '' } },
      { upsert: true, new: true }
    );
    console.log('Seeded:', name, '->', String(doc._id));
  }

  await mongoose.disconnect();
  console.log('Done.');
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

