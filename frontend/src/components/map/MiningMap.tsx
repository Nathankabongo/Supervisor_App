import { useState } from 'react';

interface MiningMapProps {
  width?: number;
  height?: number;
  onZoneClick?: (zoneId: string) => void;
  onZoneHover?: (zoneId: string | null) => void;
  className?: string;
  viewMode?: 'zone' | 'gallery' | 'level';
}

export default function MiningMap({
  width = 1000,
  height = 500,
  onZoneClick,
  onZoneHover,
  className = '',
  viewMode = 'zone',
}: MiningMapProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const handleZoneMouseEnter = (zoneId: string) => {
    setHoveredZone(zoneId);
    onZoneHover?.(zoneId);
  };

  const handleZoneMouseLeave = () => {
    setHoveredZone(null);
    onZoneHover?.(null);
  };

  const handleZoneClick = (zoneId: string) => {
    onZoneClick?.(zoneId);
  };

  const getZoneOpacity = (zoneId: string) => {
    if (viewMode === 'gallery') return 0.15;
    if (viewMode === 'level') {
      // Pour le mode level, les zones du haut (A, B, C) et du bas (D, E, F)
      const isTopZone = ['ZONE A', 'ZONE B', 'ZONE C'].includes(zoneId);
      return isTopZone ? 0.6 : 0.3;
    }
    return hoveredZone && hoveredZone !== zoneId ? 0.3 : 1;
  };

  const getZoneFillOpacity = (zoneId: string) => {
    if (viewMode === 'gallery') return 0.05;
    if (viewMode === 'level') {
      const isTopZone = ['ZONE A', 'ZONE B', 'ZONE C'].includes(zoneId);
      return isTopZone ? 0.2 : 0.1;
    }
    return hoveredZone === zoneId ? 0.3 : 0.15;
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 1000 500"
      className={`bg-[#0b1a2a] ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background */}
      <rect width="1000" height="500" fill="#0b1a2a" />

      {/* Grid lines */}
      <defs>
        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1a2f4a" strokeWidth="0.5" />
        </pattern>
        <linearGradient id="tunnelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#64748b" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#475569" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <rect width="1000" height="500" fill="url(#grid)" />

      {/* Minimal Gallery Lines - just main connections */}
      <path
        d="M 165 50 Q 175 250 165 450"
        stroke="#334155"
        strokeWidth="3"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M 425 50 Q 435 250 425 450"
        stroke="#334155"
        strokeWidth="3"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M 675 50 Q 685 250 675 450"
        stroke="#334155"
        strokeWidth="3"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M 50 160 Q 400 145 750 160"
        stroke="#334155"
        strokeWidth="3"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M 50 370 Q 400 355 750 370"
        stroke="#334155"
        strokeWidth="3"
        fill="none"
        opacity="0.5"
      />

      {/* Zone A - Top Left (Orange) - Organic shape */}
      <g id="zone-a">
        <path
          d="M 40 40 Q 150 30 280 45 Q 320 80 310 150 Q 300 200 250 230 Q 180 250 120 240 Q 50 220 40 160 Q 35 100 40 40 Z"
          fill="#f97316"
          fillOpacity={getZoneFillOpacity('ZONE A')}
          stroke="#f97316"
          strokeWidth={hoveredZone === 'ZONE A' ? '4' : '3'}
          strokeLinecap="round"
          className="cursor-pointer transition-all duration-200"
          style={{ opacity: getZoneOpacity('ZONE A') }}
          onMouseEnter={() => handleZoneMouseEnter('ZONE A')}
          onMouseLeave={handleZoneMouseLeave}
          onClick={() => handleZoneClick('ZONE A')}
        />
        <text
          x="165"
          y="130"
          fill="#f97316"
          fontSize="16"
          fontWeight="bold"
          textAnchor="middle"
          style={{ opacity: getZoneOpacity('ZONE A') }}
        >
          ZONE A
        </text>
        <text
          x="165"
          y="150"
          fill="#fdba74"
          fontSize="11"
          textAnchor="middle"
          style={{ opacity: getZoneOpacity('ZONE A') }}
        >
          Extraction
        </text>
      </g>

      {/* Zone B - Top Center (Blue) - Organic shape */}
      <g id="zone-b">
        <path
          d="M 290 50 Q 400 35 530 45 Q 570 75 560 140 Q 550 200 500 225 Q 430 245 370 235 Q 310 220 300 170 Q 295 110 290 50 Z"
          fill="#3b82f6"
          fillOpacity={getZoneFillOpacity('ZONE B')}
          stroke="#3b82f6"
          strokeWidth={hoveredZone === 'ZONE B' ? '4' : '3'}
          strokeLinecap="round"
          className="cursor-pointer transition-all duration-200"
          style={{ opacity: getZoneOpacity('ZONE B') }}
          onMouseEnter={() => handleZoneMouseEnter('ZONE B')}
          onMouseLeave={handleZoneMouseLeave}
          onClick={() => handleZoneClick('ZONE B')}
        />
        <text
          x="425"
          y="130"
          fill="#3b82f6"
          fontSize="16"
          fontWeight="bold"
          textAnchor="middle"
          style={{ opacity: getZoneOpacity('ZONE B') }}
        >
          ZONE B
        </text>
        <text
          x="425"
          y="150"
          fill="#60a5fa"
          fontSize="11"
          textAnchor="middle"
          style={{ opacity: getZoneOpacity('ZONE B') }}
        >
          Transport
        </text>
      </g>

      {/* Zone C - Top Right (Green) - Organic shape */}
      <g id="zone-c">
        <path
          d="M 540 50 Q 650 35 780 45 Q 820 80 810 150 Q 800 200 750 225 Q 680 245 620 235 Q 560 220 550 170 Q 545 110 540 50 Z"
          fill="#22c55e"
          fillOpacity={getZoneFillOpacity('ZONE C')}
          stroke="#22c55e"
          strokeWidth={hoveredZone === 'ZONE C' ? '4' : '3'}
          strokeLinecap="round"
          className="cursor-pointer transition-all duration-200"
          style={{ opacity: getZoneOpacity('ZONE C') }}
          onMouseEnter={() => handleZoneMouseEnter('ZONE C')}
          onMouseLeave={handleZoneMouseLeave}
          onClick={() => handleZoneClick('ZONE C')}
        />
        <text
          x="675"
          y="130"
          fill="#22c55e"
          fontSize="16"
          fontWeight="bold"
          textAnchor="middle"
          style={{ opacity: getZoneOpacity('ZONE C') }}
        >
          ZONE C
        </text>
        <text
          x="675"
          y="150"
          fill="#4ade80"
          fontSize="11"
          textAnchor="middle"
          style={{ opacity: getZoneOpacity('ZONE C') }}
        >
          Ventilation
        </text>
      </g>

      {/* Zone D - Bottom Left (Purple) - Organic shape */}
      <g id="zone-d">
        <path
          d="M 40 260 Q 150 245 280 255 Q 320 285 310 350 Q 300 410 250 435 Q 180 455 120 445 Q 50 425 40 370 Q 35 310 40 260 Z"
          fill="#a855f7"
          fillOpacity={getZoneFillOpacity('ZONE D')}
          stroke="#a855f7"
          strokeWidth={hoveredZone === 'ZONE D' ? '4' : '3'}
          strokeLinecap="round"
          className="cursor-pointer transition-all duration-200"
          style={{ opacity: getZoneOpacity('ZONE D') }}
          onMouseEnter={() => handleZoneMouseEnter('ZONE D')}
          onMouseLeave={handleZoneMouseLeave}
          onClick={() => handleZoneClick('ZONE D')}
        />
        <text
          x="165"
          y="360"
          fill="#a855f7"
          fontSize="16"
          fontWeight="bold"
          textAnchor="middle"
          style={{ opacity: getZoneOpacity('ZONE D') }}
        >
          ZONE D
        </text>
        <text
          x="165"
          y="380"
          fill="#c084fc"
          fontSize="11"
          textAnchor="middle"
          style={{ opacity: getZoneOpacity('ZONE D') }}
        >
          Stockage
        </text>
      </g>

      {/* Zone E - Bottom Center (Red) - Organic shape */}
      <g id="zone-e">
        <path
          d="M 290 310 Q 400 295 530 305 Q 570 335 560 400 Q 550 460 500 485 Q 430 505 370 495 Q 310 480 300 430 Q 295 370 290 310 Z"
          fill="#ef4444"
          fillOpacity={getZoneFillOpacity('ZONE E')}
          stroke="#ef4444"
          strokeWidth={hoveredZone === 'ZONE E' ? '4' : '3'}
          strokeLinecap="round"
          className="cursor-pointer transition-all duration-200"
          style={{ opacity: getZoneOpacity('ZONE E') }}
          onMouseEnter={() => handleZoneMouseEnter('ZONE E')}
          onMouseLeave={handleZoneMouseLeave}
          onClick={() => handleZoneClick('ZONE E')}
        />
        <text
          x="425"
          y="400"
          fill="#ef4444"
          fontSize="16"
          fontWeight="bold"
          textAnchor="middle"
          style={{ opacity: getZoneOpacity('ZONE E') }}
        >
          ZONE E
        </text>
        <text
          x="425"
          y="420"
          fill="#f87171"
          fontSize="11"
          textAnchor="middle"
          style={{ opacity: getZoneOpacity('ZONE E') }}
        >
          Maintenance
        </text>
      </g>

      {/* Zone F - Bottom Right (Cyan) - Organic shape */}
      <g id="zone-f">
        <path
          d="M 540 310 Q 650 295 780 305 Q 820 335 810 400 Q 800 460 750 485 Q 680 505 620 495 Q 560 480 550 430 Q 545 370 540 310 Z"
          fill="#06b6d4"
          fillOpacity={getZoneFillOpacity('ZONE F')}
          stroke="#06b6d4"
          strokeWidth={hoveredZone === 'ZONE F' ? '4' : '3'}
          strokeLinecap="round"
          className="cursor-pointer transition-all duration-200"
          style={{ opacity: getZoneOpacity('ZONE F') }}
          onMouseEnter={() => handleZoneMouseEnter('ZONE F')}
          onMouseLeave={handleZoneMouseLeave}
          onClick={() => handleZoneClick('ZONE F')}
        />
        <text
          x="675"
          y="400"
          fill="#06b6d4"
          fontSize="16"
          fontWeight="bold"
          textAnchor="middle"
          style={{ opacity: getZoneOpacity('ZONE F') }}
        >
          ZONE F
        </text>
        <text
          x="675"
          y="420"
          fill="#22d3ee"
          fontSize="11"
          textAnchor="middle"
          style={{ opacity: getZoneOpacity('ZONE F') }}
        >
          Services
        </text>
      </g>

      {/* Scale bar */}
      <g transform="translate(50, 470)">
        <line x1="0" y1="0" x2="120" y2="0" stroke="#94a3b8" strokeWidth="2.5" />
        <line x1="0" y1="-6" x2="0" y2="6" stroke="#94a3b8" strokeWidth="2.5" />
        <line x1="60" y1="-4" x2="60" y2="4" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="120" y1="-6" x2="120" y2="6" stroke="#94a3b8" strokeWidth="2.5" />
        <text x="60" y="22" fill="#94a3b8" fontSize="12" textAnchor="middle">
          120 m
        </text>
      </g>

      {/* Site Statistics */}
      <g transform="translate(50, 20)">
        <rect
          x="0"
          y="0"
          width="220"
          height="32"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1.5"
          rx="6"
        />
        <text x="12" y="21" fill="#94a3b8" fontSize="12">
          Site: Mine Nord - Niveau -120m
        </text>
      </g>
    </svg>
  );
}
