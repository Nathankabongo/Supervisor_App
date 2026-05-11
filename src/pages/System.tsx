import { Server, Wifi, Database, Cpu, HardDrive, Activity, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function SystemPage() {
  const { miners } = useStore();

  const gateways = [
    { id: 'GW-001', name: 'Passerelle A1', zone: 'ZONE A', status: 'online', signal: 98, battery: 85 },
    { id: 'GW-002', name: 'Passerelle B1', zone: 'ZONE B', status: 'online', signal: 95, battery: 92 },
    { id: 'GW-003', name: 'Passerelle C1', zone: 'ZONE C', status: 'online', signal: 97, battery: 78 },
    { id: 'GW-004', name: 'Passerelle D1', zone: 'ZONE D', status: 'online', signal: 91, battery: 65 },
    { id: 'GW-005', name: 'Passerelle E1', zone: 'ZONE E', status: 'online', signal: 89, battery: 70 },
    { id: 'GW-006', name: 'Passerelle F1', zone: 'ZONE F', status: 'online', signal: 94, battery: 88 },
  ];

  const systemMetrics = [
    { label: 'CPU Serveur', value: 23, max: 100, unit: '%', color: 'bg-green-500' },
    { label: 'Mémoire RAM', value: 4.2, max: 16, unit: 'GB', color: 'bg-blue-500' },
    { label: 'Stockage', value: 128, max: 500, unit: 'GB', color: 'bg-purple-500' },
    { label: 'Réseau', value: 12, max: 100, unit: 'Mbps', color: 'bg-cyan-500' },
  ];

  const services = [
    { name: 'Service de localisation', status: 'running', uptime: '99.98%', version: 'v2.4.1' },
    { name: 'Service d\'alertes', status: 'running', uptime: '99.95%', version: 'v1.8.3' },
    { name: 'Base de données temps réel', status: 'running', uptime: '99.99%', version: 'v3.1.0' },
    { name: 'Service de trajectoires', status: 'running', uptime: '99.90%', version: 'v1.2.5' },
    { name: 'API LoRa', status: 'running', uptime: '99.97%', version: 'v2.0.2' },
    { name: 'Service de notifications', status: 'running', uptime: '99.85%', version: 'v1.5.1' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Système</h1>
        <p className="text-sm text-gray-400">État de l'infrastructure et des services</p>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded flex items-center justify-center">
            <CheckCircle size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-white text-lg font-bold">{gateways.filter(g => g.status === 'online').length}/{gateways.length}</p>
            <p className="text-gray-400 text-xs">Passerelles</p>
          </div>
        </div>
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded flex items-center justify-center">
            <Activity size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white text-lg font-bold">{miners.length}</p>
            <p className="text-gray-400 text-xs">Capteurs actifs</p>
          </div>
        </div>
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded flex items-center justify-center">
            <Database size={20} className="text-purple-400" />
          </div>
          <div>
            <p className="text-white text-lg font-bold">2.4 TB</p>
            <p className="text-gray-400 text-xs">Données stockées</p>
          </div>
        </div>
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 rounded flex items-center justify-center">
            <Cpu size={20} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-white text-lg font-bold">99.97%</p>
            <p className="text-gray-400 text-xs">Disponibilité</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Server Metrics */}
        <div className="bg-[#1e293b] rounded border border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Server size={18} className="text-green-400" />
            <h3 className="text-sm font-medium text-white">Métriques serveur</h3>
          </div>
          <div className="space-y-4">
            {systemMetrics.map(metric => (
              <div key={metric.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-300 text-xs">{metric.label}</span>
                  <span className="text-white text-xs font-medium">{metric.value} {metric.unit}</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${metric.color} rounded-full transition-all`}
                    style={{ width: `${(metric.value / metric.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LoRa Gateways */}
        <div className="bg-[#1e293b] rounded border border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Wifi size={18} className="text-cyan-400" />
            <h3 className="text-sm font-medium text-white">Passerelles LoRa</h3>
          </div>
          <div className="space-y-2">
            {gateways.map(gw => (
              <div key={gw.id} className="flex items-center gap-3 px-3 py-2 bg-[#0f172a] rounded">
                <span className={`w-2 h-2 rounded-full ${gw.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1">
                  <p className="text-white text-xs font-medium">{gw.name}</p>
                  <p className="text-gray-500 text-[10px]">{gw.zone}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Wifi size={10} className="text-gray-400" />
                    <span className="text-green-400 text-[10px]">{gw.signal}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <HardDrive size={10} className="text-gray-400" />
                    <span className={`${gw.battery < 70 ? 'text-orange-400' : 'text-green-400'} text-[10px]`}>{gw.battery}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-[#1e293b] rounded border border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-orange-400" />
          <h3 className="text-sm font-medium text-white">État des services</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {services.map(service => (
            <div key={service.name} className="flex items-center gap-3 px-3 py-2.5 bg-[#0f172a] rounded">
              {service.status === 'running' ? (
                <CheckCircle size={16} className="text-green-400" />
              ) : (
                <XCircle size={16} className="text-red-400" />
              )}
              <div className="flex-1">
                <p className="text-white text-xs font-medium">{service.name}</p>
                <p className="text-gray-500 text-[10px]">{service.version}</p>
              </div>
              <span className="text-green-400 text-[10px]">{service.uptime}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
