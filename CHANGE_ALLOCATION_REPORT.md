# Change Allocation Report Feature

## Overview
The Change Allocation Report is a new feature in ResourceFlow that provides detailed insights into resource utilization per change project, comparing estimated vs actual hours with variance analysis.

## Features

### 📊 Report Generation
- **Time Range Selection**: Choose custom date ranges for analysis
- **Project Filtering**: Select specific change projects or include all
- **Resource Filtering**: Optional filtering by specific resources
- **Grouping Options**: Group results by project or resource

### 📈 Report Contents
The generated report includes:
- **Project/Change Information**: ID, title, status, stream, change lead
- **Resource Details**: Name, department, role in the project
- **Hour Analysis**:
  - Estimated hours (from project)
  - Allocated hours (from resource allocations)
  - Actual hours (from time entries)
  - Variance (actual vs allocated)
  - Variance percentage
  - Utilization rate

### 📋 Excel Export
The report is automatically exported as an Excel file with multiple sheets:
1. **Change Allocation Report**: Main data with all metrics
2. **Weekly Breakdown**: Detailed weekly time entries (if available)
3. **Summary**: Aggregated totals and averages
4. **Metadata**: Report generation details and criteria

## How to Use

### 1. Access the Report
1. Navigate to the **Reports** page
2. Find the **Change Allocation Report** template
3. Click the **Generate** button

### 2. Configure Report Criteria
1. **Set Time Range**: Choose start and end dates
2. **Select Projects**: Choose one or more change projects (required)
3. **Filter Resources**: Optionally select specific resources
4. **Choose Grouping**: Select grouping by project or resource

### 3. Generate and Download
1. Click **Generate Report**
2. The system will process the data and create an Excel file
3. The file will automatically download to your computer

## Report Metrics Explained

### Variance Analysis
- **Positive Variance**: Actual hours exceed allocated hours (over-allocation)
- **Negative Variance**: Actual hours are less than allocated hours (under-utilization)
- **Variance Percentage**: (Actual - Allocated) / Allocated × 100

### Utilization Rate
- **Formula**: (Actual Hours / Allocated Hours) × 100
- **100%**: Perfect utilization
- **>100%**: Over-utilization
- **<100%**: Under-utilization

## Technical Implementation

### Frontend Components
- **ChangeAllocationReportModal**: Modal dialog for report configuration
- **Reports Page**: Integration with existing report templates

### Backend API
- **Endpoint**: `POST /api/reports/change-allocation`
- **Storage Method**: `getChangeAllocationReport()` with fallback support
- **Permissions**: Requires `REPORTS` permission

### Data Sources
- **Projects**: Change-type projects with metadata
- **Resource Allocations**: Planned resource assignments
- **Time Entries**: Actual logged hours by week
- **Resources**: Team member information

## File Structure
```
client/src/components/change-allocation-report-modal.tsx  # Modal component
client/src/pages/reports.tsx                             # Updated reports page
server/routes.ts                                         # API endpoint
server/storage.ts                                        # Data access methods
```

## Future Enhancements
- **Report History**: Store generated reports for re-download
- **Scheduled Reports**: Automatic report generation
- **Advanced Filters**: Department, role, project status filters
- **Visualization**: Charts and graphs for variance analysis
- **Email Distribution**: Send reports to stakeholders

## Troubleshooting

### Common Issues
1. **No Data Found**: Ensure selected projects have resource allocations in the date range
2. **Loading Errors**: Check network connection and user permissions
3. **Export Issues**: Verify browser allows file downloads

### Error Messages
- **"Selection Required"**: At least one project must be selected
- **"No allocation data found"**: No matching data for the criteria
- **"Failed to generate report"**: Server error, check logs

## Support
For technical issues or feature requests, contact the development team or create an issue in the project repository.
