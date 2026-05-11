import { useState, useEffect } from 'react';
import { Bluetooth, Wifi, Signal, Battery, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';

interface TWatchDevice {
  id: string;
  name: string;
  macAddress: string;
  status: 'connected' | 'disconnected' | 'pairing' | 'error';
  batteryLevel: number;
  signalStrength: number;
  lastSync?: Date;
}

interface TWatchConnectionProps {
  onDeviceConnected?: (device: TWatchDevice) => void;
  onDeviceDisconnected?: (deviceId: string) => void;
}

export default function TWatchConnection({ onDeviceConnected, onDeviceDisconnected }: TWatchConnectionProps) {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<TWatchDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<TWatchDevice | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'scanning' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Simuler la recherche de dispositifs
  const handleScan = () => {
    setScanning(true);
    setConnectionStatus('scanning');
    setErrorMessage('');

    // Simulation de découverte de dispositifs
    setTimeout(() => {
      const mockDevices: TWatchDevice[] = [
        {
          id: 'TW-001',
          name: 'T-Watch S3 Plus',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          status: 'disconnected',
          batteryLevel: 85,
          signalStrength: 92,
        },
        {
          id: 'TW-002',
          name: 'T-Watch S3',
          macAddress: '11:22:33:44:55:66',
          status: 'disconnected',
          batteryLevel: 67,
          signalStrength: 78,
        },
      ];
      setDevices(mockDevices);
      setScanning(false);
      setConnectionStatus('idle');
    }, 3000);
  };

  // Connecter à un dispositif
  const handleConnect = (device: TWatchDevice) => {
    setSelectedDevice(device);
    setConnectionStatus('connecting');
    setErrorMessage('');

    setTimeout(() => {
      const connectedDevice = {
        ...device,
        status: 'connected' as const,
        lastSync: new Date(),
      };
      
      setDevices(prev => prev.map(d => 
        d.id === device.id ? connectedDevice : d
      ));
      setSelectedDevice(connectedDevice);
      setConnectionStatus('connected');
      onDeviceConnected?.(connectedDevice);
    }, 2000);
  };

  // Déconnecter le dispositif
  const handleDisconnect = () => {
    if (selectedDevice) {
      setDevices(prev => prev.map(d => 
        d.id === selectedDevice.id ? { ...d, status: 'disconnected' as const } : d
      ));
      const disconnectedId = selectedDevice.id;
      setSelectedDevice(null);
      setConnectionStatus('idle');
      onDeviceDisconnected?.(disconnectedId);
    }
  };

  // Synchroniser les données
  const handleSync = () => {
    if (selectedDevice) {
      setConnectionStatus('connecting');
      setTimeout(() => {
        setDevices(prev => prev.map(d => 
          d.id === selectedDevice.id ? { ...d, lastSync: new Date() } : d
        ));
        setSelectedDevice(prev => prev ? { ...prev, lastSync: new Date() } : null);
        setConnectionStatus('connected');
      }, 1500);
    }
  };

  const getStatusIcon = (status: TWatchDevice['status']) => {
    switch (status) {
      case 'connected': return <CheckCircle size={16} className="text-green-400" />;
      case 'pairing': return <RefreshCw size={16} className="text-blue-400 animate-spin" />;
      case 'error': return <AlertCircle size={16} className="text-red-400" />;
      default: return <X size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bluetooth size={20} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Connexion T-Watch S3 Plus</h3>
        </div>
        {selectedDevice && (
          <button
            onClick={handleDisconnect}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Déconnecter
          </button>
        )}
      </div>

      {/* Connection Status */}
      <div className="mb-4 p-3 bg-[#0b1a2a] rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {connectionStatus === 'scanning' && <RefreshCw size={16} className="text-blue-400 animate-spin" />}
            {connectionStatus === 'connected' && <CheckCircle size={16} className="text-green-400" />}
            {connectionStatus === 'connecting' && <RefreshCw size={16} className="text-yellow-400 animate-spin" />}
            <span className="text-sm text-gray-300">
              {connectionStatus === 'idle' && 'En attente'}
              {connectionStatus === 'scanning' && 'Recherche en cours...'}
              {connectionStatus === 'connecting' && 'Connexion en cours...'}
              {connectionStatus === 'connected' && 'Connecté'}
              {connectionStatus === 'error' && 'Erreur de connexion'}
            </span>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning || connectionStatus === 'connected'}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
            Rechercher
          </button>
        </div>
        {errorMessage && (
          <p className="text-red-400 text-xs mt-2">{errorMessage}</p>
        )}
      </div>

      {/* Connected Device Info */}
      {selectedDevice && selectedDevice.status === 'connected' && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bluetooth size={18} className="text-green-400" />
              <div>
                <p className="text-white text-sm font-medium">{selectedDevice.name}</p>
                <p className="text-gray-400 text-xs">{selectedDevice.macAddress}</p>
              </div>
            </div>
            <button
              onClick={handleSync}
              className="p-1.5 bg-green-500 hover:bg-green-600 rounded text-white transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-2">
              <Battery size={14} className="text-gray-400" />
              <span className="text-xs text-gray-300">{selectedDevice.batteryLevel}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Signal size={14} className="text-gray-400" />
              <span className="text-xs text-gray-300">{selectedDevice.signalStrength}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi size={14} className="text-gray-400" />
              <span className="text-xs text-gray-300">
                {selectedDevice.lastSync && `Sync: ${selectedDevice.lastSync.toLocaleTimeString('fr-FR')}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Available Devices List */}
      {devices.length > 0 && !selectedDevice && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 mb-2">Dispositifs trouvés :</p>
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-3 bg-[#0b1a2a] rounded-lg hover:bg-[#1e3a5a] transition-colors cursor-pointer border border-transparent hover:border-gray-600"
            >
              <div className="flex items-center gap-3">
                <Bluetooth size={18} className="text-blue-400" />
                <div>
                  <p className="text-white text-sm font-medium">{device.name}</p>
                  <p className="text-gray-400 text-xs">{device.macAddress}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Battery size={12} className={device.batteryLevel < 20 ? 'text-red-400' : 'text-gray-400'} />
                  <span className="text-xs text-gray-400">{device.batteryLevel}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Signal size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-400">{device.signalStrength}%</span>
                </div>
                {getStatusIcon(device.status)}
                <button
                  onClick={() => handleConnect(device)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                >
                  Connecter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connection Info */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Wifi size={14} />
          <span>LoRa : 868 MHz (Actif)</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
          <Bluetooth size={14} />
          <span>Bluetooth : 5.0 (Disponible)</span>
        </div>
      </div>
    </div>
  );
}
