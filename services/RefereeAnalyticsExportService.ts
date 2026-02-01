/**
 * Referee Analytics Export Service
 * Enhanced export and reporting functionality for referee performance data
 * Story 4.2: Referee Performance Analytics - Task 5
 */

import { RefereePerformanceMetrics } from '../hooks/useRefereeAnalytics';
import { ErrorLogger } from './ErrorLogger';

/**
 * Export format types
 */
export type ExportFormat = 'csv' | 'json' | 'pdf';

/**
 * Report template configuration
 */
export interface ReportTemplate {
  name: string;
  description: string;
  includeColumns: string[];
  sortBy: keyof RefereePerformanceMetrics;
  groupBy?: 'federation' | 'performance_level' | 'workload_level';
  includeCharts?: boolean;
  includeSummary?: boolean;
}

/**
 * Export configuration
 */
export interface ExportConfig {
  filename?: string;
  template?: ReportTemplate;
  filters?: {
    minPerformanceScore?: number;
    maxPerformanceScore?: number;
    federationCodes?: string[];
    includeInactive?: boolean;
  };
  metadata?: {
    title: string;
    description: string;
    generatedBy: string;
    generatedAt: string;
  };
}

/**
 * Predefined report templates
 */
export const REPORT_TEMPLATES: Record<string, ReportTemplate> = {
  performance_summary: {
    name: 'Performance Summary',
    description: 'Comprehensive performance overview for all referees',
    includeColumns: [
      'referee_name', 'federation_code', 'performance_score', 
      'total_assignments', 'completion_rate', 'tournaments_worked'
    ],
    sortBy: 'performance_score',
    includeSummary: true,
  },
  
  workload_analysis: {
    name: 'Workload Analysis',
    description: 'Detailed workload distribution and trends',
    includeColumns: [
      'referee_name', 'federation_code', 'avg_matches_per_day', 
      'workload_trend', 'total_assignments', 'first_referee_count',
      'second_referee_count', 'challenge_referee_count'
    ],
    sortBy: 'avg_matches_per_day',
    groupBy: 'workload_level',
    includeSummary: true,
  },

  federation_comparison: {
    name: 'Federation Comparison',
    description: 'Performance comparison by federation',
    includeColumns: [
      'referee_name', 'federation_code', 'performance_score',
      'total_assignments', 'tournaments_worked'
    ],
    sortBy: 'performance_score',
    groupBy: 'federation',
    includeCharts: true,
    includeSummary: true,
  },

  top_performers: {
    name: 'Top Performers',
    description: 'Detailed report of highest performing referees',
    includeColumns: [
      'referee_name', 'federation_code', 'performance_score',
      'total_assignments', 'completion_rate', 'tournaments_worked',
      'geographic_coverage', 'workload_trend'
    ],
    sortBy: 'performance_score',
    includeSummary: true,
  },

  assignment_overview: {
    name: 'Assignment Overview',
    description: 'Comprehensive assignment statistics and role distribution',
    includeColumns: [
      'referee_name', 'total_assignments', 'first_referee_count',
      'second_referee_count', 'challenge_referee_count', 
      'completion_rate', 'avg_matches_per_day'
    ],
    sortBy: 'total_assignments',
    includeCharts: true,
    includeSummary: true,
  },
};

/**
 * RefereeAnalyticsExportService
 * Handles export and reporting functionality for referee analytics
 */
export class RefereeAnalyticsExportService {
  private static instance: RefereeAnalyticsExportService | null = null;
  private errorLogger: ErrorLogger;

  private constructor() {
    this.errorLogger = ErrorLogger.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RefereeAnalyticsExportService {
    if (!RefereeAnalyticsExportService.instance) {
      RefereeAnalyticsExportService.instance = new RefereeAnalyticsExportService();
    }
    return RefereeAnalyticsExportService.instance;
  }

  /**
   * Export referee analytics data
   */
  async exportAnalytics(
    data: RefereePerformanceMetrics[],
    format: ExportFormat,
    config?: ExportConfig
  ): Promise<Blob> {
    try {
      const startTime = performance.now();

      // Apply filters if specified
      let filteredData = this.applyFilters(data, config?.filters);

      // Apply template if specified
      if (config?.template) {
        filteredData = this.applyTemplate(filteredData, config.template);
      }

      let blob: Blob;
      const filename = config?.filename || `referee-analytics-${Date.now()}`;

      switch (format) {
        case 'csv':
          blob = await this.exportToCSV(filteredData, config);
          break;
        case 'json':
          blob = await this.exportToJSON(filteredData, config);
          break;
        case 'pdf':
          blob = await this.exportToPDF(filteredData, config);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }


      return blob;
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'referee_analytics_export',
        error: error as Error,
        context: { format, config, recordCount: data.length }
      });
      throw error;
    }
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    data: RefereePerformanceMetrics[],
    config?: ExportConfig
  ): Promise<Blob> {
    const template = config?.template || REPORT_TEMPLATES.performance_summary;
    
    // Build CSV headers
    const headers = template.includeColumns.map(col => 
      col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    );

    // Add metadata header if specified
    let csvContent = '';
    if (config?.metadata) {
      csvContent += `# ${config.metadata.title}\n`;
      csvContent += `# ${config.metadata.description}\n`;
      csvContent += `# Generated by: ${config.metadata.generatedBy}\n`;
      csvContent += `# Generated at: ${config.metadata.generatedAt}\n`;
      csvContent += `# Total records: ${data.length}\n\n`;
    }

    csvContent += headers.join(',') + '\n';

    // Build CSV rows
    const rows = data.map(referee => {
      return template.includeColumns.map(column => {
        let value: any = referee[column as keyof RefereePerformanceMetrics];
        
        // Handle array values
        if (Array.isArray(value)) {
          value = value.join(';');
        }
        
        // Handle null/undefined values
        if (value === null || value === undefined) {
          value = '';
        }
        
        // Escape commas and quotes in CSV
        if (typeof value === 'string') {
          value = value.includes(',') || value.includes('"') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }
        
        return value;
      }).join(',');
    });

    csvContent += rows.join('\n');

    // Add summary section if requested
    if (template.includeSummary) {
      csvContent += '\n\n# SUMMARY STATISTICS\n';
      const summary = this.calculateSummaryStatistics(data);
      csvContent += `Total Referees,${summary.totalReferees}\n`;
      csvContent += `Total Assignments,${summary.totalAssignments}\n`;
      csvContent += `Average Performance Score,${summary.avgPerformanceScore}%\n`;
      csvContent += `Average Workload,${summary.avgWorkload} matches/day\n`;
      csvContent += `Active Referees,${summary.activeReferees}\n`;
    }

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(
    data: RefereePerformanceMetrics[],
    config?: ExportConfig
  ): Promise<Blob> {
    const template = config?.template || REPORT_TEMPLATES.performance_summary;
    
    // Filter data to include only specified columns
    let processedData: any[] = data;
    
    if (template.includeColumns.length > 0) {
      processedData = data.map(referee => {
        const filtered: any = {};
        template.includeColumns.forEach(column => {
          filtered[column] = referee[column as keyof RefereePerformanceMetrics];
        });
        return filtered;
      });
    }

    // Group data if specified
    if (template.groupBy) {
      processedData = this?.groupData(processedData, template.groupBy);
    }

    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        template: template.name,
        totalRecords: data.length,
        ...config?.metadata,
      },
      summary: template.includeSummary ? this.calculateSummaryStatistics(data) : undefined,
      data: processedData,
    };

    return new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
  }

  /**
   * Export to PDF format (simplified implementation)
   * In a real implementation, this would use a PDF generation library
   */
  private async exportToPDF(
    data: RefereePerformanceMetrics[],
    config?: ExportConfig
  ): Promise<Blob> {
    const template = config?.template || REPORT_TEMPLATES.performance_summary;
    
    // Generate HTML content for PDF conversion
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${template.name}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 18px; font-weight: bold; color: #333; }
          .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
          .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .metadata { font-size: 10px; color: #888; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${template.name}</div>
          <div class="subtitle">${template.description}</div>
          ${config?.metadata ? `<div class="metadata">Generated by ${config.metadata.generatedBy} at ${config.metadata.generatedAt}</div>` : ''}
        </div>
    `;

    // Add summary section
    if (template.includeSummary) {
      const summary = this.calculateSummaryStatistics(data);
      htmlContent += `
        <div class="summary">
          <h3>Summary Statistics</h3>
          <p><strong>Total Referees:</strong> ${summary.totalReferees}</p>
          <p><strong>Total Assignments:</strong> ${summary.totalAssignments}</p>
          <p><strong>Average Performance Score:</strong> ${summary.avgPerformanceScore}%</p>
          <p><strong>Average Workload:</strong> ${summary.avgWorkload} matches/day</p>
          <p><strong>Active Referees:</strong> ${summary.activeReferees}</p>
        </div>
      `;
    }

    // Add data table
    htmlContent += '<table><thead><tr>';
    
    template.includeColumns.forEach(column => {
      const header = column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      htmlContent += `<th>${header}</th>`;
    });
    
    htmlContent += '</tr></thead><tbody>';
    
    data.forEach(referee => {
      htmlContent += '<tr>';
      template.includeColumns.forEach(column => {
        let value: any = referee[column as keyof RefereePerformanceMetrics];
        if (Array.isArray(value)) {
          value = value.join(', ');
        }
        if (value === null || value === undefined) {
          value = '';
        }
        htmlContent += `<td>${value}</td>`;
      });
      htmlContent += '</tr>';
    });

    htmlContent += '</tbody></table></body></html>';

    // Note: In a real implementation, this would convert HTML to PDF using a library like Puppeteer
    // For now, return HTML blob that can be printed as PDF by the browser
    return new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  }

  /**
   * Apply data filters
   */
  private applyFilters(
    data: RefereePerformanceMetrics[],
    filters?: ExportConfig['filters']
  ): RefereePerformanceMetrics[] {
    if (!filters) return data;

    return data.filter(referee => {
      // Performance score filter
      if (filters.minPerformanceScore !== undefined && 
          referee.performance_score < filters.minPerformanceScore) {
        return false;
      }
      
      if (filters.maxPerformanceScore !== undefined && 
          referee.performance_score > filters.maxPerformanceScore) {
        return false;
      }

      // Federation filter
      if (filters.federationCodes && filters.federationCodes.length > 0 &&
          !filters.federationCodes.includes(referee.federation_code)) {
        return false;
      }

      // Activity filter (inactive = 0 assignments)
      if (!filters.includeInactive && referee.total_assignments === 0) {
        return false;
      }

      return true;
    });
  }

  /**
   * Apply report template
   */
  private applyTemplate(
    data: RefereePerformanceMetrics[],
    template: ReportTemplate
  ): RefereePerformanceMetrics[] {
    // Sort data
    const sortedData = [...data].sort((a, b) => {
      const aValue = a[template.sortBy];
      const bValue = b[template.sortBy];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return bValue - aValue; // Descending order
      }
      
      if (Array.isArray(aValue) && Array.isArray(bValue)) {
        return bValue.length - aValue.length;
      }
      
      return 0;
    });

    return sortedData;
  }

  /**
   * Group data by specified field
   */
  private groupData(data: any[], groupBy: string): any {
    const grouped = data.reduce((groups, item) => {
      let key: string;
      
      switch (groupBy) {
        case 'federation':
          key = item.federation_code || 'Unknown';
          break;
        case 'performance_level':
          key = item.performance_score >= 80 ? 'High' :
               item.performance_score >= 60 ? 'Medium' : 'Low';
          break;
        case 'workload_level':
          key = item.avg_matches_per_day > 3 ? 'High' :
               item.avg_matches_per_day > 1 ? 'Medium' : 'Low';
          break;
        default:
          key = 'All';
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      
      return groups;
    }, {} as Record<string, any[]>);

    return grouped;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummaryStatistics(data: RefereePerformanceMetrics[]) {
    const totalReferees = data.length;
    const totalAssignments = data.reduce((sum, r) => sum + r.total_assignments, 0);
    const avgPerformanceScore = totalReferees > 0 
      ? Math.round(data.reduce((sum, r) => sum + r.performance_score, 0) / totalReferees)
      : 0;
    const avgWorkload = totalReferees > 0 
      ? Math.round((data.reduce((sum, r) => sum + r.avg_matches_per_day, 0) / totalReferees) * 100) / 100
      : 0;
    const activeReferees = data.filter(r => r.total_assignments > 0).length;

    return {
      totalReferees,
      totalAssignments,
      avgPerformanceScore,
      avgWorkload,
      activeReferees,
    };
  }

  /**
   * Get available report templates
   */
  public getAvailableTemplates(): Record<string, ReportTemplate> {
    return REPORT_TEMPLATES;
  }

  /**
   * Create custom template
   */
  public createCustomTemplate(
    name: string,
    config: Partial<ReportTemplate>
  ): ReportTemplate {
    return {
      name,
      description: config.description || `Custom template: ${name}`,
      includeColumns: config.includeColumns || [
        'referee_name', 'federation_code', 'performance_score', 'total_assignments'
      ],
      sortBy: config.sortBy || 'performance_score',
      ...config,
    };
  }
}

export default RefereeAnalyticsExportService;