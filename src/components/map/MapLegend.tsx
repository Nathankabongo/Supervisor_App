export default function MapLegend() {
  const legendItems = [
    { label: 'Mineur actif', color: '#22c55e', icon: '👷' },
    { label: 'Déplacement', color: '#22c55e', type: 'line' },
    { label: 'Trajectoire', color: '#3b82f6', type: 'dashed' },
    { label: 'Alerte / Incident', color: '#ef4444', icon: '⚠️' },
    { label: 'Passerelle LoRa', color: '#06b6d4', icon: '📡' },
    { label: 'Zone / Galerie', color: '#a855f7', type: 'area' },
  ];

  return (
    <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-3">LÉGENDE</h3>
      <div className="space-y-2">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            {item.icon && (
              <span className="text-lg">{item.icon}</span>
            )}
            {item.type === 'line' && (
              <div className="w-8 h-1 rounded" style={{ backgroundColor: item.color }} />
            )}
            {item.type === 'dashed' && (
              <div className="w-8 h-1 rounded" style={{ 
                backgroundColor: item.color,
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, #1e293b 2px, #1e293b 4px)'
              }} />
            )}
            {item.type === 'area' && (
              <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color, opacity: 0.3 }} />
            )}
            {!item.type && !item.icon && (
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            )}
            <span className="text-xs text-gray-300">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
