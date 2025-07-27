import React, { useState, useEffect } from 'react';
import { Activity, Database, Zap, Clock } from 'lucide-react';
import VISHealthStatus from './VISHealthStatus';

interface MonitoringData {
  timestamp: string;
  service: {
    name: string;
    version: string;
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    environment: string;
  };
  vis: {
    status: string;
    responseTime?: number;
    lastCheck: string;
    error?: string;
  };
  cache: {
    status: string;
    stats: {
      keys: number;
      hits: number;
      misses: number;
    };
    hitRate: string;
  };
  performance: {
    averageResponseTime: number;
    requestsPerMinute: number;
    errorRate: string;
  };
}

const MonitoringDashboard: React.FC = () => {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMonitoringData = async () => {
    try {
      const response = await fetch('/api/health/monitoring');
      const data = await response.json();
      setMonitoringData(data);
    } catch (error) {
      // Log error appropriately in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch monitoring data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    
    // Poll every 10 seconds
    const interval = setInterval(fetchMonitoringData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes: number): string => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!monitoringData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center text-gray-500">
          Unable to load monitoring data
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">System Monitoring</h2>
        <div className="text-sm text-gray-600">
          {monitoringData.service.name} v{monitoringData.service.version} • 
          Environment: {monitoringData.service.environment} • 
          Uptime: {formatUptime(monitoringData.service.uptime)}
        </div>
      </div>

      {/* VIS Health Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">VIS API Status</h3>
        <VISHealthStatus />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Performance */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {monitoringData.performance.averageResponseTime}ms
              </p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        {/* Cache Performance */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {monitoringData.cache.hitRate}
              </p>
              <p className="text-xs text-gray-500">
                {monitoringData.cache.stats.keys} keys
              </p>
            </div>
            <Database className="h-8 w-8 text-green-500" />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatMemory(monitoringData.service.memory.heapUsed)}
              </p>
              <p className="text-xs text-gray-500">
                / {formatMemory(monitoringData.service.memory.heapTotal)}
              </p>
            </div>
            <Activity className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {monitoringData.performance.errorRate}
              </p>
            </div>
            <Zap className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(monitoringData.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default MonitoringDashboard;