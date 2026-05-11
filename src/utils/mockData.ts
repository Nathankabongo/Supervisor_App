import { Miner, Alert, MinerStatus, AlertType, Position } from '../store/useStore';

const ZONES = ['ZONE A', 'ZONE B', 'ZONE C', 'ZONE D', 'ZONE E', 'ZONE F'];
const GALLERIES = ['Galerie 1', 'Galerie 2', 'Galerie 3', 'Galerie 4', 'Galerie 5'];
const ROLES = ['Foreur', 'Opérateur', 'Technicien', 'Ingénieur', 'Sécurité'];
const FIRST_NAMES = ['Jean', 'Pierre', 'Marie', 'Paul', 'Sophie', 'Michel', 'François', 'Isabelle', 'Luc', 'Catherine'];
const LAST_NAMES = ['Dupont', 'Martin', 'Bernard', 'Petit', 'Robert', 'Richard', 'Durand', 'Moreau', 'Simon', 'Laurent'];

// Zone boundaries (center x, center y, radius) matching the organic map shapes
const ZONE_BOUNDS: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
  'ZONE A': { cx: 165, cy: 140, rx: 120, ry: 100 },
  'ZONE B': { cx: 425, cy: 140, rx: 120, ry: 100 },
  'ZONE C': { cx: 675, cy: 140, rx: 120, ry: 100 },
  'ZONE D': { cx: 165, cy: 370, rx: 120, ry: 90 },
  'ZONE E': { cx: 425, cy: 400, rx: 120, ry: 90 },
  'ZONE F': { cx: 675, cy: 400, rx: 120, ry: 90 },
};

// Gallery waypoints within each zone for realistic movement
const ZONE_WAYPOINTS: Record<string, { x: number; y: number }[]> = {
  'ZONE A': [
    { x: 80, y: 80 }, { x: 165, y: 70 }, { x: 250, y: 90 },
    { x: 70, y: 160 }, { x: 165, y: 150 }, { x: 260, y: 170 },
    { x: 90, y: 220 }, { x: 165, y: 210 }, { x: 230, y: 230 },
  ],
  'ZONE B': [
    { x: 310, y: 80 }, { x: 425, y: 70 }, { x: 530, y: 90 },
    { x: 320, y: 160 }, { x: 425, y: 150 }, { x: 540, y: 170 },
    { x: 340, y: 220 }, { x: 425, y: 210 }, { x: 510, y: 230 },
  ],
  'ZONE C': [
    { x: 560, y: 80 }, { x: 675, y: 70 }, { x: 790, y: 90 },
    { x: 570, y: 160 }, { x: 675, y: 150 }, { x: 790, y: 170 },
    { x: 580, y: 220 }, { x: 675, y: 210 }, { x: 760, y: 230 },
  ],
  'ZONE D': [
    { x: 80, y: 290 }, { x: 165, y: 280 }, { x: 260, y: 300 },
    { x: 70, y: 370 }, { x: 165, y: 360 }, { x: 270, y: 380 },
    { x: 90, y: 430 }, { x: 165, y: 420 }, { x: 240, y: 440 },
  ],
  'ZONE E': [
    { x: 310, y: 320 }, { x: 425, y: 310 }, { x: 530, y: 330 },
    { x: 320, y: 400 }, { x: 425, y: 390 }, { x: 540, y: 410 },
    { x: 340, y: 460 }, { x: 425, y: 450 }, { x: 510, y: 470 },
  ],
  'ZONE F': [
    { x: 560, y: 320 }, { x: 675, y: 310 }, { x: 790, y: 330 },
    { x: 570, y: 400 }, { x: 675, y: 390 }, { x: 790, y: 410 },
    { x: 580, y: 460 }, { x: 675, y: 450 }, { x: 760, y: 470 },
  ],
};

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMatricule(): string {
  return `MIN-${randomInt(1000, 9999)}`;
}

function generatePosition(zone: string): Position {
  const bounds = ZONE_BOUNDS[zone];
  if (!bounds) {
    return { x: randomInt(50, 950), y: randomInt(50, 450), timestamp: Date.now() };
  }
  // Place miner near a waypoint within the zone
  const waypoints = ZONE_WAYPOINTS[zone];
  const waypoint = randomChoice(waypoints);
  return {
    x: waypoint.x + randomInt(-15, 15),
    y: waypoint.y + randomInt(-15, 15),
    timestamp: Date.now(),
  };
}

function generateTrajectory(zone: string, startPos: Position, count: number = 10): Position[] {
  const waypoints = ZONE_WAYPOINTS[zone] || [];
  const trajectory: Position[] = [startPos];
  let currentX = startPos.x;
  let currentY = startPos.y;
  
  for (let i = 1; i < count; i++) {
    // Move towards a random waypoint in the zone
    if (waypoints.length > 0 && Math.random() < 0.4) {
      const target = randomChoice(waypoints);
      const dx = target.x - currentX;
      const dy = target.y - currentY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = Math.min(dist, randomInt(20, 50));
      currentX += (dx / dist) * step + randomInt(-5, 5);
      currentY += (dy / dist) * step + randomInt(-5, 5);
    } else {
      // Small random walk within zone
      currentX += randomInt(-15, 15);
      currentY += randomInt(-15, 15);
    }
    
    // Clamp to zone bounds
    const bounds = ZONE_BOUNDS[zone];
    if (bounds) {
      currentX = Math.max(bounds.cx - bounds.rx, Math.min(bounds.cx + bounds.rx, currentX));
      currentY = Math.max(bounds.cy - bounds.ry, Math.min(bounds.cy + bounds.ry, currentY));
    }
    
    trajectory.push({
      x: currentX,
      y: currentY,
      timestamp: startPos.timestamp - (count - i) * 60000,
    });
  }
  
  return trajectory.sort((a, b) => a.timestamp - b.timestamp);
}

function generateMiner(id: string): Miner {
  const zone = randomChoice(ZONES);
  const position = generatePosition(zone);
  const status = randomChoice<MinerStatus>(['safe', 'safe', 'safe', 'warning', 'danger']);
  
  return {
    id,
    name: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
    matricule: generateMatricule(),
    role: randomChoice(ROLES),
    status,
    currentZone: zone,
    currentGallery: randomChoice(GALLERIES),
    position,
    trajectory: generateTrajectory(zone, position),
    heartRate: randomInt(60, 100),
    activityLevel: randomInt(1, 10),
  };
}

function generateAlert(id: string, miners: Miner[]): Alert {
  const miner = randomChoice(miners);
  const type = randomChoice<AlertType>(['fall', 'immobility', 'gas', 'emergency']);
  
  let severity: 'low' | 'medium' | 'high' = 'low';
  if (type === 'emergency' || type === 'fall') severity = 'high';
  else if (type === 'immobility') severity = 'medium';
  
  return {
    id,
    minerId: miner.id,
    minerName: miner.name,
    type,
    severity,
    timestamp: Date.now() - randomInt(0, 3600000),
    resolved: false,
  };
}

export function generateMockMiners(count: number = 40): Miner[] {
  return Array.from({ length: count }, (_, i) => generateMiner(`miner-${i + 1}`));
}

export function generateMockAlerts(miners: Miner[], count: number = 5): Alert[] {
  return Array.from({ length: count }, (_, i) => generateAlert(`alert-${i + 1}`, miners));
}

export function updateMinerPosition(miner: Miner): Miner {
  const zone = miner.currentZone;
  const bounds = ZONE_BOUNDS[zone];
  const waypoints = ZONE_WAYPOINTS[zone] || [];
  
  let newX = miner.position.x;
  let newY = miner.position.y;
  
  // 60% chance: move towards a waypoint (realistic gallery path movement)
  // 30% chance: small random walk (staying in area)
  // 10% chance: move to adjacent zone
  const moveType = Math.random();
  
  if (moveType < 0.6 && waypoints.length > 0) {
    // Move towards a waypoint
    const target = randomChoice(waypoints);
    const dx = target.x - newX;
    const dy = target.y - newY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      const speed = Math.min(dist, randomInt(8, 25));
      newX += (dx / dist) * speed + randomInt(-3, 3);
      newY += (dy / dist) * speed + randomInt(-3, 3);
    } else {
      // Already at waypoint, small random movement
      newX += randomInt(-8, 8);
      newY += randomInt(-8, 8);
    }
  } else if (moveType < 0.9) {
    // Small random walk within zone
    newX += randomInt(-12, 12);
    newY += randomInt(-12, 12);
  } else {
    // Move to adjacent zone through tunnel
    const adjacentZones = getAdjacentZones(zone);
    const newZone = randomChoice(adjacentZones);
    const newBounds = ZONE_BOUNDS[newZone];
    if (newBounds) {
      // Move towards the edge closest to the new zone
      const dx = newBounds.cx - newX;
      const dy = newBounds.cy - newY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = Math.min(dist, randomInt(30, 60));
      newX += (dx / dist) * speed;
      newY += (dy / dist) * speed;
      miner = { ...miner, currentZone: newZone };
    }
  }
  
  // Clamp to current zone bounds
  if (bounds) {
    newX = Math.max(bounds.cx - bounds.rx + 10, Math.min(bounds.cx + bounds.rx - 10, newX));
    newY = Math.max(bounds.cy - bounds.ry + 10, Math.min(bounds.cy + bounds.ry - 10, newY));
  }
  
  const newPosition: Position = {
    x: newX,
    y: newY,
    timestamp: Date.now(),
  };
  
  // Update trajectory
  const updatedTrajectory = [...miner.trajectory, newPosition];
  if (updatedTrajectory.length > 20) {
    updatedTrajectory.shift();
  }
  
  // Update heart rate and activity
  const newHeartRate = Math.max(50, Math.min(130, miner.heartRate + randomInt(-3, 3)));
  const newActivityLevel = Math.max(1, Math.min(10, miner.activityLevel + randomInt(-1, 1)));
  
  // Occasionally change status
  let newStatus = miner.status;
  if (Math.random() < 0.02) {
    newStatus = randomChoice<MinerStatus>(['safe', 'safe', 'safe', 'warning', 'danger']);
  }
  
  return {
    ...miner,
    position: newPosition,
    trajectory: updatedTrajectory,
    heartRate: newHeartRate,
    activityLevel: newActivityLevel,
    status: newStatus,
  };
}

function getAdjacentZones(zone: string): string[] {
  const adjacency: Record<string, string[]> = {
    'ZONE A': ['ZONE B', 'ZONE D'],
    'ZONE B': ['ZONE A', 'ZONE C', 'ZONE E'],
    'ZONE C': ['ZONE B', 'ZONE F'],
    'ZONE D': ['ZONE A', 'ZONE E'],
    'ZONE E': ['ZONE D', 'ZONE B', 'ZONE F'],
    'ZONE F': ['ZONE C', 'ZONE E'],
  };
  return adjacency[zone] || ZONES;
}
