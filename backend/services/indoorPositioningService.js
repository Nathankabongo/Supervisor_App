/**
 * indoorPositioningService.js
 * Moteur de positionnement souterrain sans GPS (BLE RSSI + Interpolation 1D / Trilatération + Map Matching + PDR)
 */

const STEP_LENGTH_M = 0.7;

// Cache mémoire du dernier compteur de pas par mineur pour le PDR
const lastStepsByMiner = new Map();

export function rssiToDistance(rssi, txPower = -59, pathLossN = 2.3) {
  const r = Number(rssi);
  if (!Number.isFinite(r)) return 25;
  const n = Math.max(1.5, Math.min(4.0, Number(pathLossN) || 2.3));
  const tx = Number.isFinite(Number(txPower)) ? Number(txPower) : -59;
  const d = Math.pow(10, (tx - r) / (10 * n));
  return Math.max(0.5, Math.min(80, d));
}

function projectPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { x: ax, y: ay, dist: Math.hypot(px - ax, py - ay), t: 0 };
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return {
    x: projX,
    y: projY,
    dist: Math.hypot(px - projX, py - projY),
    t,
  };
}

function mapMatchToLevel(rawX, rawY, levelId, segments, nodeMap) {
  const levelSegments = segments.filter((s) => s.level_id === levelId && s.status !== 'blocked');
  if (levelSegments.length === 0) {
    return { x: rawX, y: rawY, segment: null, nodeZone: null };
  }

  let bestProj = null;
  let bestSeg = null;

  for (const seg of levelSegments) {
    const a = nodeMap.get(seg.from_node_id);
    const b = nodeMap.get(seg.to_node_id);
    if (!a || !b) continue;
    const proj = projectPointToSegment(rawX, rawY, a.x, a.y, b.x, b.y);
    if (!bestProj || proj.dist < bestProj.dist) {
      bestProj = proj;
      bestSeg = { seg, a, b };
    }
  }

  if (!bestProj || !bestSeg) {
    return { x: rawX, y: rawY, segment: null, nodeZone: null };
  }

  const nearerNode = bestProj.t < 0.5 ? bestSeg.a : bestSeg.b;
  return {
    x: Number(bestProj.x.toFixed(2)),
    y: Number(bestProj.y.toFixed(2)),
    segment: bestSeg.seg,
    nodeZone: nearerNode.zone || null,
  };
}

export function computeIndoorPosition({ db, miner, beacons = [], steps = null }) {
  const anchors = db
    .prepare('SELECT id, device_id, level_id, segment_id, x, y, tx_power, path_loss_n FROM mine_anchors')
    .all();

  if (!anchors || anchors.length === 0) {
    return null;
  }

  const nodes = db.prepare('SELECT id, level_id, x, y, zone FROM mine_nodes').all();
  const segments = db
    .prepare('SELECT id, level_id, from_node_id, to_node_id, name, status FROM mine_segments')
    .all();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Delta de pas pour PDR
  let deltaSteps = 0;
  if (steps !== null && steps !== undefined && Number.isFinite(Number(steps))) {
    const curSteps = Number(steps);
    const prevSteps = lastStepsByMiner.get(miner.id);
    if (prevSteps !== undefined && curSteps > prevSteps && curSteps - prevSteps < 200) {
      deltaSteps = curSteps - prevSteps;
    }
    lastStepsByMiner.set(miner.id, curSteps);
  }

  // Associer les balises reçues aux ancres Ulinzi Box placées sur la carte
  const anchorByDevice = new Map(anchors.map((a) => [a.device_id.toUpperCase(), a]));
  const matched = [];
  if (Array.isArray(beacons)) {
    for (const b of beacons) {
      if (!b || !b.id) continue;
      const anchor = anchorByDevice.get(String(b.id).trim().toUpperCase());
      if (!anchor) continue;
      const dist = rssiToDistance(b.rssi, anchor.tx_power, anchor.path_loss_n);
      matched.push({
        anchor,
        rssi: Number(b.rssi),
        dist,
      });
    }
  }

  matched.sort((a, b) => a.dist - b.dist);

  // Cas 0 balise détectée : fallback PDR si le mineur est déjà sous terre
  if (matched.length === 0) {
    if (miner.level_id && Number.isFinite(Number(miner.x)) && Number.isFinite(Number(miner.y))) {
      let px = Number(miner.x);
      let py = Number(miner.y);
      const levelSegs = segments.filter((s) => s.level_id === miner.level_id && s.status !== 'blocked');
      if (deltaSteps > 0 && levelSegs.length > 0) {
        // Avancer le long du segment le plus proche
        const mm = mapMatchToLevel(px, py, miner.level_id, segments, nodeMap);
        if (mm.segment) {
          const a = nodeMap.get(mm.segment.from_node_id);
          const b = nodeMap.get(mm.segment.to_node_id);
          if (a && b) {
            const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            const adv = deltaSteps * STEP_LENGTH_M;
            px = Number((px + ((b.x - a.x) / len) * adv).toFixed(2));
            py = Number((py + ((b.y - a.y) / len) * adv).toFixed(2));
            const clamped = mapMatchToLevel(px, py, miner.level_id, segments, nodeMap);
            px = clamped.x;
            py = clamped.y;
          }
        }
      }
      return {
        x: px,
        y: py,
        levelId: miner.level_id,
        gallery: miner.gallery || null,
        zone: miner.zone || 'ZONE B',
        uncertaintyM: 12,
        source: deltaSteps > 0 ? 'pdr' : 'ble_ips',
        matchedAnchors: [],
      };
    }
    return null;
  }

  // Niveau dominant = celui de la balise la plus proche
  const dominantLevelId = matched[0].anchor.level_id;
  const levelMatches = matched.filter((m) => m.anchor.level_id === dominantLevelId);

  let rawX = levelMatches[0].anchor.x;
  let rawY = levelMatches[0].anchor.y;
  let uncertaintyM = Number(levelMatches[0].dist.toFixed(1));

  if (levelMatches.length === 2) {
    // Interpolation linéaire 1D entre 2 Ulinzi Box (robuste en tunnel)
    const mA = levelMatches[0];
    const mB = levelMatches[1];
    const t = mA.dist / (mA.dist + mB.dist);
    rawX = mA.anchor.x + t * (mB.anchor.x - mA.anchor.x);
    rawY = mA.anchor.y + t * (mB.anchor.y - mA.anchor.y);
    uncertaintyM = Number(Math.min(mA.dist, mB.dist).toFixed(1));
  } else if (levelMatches.length >= 3) {
    // Trilatération pondérée par 1 / d^2
    let wSum = 0;
    let xSum = 0;
    let ySum = 0;
    for (const m of levelMatches.slice(0, 5)) {
      const w = 1 / Math.max(0.25, m.dist * m.dist);
      wSum += w;
      xSum += w * m.anchor.x;
      ySum += w * m.anchor.y;
    }
    rawX = xSum / wSum;
    rawY = ySum / wSum;
    uncertaintyM = Number((levelMatches[0].dist * 0.7).toFixed(1));
  }

  // Map Matching : projection orthogonale sur la galerie la plus proche
  const snapped = mapMatchToLevel(rawX, rawY, dominantLevelId, segments, nodeMap);

  return {
    x: snapped.x,
    y: snapped.y,
    levelId: dominantLevelId,
    gallery: snapped.segment?.name || miner.gallery || null,
    zone: snapped.nodeZone || miner.zone || 'ZONE B',
    uncertaintyM,
    source: 'ble_ips',
    matchedAnchors: levelMatches.map((m) => ({
      id: m.anchor.device_id,
      rssi: m.rssi,
      distM: Number(m.dist.toFixed(1)),
    })),
  };
}

