import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Wifi } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  responseTime?: number;
  error?: string;
}

interface VISHealthResponse {
  vis: HealthStatus;
  database: HealthStatus;
  cache: HealthStatus;
  overall: HealthStatus;
}

const VISHealthStatus: React.FC = () => {
  const [healthData, setHealthData] = useState<VISHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health/vis');
      const data = await response.json();
      setHealthData(data);
      setLastUpdate(new Date());
    } catch (error) {
      // Log error appropriately in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch health status:', error);
      }
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchHealthStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
        <Clock className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-600">Checking VIS status...</span>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-600">Unable to check VIS status</span>
      </div>
    );
  }

  const { overall, vis, cache } = healthData;

  return (
    <div className="space-y-3">
      {/* Overall Status */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(overall.status)}`}>
        <div className="flex items-center space-x-2">
          <Wifi className="h-5 w-5" />
          <div>
            <div className="font-medium">VIS Connection</div>
            <div className="text-xs opacity-75 capitalize">{overall.status}</div>
          </div>
        </div>
        <div className="text-right">
          {getStatusIcon(overall.status)}
          {overall.responseTime && (
            <div className="text-xs mt-1">
              {overall.responseTime}ms
            </div>
          )}
        </div>
      </div>

      {/* Detailed Status */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`p-2 rounded border text-xs ${getStatusColor(vis.status)}`}>
          <div className="flex items-center justify-between">
            <span>VIS API</span>
            {getStatusIcon(vis.status)}
          </div>
          {vis.responseTime && (
            <div className="mt-1 opacity-75">{vis.responseTime}ms</div>
          )}
        </div>
        
        <div className={`p-2 rounded border text-xs ${getStatusColor(cache.status)}`}>
          <div className="flex items-center justify-between">
            <span>Cache</span>
            {getStatusIcon(cache.status)}
          </div>
        </div>
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <div className="text-xs text-gray-500 text-center">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={fetchHealthStatus}
        className="w-full text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        disabled={loading}
      >
        Refresh Status
      </button>
    </div>
  );
};

export default VISHealthStatus;