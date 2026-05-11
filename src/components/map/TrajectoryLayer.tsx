import { Miner, Position } from '../../store/useStore';

interface TrajectoryLayerProps {
  miners: Miner[];
  showTrajectories: boolean;
  timelinePosition: number;
}

export default function TrajectoryLayer({ miners, showTrajectories, timelinePosition }: TrajectoryLayerProps) {
  if (!showTrajectories) return null;

  const getTrajectoryColor = (status: string) => {
    switch (status) {
      case 'safe': return '#22c55e';
      case 'warning': return '#f97316';
      case 'danger': return '#ef4444';
      default: return '#22c55e';
    }
  };

  // Filter trajectory points based on timeline position
  const getFilteredTrajectory = (trajectory: Position[]) => {
    const cutoffIndex = Math.floor((timelinePosition / 100) * trajectory.length);
    return trajectory.slice(0, cutoffIndex + 1);
  };

  // Generate smooth SVG path using quadratic curves
  const generateSmoothPath = (points: Position[]): string => {
    if (points.length < 2) return '';
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    
    let d = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
    }
    
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;
    
    return d;
  };

  return (
    <g>
      {miners.map((miner) => {
        const filteredTrajectory = getFilteredTrajectory(miner.trajectory);
        if (filteredTrajectory.length < 2) return null;

        const color = getTrajectoryColor(miner.status);
        const smoothPath = generateSmoothPath(filteredTrajectory);

        return (
          <g key={`trajectory-${miner.id}`}>
            {/* Simple subtle trajectory line */}
            <path
              d={smoothPath}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeOpacity={0.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </g>
  );
}
