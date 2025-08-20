# KPI Calculation Documentation

## Overview

This document provides comprehensive documentation for all KPI calculation formulas, data sources, business logic, and implementation details in the Resource Planning Tracker dashboard.

## Core Constants

### Effective Capacity Calculation
```javascript
const DEFAULT_NON_PROJECT_HOURS = 8; // Hours per week for meetings, admin, etc.
```

**Business Logic**: Resources have a total weekly capacity, but not all hours are available for project work. The default 8 hours per week accounts for meetings, administration, training, and other non-project activities.

## KPI Metrics

### 1. Active Projects Count

**Formula**: Count of projects with status = 'active' within the selected period

**Data Sources**:
- Table: `projects`
- Fields: `id`, `name`, `status`, `start_date`, `end_date`

**Period Filtering Logic**:
```javascript
// Project is active in period if:
// 1. status === 'active' AND
// 2. project date range overlaps with filter period
isProjectActiveInPeriod(project, startDate, endDate) {
  return project.status === 'active' && 
         dateRangeOverlaps(project.startDate, project.endDate, startDate, endDate);
}
```

**Business Logic**: Only projects that are both marked as active AND have date ranges that overlap with the selected dashboard period are counted.

### 2. Available Resources Count

**Formula**: Count of active resources with utilization < 100% in the selected period

**Data Sources**:
- Table: `resources` (capacity data)
- Table: `resource_allocations` (allocation data)

**Calculation Steps**:
1. Calculate effective capacity per resource: `weeklyCapacity - DEFAULT_NON_PROJECT_HOURS`
2. Sum allocated hours from period-filtered allocations
3. Calculate utilization: `(totalAllocatedHours / effectiveCapacity) * 100`
4. Count resources where `isActive = true` AND `utilization < 100%`

**Business Logic**: A resource is considered "available" if they have remaining capacity (under 100% utilization) during the selected period.

### 3. Resource Utilization Percentage

**Formula**: `(totalAllocatedHours / totalEffectiveCapacity) * 100`

**Data Sources**:
- Table: `resources` (capacity data)
- Table: `resource_allocations` (allocation data)

**Calculation Steps**:
1. Calculate total effective capacity: `Σ(weeklyCapacity - DEFAULT_NON_PROJECT_HOURS)` for active resources
2. Calculate total allocated hours from period-filtered allocations
3. Apply formula: `(totalAllocated / totalEffectiveCapacity) * 100`

**Allocation Hours Logic**:
```javascript
// Priority order for allocation hours:
if (allocation.allocatedHours > 0) {
  return parseFloat(allocation.allocatedHours);
} else if (allocation.weeklyAllocations) {
  return Object.values(allocation.weeklyAllocations)
    .reduce((sum, hours) => sum + parseFloat(hours), 0);
}
```

### 4. Capacity Conflicts Count

**Formula**: Count of active resources with utilization > 100% in the selected period

**Data Sources**:
- Table: `resources` (capacity data)
- Table: `resource_allocations` (allocation data)

**Calculation Steps**:
1. Calculate utilization per resource (same as Available Resources)
2. Count resources where `isActive = true` AND `utilization > 100%`

**Business Logic**: A conflict occurs when a resource is allocated more hours than their effective capacity allows.

## Period-Aware Filtering

### Date Range Overlap Logic
```javascript
dateRangeOverlaps(itemStartDate, itemEndDate, filterStartDate, filterEndDate) {
  const itemStart = new Date(itemStartDate);
  const itemEnd = new Date(itemEndDate);
  const filterStart = new Date(filterStartDate);
  const filterEnd = new Date(filterEndDate);
  
  // Check if there's any overlap between the date ranges
  return itemStart <= filterEnd && itemEnd >= filterStart;
}
```

### Database Query Optimization

**Period-Aware Methods**:
- `getProjectsByPeriod(startDate, endDate)` - Filters projects at database level
- `getResourceAllocationsByPeriod(startDate, endDate)` - Filters allocations at database level
- `getTimeEntriesByPeriod(startDate, endDate)` - Filters time entries at database level

**SQL Filtering Logic**:
```sql
-- Projects: active projects overlapping with period
WHERE status = 'active' 
  AND start_date <= :endDate 
  AND end_date >= :startDate

-- Allocations: allocations overlapping with period  
WHERE start_date <= :endDate 
  AND end_date >= :startDate

-- Time Entries: entries within period
WHERE week_start_date >= :startDate 
  AND week_start_date <= :endDate
```

## Trend Data Generation

### Historical Data Approach
1. **Primary**: Use stored historical KPI snapshots from `historical_kpis` table
2. **Fallback**: Calculate historical data by querying past periods

### Historical KPI Storage
```javascript
// Daily snapshots stored with:
{
  snapshotDate: '2024-08-20',
  periodStartDate: '2024-08-13', 
  periodEndDate: '2024-08-20',
  department: 'IT' | null,
  activeProjects: 15,
  utilization: 87.5,
  conflicts: 2,
  // ... other metrics
}
```

### Trend Data Structure
```javascript
trendData: {
  activeProjects: {
    current_value: 15,
    previous_value: 14,
    period_label: 'from last week',
    trend_data: [12, 13, 14, 15, 14, 15, 15] // Last 7 periods
  }
}
```

## Data Validation Rules

### Resource Validation
- `id` and `name` are required
- `weeklyCapacity` must be numeric, 0-168 hours (default: 40)
- `isActive` must be boolean
- Invalid resources are filtered out with warnings

### Project Validation  
- `id` and `name` are required
- `startDate` and `endDate` must be valid dates
- `status` defaults to 'active' if missing
- Invalid projects are filtered out with warnings

### Allocation Validation
- `id`, `resourceId`, and `projectId` are required
- `allocatedHours` must be numeric, 0-168 hours
- `weeklyAllocations` hours must be 0-24 per day
- Invalid allocations are filtered out with warnings

## Error Handling

### Graceful Degradation
- Database errors return fallback KPI structure with zero values
- Invalid data is filtered out rather than causing failures
- Mathematical errors (division by zero) return safe defaults
- Missing historical data falls back to calculated trends

### Validation Checks
- Final KPI values are sanitized (non-negative integers/floats)
- Logical consistency enforced (activeProjects ≤ totalProjects)
- Extreme values are logged as warnings
- All calculations include try-catch blocks

## Performance Optimizations

### Database Level
- Period-aware queries reduce data transfer
- Proper indexing on date fields
- Batch operations for historical data

### Application Level  
- Data validation filters invalid records early
- Efficient Map-based resource utilization calculations
- Minimal memory allocation in loops
- Async operations for independent calculations

## Business Rules Summary

1. **Effective Capacity**: Total capacity minus 8 hours for non-project work
2. **Active Resources**: Only `isActive = true` resources are counted
3. **Period Filtering**: All metrics respect selected date ranges
4. **Utilization Thresholds**: 
   - Available: < 100% utilization
   - Conflict: > 100% utilization
   - Optimal: 50-90% utilization (for health scoring)
5. **Data Priority**: `allocatedHours` field takes precedence over `weeklyAllocations`
6. **Historical Trends**: 7-day periods for trend analysis
7. **Department Filtering**: Applied to resources, affects all dependent calculations

## Gamified Metrics

### Capacity Hero Badge

**Formula**: Badge level based on capacity conflicts count

**Badge Levels**:
- Gold: 0 conflicts
- Silver: 1-2 conflicts
- Bronze: 3-5 conflicts
- None: 6+ conflicts

**Data Sources**: Same as Capacity Conflicts Count

### Forecast Accuracy

**Formula**: `(1 - averageVariance) * 100`

**Calculation Steps**:
1. Compare planned hours (allocations) vs actual hours (time entries)
2. Calculate variance: `|actual - planned| / planned` per allocation
3. Average all variances
4. Convert to accuracy percentage

**Data Sources**:
- Table: `resource_allocations` (planned hours)
- Table: `time_entries` (actual hours)

### Resource Health Score

**Formula**: Weighted average of resource health points

**Health Point Rules**:
- 100 points: 50-90% utilization (optimal)
- 70 points: <50% utilization (under-utilized)
- 60 points: 90-100% utilization (near capacity)
- 20 points: 100-120% utilization (over capacity)
- 0 points: >120% utilization (critical)

### Project Leaderboard

**Formula**: Project variance ranking

**Calculation Steps**:
1. Sum planned hours per project from allocations
2. Sum actual hours per project from time entries
3. Calculate variance: `|actual - planned| / planned * 100`
4. Rank projects by highest variance (worst performing first)

### Firefighter Alerts

**Formula**: Resolved conflicts count

**Calculation Steps**:
1. Calculate current period conflicts
2. Calculate previous period conflicts
3. Resolved conflicts = `max(0, previousConflicts - currentConflicts)`

### Continuous Improvement

**Formula**: Weighted improvement score

**Components** (weighted average):
- Utilization efficiency improvement (30%)
- Conflict reduction (30%)
- Resource health improvement (30%)
- Forecast accuracy improvement (10%)

### Crystal Ball Prediction

**Formula**: Linear regression trend analysis

**Calculation Steps**:
1. Analyze last 4 weeks of utilization data
2. Calculate trend slope using linear regression
3. Predict when utilization will hit 100%
4. Adjust for upcoming projects
5. Calculate confidence based on trend consistency

## API Endpoints

### GET /api/dashboard/kpis

**Parameters**:
- `startDate` (optional): Period start date (YYYY-MM-DD)
- `endDate` (optional): Period end date (YYYY-MM-DD)
- `department` (optional): Department filter
- `includeTrends` (optional): Include trend data (boolean)

**Response Structure**:
```json
{
  "activeProjects": 15,
  "totalProjects": 18,
  "availableResources": 8,
  "totalResources": 12,
  "utilization": 87.5,
  "conflicts": 2,
  "trendData": {
    "activeProjects": {
      "current_value": 15,
      "previous_value": 14,
      "period_label": "from last week",
      "trend_data": [12, 13, 14, 15, 14, 15, 15]
    }
  }
}
```

### GET /api/dashboard/gamified-metrics

**Parameters**: Same as KPIs endpoint

**Response Structure**:
```json
{
  "capacityHero": {
    "conflictsCount": 2,
    "badgeLevel": "silver",
    "periodLabel": "Aug 13 - Aug 20"
  },
  "forecastAccuracy": {
    "percentage": 87.3,
    "trend": [85.2, 86.1, 87.3],
    "color": "yellow"
  }
}
```

## Testing Strategy

### Unit Tests
- Data validation functions
- Mathematical calculations
- Error handling scenarios
- Edge cases (empty data, invalid inputs)

### Integration Tests
- End-to-end KPI calculation
- Database integration
- Period filtering
- Department filtering

### Performance Tests
- Large dataset handling (1000+ resources)
- Query optimization validation
- Memory usage monitoring
- Response time benchmarks

### Data Consistency Tests
- Logical KPI relationships
- Mathematical accuracy
- Trend data consistency
- Historical data integrity

## Maintenance Guidelines

### Adding New KPIs
1. Define business logic and formula
2. Identify data sources and dependencies
3. Implement calculation function with validation
4. Add to historical KPI storage schema
5. Create unit tests for accuracy
6. Update documentation

### Modifying Existing KPIs
1. Assess impact on historical data
2. Implement backward compatibility
3. Update validation rules
4. Modify test cases
5. Update documentation
6. Consider data migration needs

### Performance Monitoring
- Monitor query execution times
- Track memory usage patterns
- Validate calculation accuracy
- Review error logs regularly
- Benchmark against large datasets
