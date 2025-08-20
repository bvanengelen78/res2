# KPI Calculation Quick Reference

## Core Formulas

### Effective Capacity
```javascript
effectiveCapacity = weeklyCapacity - 8 // 8h for non-project work
```

### Resource Utilization
```javascript
utilization = (totalAllocatedHours / totalEffectiveCapacity) * 100
```

### Capacity Conflicts
```javascript
conflicts = resources.filter(r => r.isActive && r.utilization > 100).length
```

### Available Resources
```javascript
available = resources.filter(r => r.isActive && r.utilization < 100).length
```

## Key Constants

```javascript
const DEFAULT_NON_PROJECT_HOURS = 8;
const UTILIZATION_THRESHOLDS = {
  OPTIMAL_MIN: 50,
  OPTIMAL_MAX: 90,
  WARNING: 90,
  ERROR: 100,
  CRITICAL: 120
};
```

## Data Sources

| KPI | Primary Table | Secondary Tables | Key Fields |
|-----|---------------|------------------|------------|
| Active Projects | projects | - | status, start_date, end_date |
| Resource Utilization | resources | resource_allocations | weekly_capacity, allocated_hours |
| Capacity Conflicts | resources | resource_allocations | weekly_capacity, allocated_hours |
| Forecast Accuracy | resource_allocations | time_entries | allocated_hours, actual hours |

## Period Filtering

### Date Overlap Logic
```javascript
// Item overlaps with filter period if:
itemStart <= filterEnd && itemEnd >= filterStart
```

### Database Queries
```sql
-- Projects in period
WHERE status = 'active' AND start_date <= :endDate AND end_date >= :startDate

-- Allocations in period  
WHERE start_date <= :endDate AND end_date >= :startDate

-- Time entries in period
WHERE week_start_date >= :startDate AND week_start_date <= :endDate
```

## Validation Rules

### Resource Data
- ✅ Required: `id`, `name`
- ✅ `weeklyCapacity`: 0-168 hours (default: 40)
- ✅ `isActive`: boolean
- ❌ Filter out: null objects, missing required fields

### Project Data
- ✅ Required: `id`, `name`
- ✅ `startDate`, `endDate`: valid dates
- ✅ `status`: defaults to 'active'
- ❌ Filter out: invalid dates, missing required fields

### Allocation Data
- ✅ Required: `id`, `resourceId`, `projectId`
- ✅ `allocatedHours`: 0-168 hours
- ✅ `weeklyAllocations`: 0-24 hours per day
- ❌ Filter out: missing IDs, invalid hour values

## Error Handling

### Safe Calculations
```javascript
// Division by zero protection
const utilizationRate = totalEffectiveCapacity > 0 ? 
  (totalAllocated / totalEffectiveCapacity) * 100 : 0;

// NaN protection
const safeValue = isNaN(calculatedValue) ? 0 : calculatedValue;

// Range validation
const clampedValue = Math.max(0, Math.min(100, value));
```

### Fallback Data Structure
```javascript
const fallbackKpis = {
  activeProjects: 0,
  totalProjects: 0,
  availableResources: 0,
  totalResources: 0,
  utilization: 0,
  conflicts: 0,
  trendData: {
    activeProjects: {
      current_value: 0,
      previous_value: 0,
      period_label: 'no data',
      trend_data: [0, 0, 0, 0, 0, 0, 0]
    }
    // ... other metrics
  }
};
```

## Performance Tips

### Database Optimization
- Use period-aware queries: `getResourceAllocationsByPeriod()`
- Filter at SQL level, not in memory
- Batch operations for historical data
- Index date fields for fast filtering

### Memory Optimization
- Filter invalid data early
- Use Map for O(1) lookups
- Avoid nested loops where possible
- Process data in streams for large datasets

## Testing Checklist

### Unit Tests
- [ ] Data validation functions
- [ ] Mathematical calculations
- [ ] Error handling scenarios
- [ ] Edge cases (empty data, invalid inputs)

### Integration Tests
- [ ] End-to-end KPI calculation
- [ ] Database integration
- [ ] Period filtering accuracy
- [ ] Department filtering

### Performance Tests
- [ ] Large dataset handling (1000+ resources)
- [ ] Response time < 5 seconds
- [ ] Memory usage monitoring
- [ ] Query optimization validation

## Common Issues & Solutions

### Issue: Negative Utilization
**Cause**: Invalid allocation data or calculation error
**Solution**: Add validation and clamp values to >= 0

### Issue: Infinite Utilization
**Cause**: Division by zero (no effective capacity)
**Solution**: Check denominator before division

### Issue: Inconsistent KPIs
**Cause**: Different filtering logic between metrics
**Solution**: Use shared filtering functions

### Issue: Slow Performance
**Cause**: Fetching all data then filtering in memory
**Solution**: Use period-aware database queries

### Issue: Missing Trend Data
**Cause**: No historical KPI snapshots
**Solution**: Implement fallback calculation or auto-save snapshots

## Development Workflow

### Adding New KPI
1. Define business logic and formula
2. Identify data sources
3. Implement calculation with validation
4. Add to historical storage schema
5. Create unit tests
6. Update documentation

### Modifying Existing KPI
1. Assess backward compatibility impact
2. Update calculation logic
3. Modify validation rules
4. Update test cases
5. Update documentation
6. Consider data migration

### Debugging KPI Issues
1. Check input data validity
2. Verify period filtering logic
3. Validate mathematical calculations
4. Review error logs
5. Test with known data sets
6. Compare with expected results

## API Usage Examples

### Basic KPI Request
```javascript
GET /api/dashboard/kpis?startDate=2024-01-01&endDate=2024-12-31&includeTrends=true
```

### Department Filtered
```javascript
GET /api/dashboard/kpis?department=IT&includeTrends=false
```

### Gamified Metrics
```javascript
GET /api/dashboard/gamified-metrics?startDate=2024-08-01&endDate=2024-08-31
```

## Monitoring & Alerts

### Key Metrics to Monitor
- Response time < 2 seconds
- Error rate < 1%
- Data validation warnings
- Memory usage patterns
- Database query performance

### Alert Conditions
- KPI calculation failures
- Extreme utilization values (>500%)
- Database connection issues
- Performance degradation
- Data inconsistencies

## Quick Debugging Commands

```bash
# Run KPI tests
npm run test:kpi

# Run with coverage
npm run test:coverage

# Test specific scenario
npm run test:integration

# Performance benchmark
npm run test -- --verbose
```
