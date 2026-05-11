import { useState, useEffect } from 'react';
import { Bluetooth, Wifi, Signal, Battery, RefreshCw, Plus, Edit2, Trash2, CheckCircle, XCircle, Activity } from 'lucide-react';
import TWatchConnection from '../components/TWatchConnection';
import { syncService } from '../services/syncService';
import apiService from '../services/api';

interface ConnectedDevice {
  id: string;
  name: string;
  type: 'twatch' | 'loragateway' | 'sensor';
  macAddress: string;
  status: 'connected' | 'disconnected' | 'error';
  batteryLevel: number;
  signalStrength: number;
  lastSync?: Date;
  zone?: string;
}

export default function Devices() {
  const [devices, setDevices] = useState<ConnectedDevice[]>([
    {
      id: 'TW-001',
      name: 'T-Watch S3 Plus - Mineur 1',
      type: 'twatch',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      status: 'connected',
      batteryLevel: 85,
      signalStrength: 92,
      lastSync: new Date(),
      zone: 'ZONE A',
    },
    {
      id: 'TW-002',
      name: 'T-Watch S3 Plus - Mineur 2',
      type: 'twatch',
      macAddress: '11:22:33:44:55:66',
      status: 'connected',
      batteryLevel: 67,
      signalStrength: 78,
      lastSync: new Date(Date.now() - 300000),
      zone: 'ZONE B',
    },
    {
      id: 'GW-001',
      name: 'Passerelle LoRa A1',
      type: 'loragateway',
      macAddress: '22:33:44:55:66:77',
      status: 'connected',
      batteryLevel: 92,
      signalStrength: 95,
      lastSync: new Date(),
      zone: 'ZONE A',
    },
    {
      id: 'GW-002',
      name: 'Passerelle LoRa B1',
      type: 'loragateway',
      macAddress: '33:44:55:66:77:88',
      status: 'connected',
      batteryLevel: 88,
      signalStrength: 91,
      lastSync: new Date(Date.now() - 600000),
      zone: 'ZONE B',
    },
  ]);

  const [selectedDevice, setSelectedDevice] = useState<ConnectedDevice | null>(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loraMode, setLoraMode] = useState<'simulator' | 'real'>('simulator');

  // Fetch LoRa status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await apiService.getLoraStatus();
        setLoraMode(status.simulatorActive ? 'simulator' : 'real');
      } catch {}
    };
    fetchStatus();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      const result = await apiService.scanLoraDevices();
      if (result.devices?.length > 0) {
        const newDevices: ConnectedDevice[] = result.devices.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: 'twatch' as const,
          macAddress: d.id,
          status: 'disconnected' as const,
          batteryLevel: d.battery || 0,
          signalStrength: Math.max(0, 100 + d.rssi),
          zone: d.zone || '',
        }));
        // Add only new devices not already in list
        setDevices(prev => {
          const existingIds = new Set(prev.map(d => d.id));
          const toAdd = newDevices.filter(d => !existingIds.has(d.id));
          return [...prev, ...toAdd];
        });
      }
    } catch (err) {
      console.error('Erreur scan:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleSync = async (deviceId: string) => {
    try {
      await apiService.sendLoraCommand(deviceId, 'sync');
      const result = await syncService.manualSync(deviceId);
      setDevices(prev => prev.map(d => 
        d.id === deviceId 
          ? { ...d, lastSync: new Date(result.timestamp) }
          : d
      ));
    } catch (err) {
      console.error('Erreur sync:', err);
    }
  };

  const handleConnect = async (deviceId: string) => {
    try {
      await apiService.connectLoraDevice(deviceId);
      setDevices(prev => prev.map(d =>
        d.id === deviceId
          ? { ...d, status: 'connected' as const, lastSync: new Date() }
          : d
      ));
    } catch (err) {
      console.error('Erreur connexion:', err);
    }
  };

  const handleDisconnect = async (deviceId: string) => {
    try {
      await apiService.disconnectLoraDevice(deviceId);
      setDevices(prev => prev.map(d =>
        d.id === deviceId
          ? { ...d, status: 'disconnected' as const, lastSync: undefined }
          : d
      ));
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    }
  };

  const handleToggleMode = async () => {
    const newMode = loraMode === 'simulator' ? 'real' : 'simulator';
    try {
      await apiService.toggleLoraMode(newMode === 'simulator');
      setLoraMode(newMode);
    } catch (err) {
      console.error('Erreur toggle mode:', err);
    }
  };

  const handleDelete = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice(null);
    }
  };

  const getStatusIcon = (status: ConnectedDevice['status']) => {
    switch (status) {
      case 'connected': return <CheckCircle size={16} className="text-green-400" />;
      case 'error': return <XCircle size={16} className="text-red-400" />;
      default: return <XCircle size={16} className="text-gray-400" />;
    }
  };

  const getTypeIcon = (type: ConnectedDevice['type']) => {
    switch (type) {
      case 'twatch': return <Bluetooth size={18} className="text-blue-400" />;
      case 'loragateway': return <Wifi size={18} className="text-cyan-400" />;
      default: return <Signal size={18} className="text-gray-400" />;
    }
  };

  const getTypeLabel = (type: ConnectedDevice['type']) => {
    switch (type) {
      case 'twatch': return 'T-Watch';
      case 'loragateway': return 'Passerelle LoRa';
      default: return 'Capteur';
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Appareils Connectés</h1>
          <p className="text-sm text-gray-400">Gestion des T-Watch et passerelles LoRa</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className={`flex items-center gap-2 px-4 py-2 text-white text-sm rounded font-medium transition-colors ${
              scanning ? 'bg-gray-600 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-600'
            }`}
          >
            <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scan en cours...' : 'Scanner LoRa'}
          </button>
          <button
            onClick={handleToggleMode}
            className={`flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
              loraMode === 'simulator' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
            }`}
          >
            {loraMode === 'simulator' ? 'Simulateur' : 'Temps réel'}
          </button>
          <button
            onClick={() => setShowAddDevice(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-medium transition-colors"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded flex items-center justify-center">
            <CheckCircle size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-white text-lg font-bold">{devices.filter(d => d.status === 'connected').length}</p>
            <p className="text-gray-400 text-xs">Connectés</p>
          </div>
        </div>
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded flex items-center justify-center">
            <Bluetooth size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white text-lg font-bold">{devices.filter(d => d.type === 'twatch').length}</p>
            <p className="text-gray-400 text-xs">T-Watch</p>
          </div>
        </div>
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 rounded flex items-center justify-center">
            <Wifi size={20} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-white text-lg font-bold">{devices.filter(d => d.type === 'loragateway').length}</p>
            <p className="text-gray-400 text-xs">Passerelles</p>
          </div>
        </div>
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/20 rounded flex items-center justify-center">
            <Activity size={20} className="text-orange-400" />
          </div>
          <div>
            <p className="text-white text-lg font-bold">{devices.filter(d => d.batteryLevel < 30).length}</p>
            <p className="text-gray-400 text-xs">Batterie faible</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Devices List */}
        <div className="col-span-2 space-y-3">
          <h3 className="text-sm font-medium text-white">Liste des appareils</h3>
          <div className="space-y-2">
            {devices.map(device => (
              <div
                key={device.id}
                className={`bg-[#1e293b] rounded-lg border p-4 cursor-pointer transition-colors ${
                  selectedDevice?.id === device.id ? 'border-green-500' : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => setSelectedDevice(device)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(device.type)}
                    <div>
                      <p className="text-white text-sm font-medium">{device.name}</p>
                      <p className="text-gray-400 text-xs">{device.macAddress} • {getTypeLabel(device.type)}</p>
                    </div>
                  </div>
                  {getStatusIcon(device.status)}
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <Battery size={14} className={device.batteryLevel < 20 ? 'text-red-400' : 'text-gray-400'} />
                    <span className="text-xs text-gray-300">{device.batteryLevel}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Signal size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-300">{device.signalStrength}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wifi size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-300">{device.zone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-300">
                      {device.lastSync ? device.lastSync.toLocaleTimeString('fr-FR') : 'Jamais'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
                  {device.status === 'connected' ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSync(device.id); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 text-xs rounded hover:bg-green-500/30 transition-colors"
                      >
                        <RefreshCw size={12} />
                        Sync
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDisconnect(device.id); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/20 text-orange-400 text-xs rounded hover:bg-orange-500/30 transition-colors"
                      >
                        Déconnecter
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleConnect(device.id); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 text-xs rounded hover:bg-cyan-500/30 transition-colors"
                    >
                      <Wifi size={12} />
                      Connecter
                    </button>
                  )}
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 text-xs rounded hover:bg-blue-500/30 transition-colors">
                    <Edit2 size={12} />
                    Modifier
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(device.id); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 size={12} />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Details / Add Device */}
        <div className="space-y-3">
          {showAddDevice ? (
            <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4">
              <h3 className="text-sm font-medium text-white mb-4">Ajouter un appareil</h3>
              <TWatchConnection />
              <button
                onClick={() => setShowAddDevice(false)}
                className="w-full mt-3 px-3 py-2 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
            </div>
          ) : selectedDevice ? (
            <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4">
              <h3 className="text-sm font-medium text-white mb-4">Détails de l'appareil</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  {getTypeIcon(selectedDevice.type)}
                  <div>
                    <p className="text-white font-medium">{selectedDevice.name}</p>
                    <p className="text-gray-400 text-xs">{selectedDevice.macAddress}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Statut</span>
                    <span className={`text-xs ${selectedDevice.status === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedDevice.status === 'connected' ? 'Connecté' : 'Déconnecté'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Type</span>
                    <span className="text-white text-xs">{getTypeLabel(selectedDevice.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Zone</span>
                    <span className="text-white text-xs">{selectedDevice.zone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Batterie</span>
                    <span className={`text-xs ${selectedDevice.batteryLevel < 20 ? 'text-red-400' : 'text-white'}`}>
                      {selectedDevice.batteryLevel}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Signal</span>
                    <span className="text-white text-xs">{selectedDevice.signalStrength}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Dernière synchro</span>
                    <span className="text-white text-xs">
                      {selectedDevice.lastSync ? selectedDevice.lastSync.toLocaleString('fr-FR') : 'Jamais'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-700 space-y-2">
                  {selectedDevice.status === 'connected' ? (
                    <>
                      <button
                        onClick={() => handleSync(selectedDevice.id)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                      >
                        <RefreshCw size={14} />
                        Synchroniser maintenant
                      </button>
                      <button
                        onClick={() => handleDisconnect(selectedDevice.id)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                      >
                        Déconnecter
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(selectedDevice.id)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500 text-white text-xs rounded hover:bg-cyan-600 transition-colors"
                    >
                      <Wifi size={14} />
                      Connecter via LoRa
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedDevice(null)}
                    className="w-full px-3 py-2 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-8 flex flex-col items-center justify-center text-center">
              <Bluetooth size={48} className="text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm">Sélectionnez un appareil pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
