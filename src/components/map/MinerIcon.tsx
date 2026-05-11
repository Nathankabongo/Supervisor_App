import { Miner } from '../../store/useStore';

interface MinerIconProps {
  miner: Miner;
  onClick: () => void;
  isSelected?: boolean;
}

export default function MinerIcon({ miner, onClick, isSelected }: MinerIconProps) {
  const getStatusColor = () => {
    switch (miner.status) {
      case 'safe': return '#22c55e';
      case 'warning': return '#f97316';
      case 'danger': return '#ef4444';
      default: return '#22c55e';
    }
  };

  const getStatusGlow = () => {
    switch (miner.status) {
      case 'safe': return 'rgba(34, 197, 94, 0.25)';
      case 'warning': return 'rgba(249, 115, 22, 0.25)';
      case 'danger': return 'rgba(239, 68, 68, 0.35)';
      default: return 'rgba(34, 197, 94, 0.25)';
    }
  };

  // Calculate movement direction from trajectory
  const getMovementAngle = () => {
    if (miner.trajectory.length < 2) return 0;
    const prev = miner.trajectory[miner.trajectory.length - 2];
    const curr = miner.trajectory[miner.trajectory.length - 1];
    return Math.atan2(curr.y - prev.y, curr.x - prev.x) * (180 / Math.PI);
  };

  const angle = getMovementAngle();
  const size = isSelected ? 1.3 : 1;

  return (
    <g
      transform={`translate(${miner.position.x}, ${miner.position.y}) scale(${size})`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow effect */}
      <circle
        r={isSelected ? 25 : 20}
        fill={getStatusGlow()}
        className={miner.status === 'danger' ? 'animate-pulse' : ''}
      />
      
      {/* Main circle background */}
      <circle
        r={isSelected ? 18 : 14}
        fill={getStatusColor()}
        stroke={isSelected ? '#fff' : 'none'}
        strokeWidth={isSelected ? 2 : 0}
      />
      
      {/* Helmet emoji */}
      <text
        x={isSelected ? -9 : -7}
        y={isSelected ? 7 : 5}
        fontSize={isSelected ? 16 : 12}
      >👷</text>
      
      {/* Alert indicator */}
      {miner.status === 'danger' && (
        <text x={10} y="-10" fontSize="12">⚠️</text>
      )}
      
      {/* Warning indicator */}
      {miner.status === 'warning' && (
        <text x={10} y="-10" fontSize="10">⚠️</text>
      )}
    </g>
  );
}
