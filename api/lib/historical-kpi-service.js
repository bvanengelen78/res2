const { DatabaseService } = require('./supabase');
const { Logger } = require('./middleware');

// Standardized effective capacity calculation constant
const DEFAULT_NON_PROJECT_HOURS = 8;

class HistoricalKpiService {
  /**
   * Save current KPI snapshot to historical data
   */
  static async saveKpiSnapshot(kpiData, periodStartDate, periodEndDate, department = null) {
    try {
      const snapshotDate = new Date().toISOString().split('T')[0];
      
      const historicalKpiData = {
        snapshotDate,
        periodStartDate,
        periodEndDate,
        department,
        activeProjects: kpiData.activeProjects || 0,
        totalProjects: kpiData.totalProjects || 0,
        availableResources: kpiData.availableResources || 0,
        totalResources: kpiData.totalResources || 0,
        utilization: parseFloat(kpiData.utilization) || 0,
        conflicts: kpiData.conflicts || 0,
        forecastAccuracy: parseFloat(kpiData.forecastAccuracy) || 0,
        resourceHealthScore: kpiData.resourceHealthScore || 0,
        capacityConflictsCount: kpiData.capacityConflictsCount || 0
      };

      const savedSnapshot = await DatabaseService.saveHistoricalKpi(historicalKpiData);
      
      Logger.info('KPI snapshot saved successfully', {
        id: savedSnapshot.id,
        snapshotDate,
        period: `${periodStartDate} to ${periodEndDate}`,
        department: department || 'all'
      });

      return savedSnapshot;
    } catch (error) {
      Logger.error('Failed to save KPI snapshot', error);
      throw error;
    }
  }

  /**
   * Get historical trend data for a specific metric
   */
  static async getHistoricalTrendData(metricName, department = null, periodsCount = 7) {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (periodsCount * 7)); // Go back periodsCount weeks
      
      const historicalKpis = await DatabaseService.getHistoricalKpis({
        startDate: startDate.toISOString().split('T')[0],
        endDate,
        department
      });

      if (historicalKpis.length === 0) {
        Logger.warn('No historical KPI data found for trend generation');
        return [];
      }

      // Extract the specific metric values
      const trendData = historicalKpis
        .sort((a, b) => new Date(a.snapshotDate) - new Date(b.snapshotDate))
        .map(kpi => {
          switch (metricName) {
            case 'activeProjects':
              return kpi.activeProjects;
            case 'availableResources':
              return kpi.availableResources;
            case 'utilization':
              return parseFloat(kpi.utilization);
            case 'conflicts':
              return kpi.conflicts;
            case 'forecastAccuracy':
              return parseFloat(kpi.forecastAccuracy);
            case 'resourceHealthScore':
              return kpi.resourceHealthScore;
            default:
              return 0;
          }
        })
        .slice(-periodsCount); // Take the last periodsCount data points

      Logger.info('Historical trend data retrieved', {
        metricName,
        dataPoints: trendData.length,
        department: department || 'all'
      });

      return trendData;
    } catch (error) {
      Logger.error('Failed to get historical trend data', error);
      return [];
    }
  }

  /**
   * Get previous period value for comparison
   */
  static async getPreviousPeriodValue(metricName, department = null) {
    try {
      const latestSnapshot = await DatabaseService.getLatestHistoricalKpi(department);
      
      if (!latestSnapshot) {
        Logger.warn('No previous period data found');
        return 0;
      }

      switch (metricName) {
        case 'activeProjects':
          return latestSnapshot.activeProjects;
        case 'availableResources':
          return latestSnapshot.availableResources;
        case 'utilization':
          return parseFloat(latestSnapshot.utilization);
        case 'conflicts':
          return latestSnapshot.conflicts;
        case 'forecastAccuracy':
          return parseFloat(latestSnapshot.forecastAccuracy);
        case 'resourceHealthScore':
          return latestSnapshot.resourceHealthScore;
        default:
          return 0;
      }
    } catch (error) {
      Logger.error('Failed to get previous period value', error);
      return 0;
    }
  }

  /**
   * Check if we should save a new snapshot (daily snapshots)
   */
  static async shouldSaveSnapshot(department = null) {
    try {
      const latestSnapshot = await DatabaseService.getLatestHistoricalKpi(department);
      
      if (!latestSnapshot) {
        return true; // No snapshots exist, should save
      }

      const today = new Date().toISOString().split('T')[0];
      const latestDate = latestSnapshot.snapshotDate;

      // Save if we don't have a snapshot for today
      return latestDate !== today;
    } catch (error) {
      Logger.error('Failed to check if snapshot should be saved', error);
      return false;
    }
  }

  /**
   * Auto-save KPI snapshot if needed
   */
  static async autoSaveSnapshot(kpiData, periodStartDate, periodEndDate, department = null) {
    try {
      const shouldSave = await this.shouldSaveSnapshot(department);
      
      if (shouldSave) {
        return await this.saveKpiSnapshot(kpiData, periodStartDate, periodEndDate, department);
      } else {
        Logger.info('KPI snapshot already exists for today, skipping auto-save');
        return null;
      }
    } catch (error) {
      Logger.error('Failed to auto-save KPI snapshot', error);
      return null;
    }
  }
}

module.exports = { HistoricalKpiService };
