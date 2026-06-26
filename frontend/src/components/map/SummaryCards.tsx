import { Users, Shield, AlertTriangle, Map, Wifi } from 'lucide-react';

interface SummaryCardsProps {
  minersCount: number;
  totalMiners: number;
  securityStatus: string;
  alertsCount: number;
  activeZones: number;
  totalZones: number;
  gatewaysCount: number;
}

export default function SummaryCards({
  minersCount,
  totalMiners,
  securityStatus,
  alertsCount,
  activeZones,
  totalZones,
  gatewaysCount,
}: SummaryCardsProps) {
  const cards = [
    {
      title: 'Mineurs présents',
      value: `${minersCount} / ${totalMiners}`,
      subtitle: 'Actifs maintenant',
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Statut sécurité',
      value: securityStatus.toUpperCase(),
      subtitle: securityStatus === 'normal' ? 'Aucun danger' : 'Attention requise',
      icon: Shield,
      color: securityStatus === 'normal' ? 'text-green-400' : 'text-red-400',
      bgColor: securityStatus === 'normal' ? 'bg-green-500/10' : 'bg-red-500/10',
    },
    {
      title: 'Alertes actives',
      value: alertsCount.toString(),
      subtitle: 'Voir les détails',
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Zones actives',
      value: `${activeZones} / ${totalZones}`,
      subtitle: 'Zones opérationnelles',
      icon: Map,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Passerelles LoRa',
      value: gatewaysCount.toString(),
      subtitle: 'En ligne',
      icon: Wifi,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-[#1e293b] rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`${card.bgColor} p-2 rounded-lg`}>
              <card.icon size={20} className={card.color} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{card.value}</h3>
          <p className="text-xs text-gray-400 mb-2">{card.title}</p>
          <p className="text-xs text-gray-500">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
