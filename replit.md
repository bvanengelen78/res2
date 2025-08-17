# ResourceFlow - Resource Planning Application

## Overview

ResourceFlow is a comprehensive web application for organizational resource planning that helps manage projects, allocate resources, and track capacity. The application enables organizations to gain insights into resource requirements, assess allocation impacts, and identify conflicts or bottlenecks in resource planning.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: React Query (TanStack Query) for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for fast development and building
- **UI Components**: Radix UI primitives with custom styling via class-variance-authority

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Database**: PostgreSQL with Neon serverless database
- **ORM**: Drizzle ORM for type-safe database operations
- **API**: RESTful API with JSON responses
- **Validation**: Zod for request/response validation

### Project Structure
```
├── client/          # React frontend application
├── server/          # Express backend server
├── shared/          # Shared types and schemas
├── migrations/      # Database migrations
└── attached_assets/ # Requirements documentation
```

## Key Components

### Database Schema
The application uses a PostgreSQL database with the following main entities:

1. **Users**: Basic user authentication and management
2. **Resources**: Team members with skills, capacity, and availability
3. **Projects**: Project definitions with timelines and priorities
4. **Resource Allocations**: Linking resources to projects with specific hours and roles
5. **Time Off**: Tracking vacation, sick leave, and other unavailable periods

### Frontend Components
- **Dashboard**: Central hub with KPIs, alerts, and quick actions
- **Resource Management**: CRUD operations for team members
- **Project Management**: Project creation and timeline tracking
- **Calendar View**: Visual representation of resource availability
- **Reports**: Analytics and utilization reporting
- **Forms**: Reusable form components with validation

### Backend Services
- **Storage Layer**: Abstract interface for database operations
- **API Routes**: RESTful endpoints for all CRUD operations
- **Database Connection**: Neon serverless PostgreSQL connection
- **Validation**: Zod schema validation for all inputs

## Data Flow

1. **Client Requests**: React components make API calls using React Query
2. **API Processing**: Express routes validate requests and call storage methods
3. **Database Operations**: Drizzle ORM executes type-safe SQL queries
4. **Response Handling**: JSON responses are cached and managed by React Query
5. **UI Updates**: Components re-render based on updated data

## External Dependencies

### Core Technologies
- **Database**: Neon serverless PostgreSQL
- **UI Library**: Radix UI components
- **State Management**: TanStack React Query
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with CSS variables for theming

### Development Tools
- **Build System**: Vite with hot module replacement
- **Type Checking**: TypeScript for full type safety
- **Database Management**: Drizzle Kit for migrations
- **Development Server**: Express with Vite integration

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles server code to `dist/index.js`
3. **Database Setup**: Drizzle pushes schema changes to PostgreSQL

### Environment Configuration
- **Development**: Local development with hot reloading
- **Production**: Optimized builds with static asset serving
- **Database**: Environment-specific connection strings

### Key Features Implemented
1. **Resource Planning**: Create and manage team member profiles
2. **Project Management**: Track project timelines and requirements
3. **Capacity Tracking**: Monitor resource allocation and availability
4. **Conflict Detection**: Identify overallocation and scheduling conflicts
5. **Dashboard Analytics**: KPIs and visual reporting
6. **Resource Allocation Management**: Complete CRUD operations for project allocations
7. **Responsive Design**: Mobile-friendly interface

### Resource Allocation Management Features
- **Allocation Overview**: Detailed table view of all project assignments per resource
- **In-line Editing**: Edit hours, roles, and status directly in the allocation table
- **Over-allocation Validation**: Real-time capacity warnings when assignments exceed 100%
- **Status Tracking**: Active, Planned, and Completed allocation statuses with color-coded badges
- **Capacity Visualization**: Visual indicators showing current utilization percentages
- **Allocation Forms**: Modal forms for adding/editing allocations with date pickers
- **Project Integration**: Full project details displayed with each allocation
- **Delete Functionality**: Safe deletion with confirmation dialogs

### Recent Changes (2025-07-09)
- Added comprehensive Resource Allocation Management system
- Implemented allocation table with in-line editing capabilities
- Added capacity monitoring with over-allocation warnings
- Created allocation forms with validation and date selection
- Enhanced resource detail pages with allocation overview
- Added allocation status tracking (Active, Planned, Completed)
- Integrated allocation CRUD operations with REST API endpoints
- **Dashboard Real-time Data Integration**: Updated all dashboard components to use live database data
- **Enhanced KPI Calculations**: Improved accuracy with active-only allocation filtering and proper utilization metrics
- **Dynamic Capacity Alerts**: Real-time overallocation detection with detailed resource utilization percentages
- **Interactive Resource Heatmap**: Color-coded status indicators with allocation details and project counts
- **Live Project Timeline**: Calculated completion percentages, resource counts, and allocation hours per project
- **Enhanced Resource Allocation Table**: Real-time utilization status with clickable resource links
- **Added Tooltips**: Informative help text for all KPI cards explaining each metric
- **Advanced Overallocation Resolution**: Comprehensive system with smart suggestions, what-if simulations, and manual controls
- **Smart Resolution Suggestions**: Automated recommendations for reducing low-priority projects, reassigning tasks, and redistributing hours
- **What-If Simulation Mode**: Interactive testing of allocation changes with real-time utilization calculations
- **Manual Adjustment Controls**: Full control over allocation modifications with resource reassignment capabilities
- **Multi-Access Resolution**: Resolve overallocations from capacity alerts and resource heatmap components
- **Change Lead Reporting System**: Comprehensive reporting for change leads with role-based access control
- **Effort Summary Analytics**: Detailed view of estimated vs actual hours with deviation tracking
- **Project Filtering**: Filter reports by specific projects and date ranges
- **Excel Export**: CSV export functionality for external analysis
- **Fixed Data Formatting**: Resolved decimal concatenation issues and improved number display formatting
- **Enhanced Project Creation**: Comprehensive modal with Basic Information, Classification, Governance, and Strategic Alignment sections
- **Typeahead Resource Selection**: Searchable dropdowns for Director, Change Lead, and Business Lead assignment
- **Conditional Field Requirements**: Change Lead only required for Change-type projects
- **Advanced Project Filtering**: Search and filter by Status, Type, Stream with enhanced project overview cards
- **Project Editing System**: Full CRUD operations for modifying project metadata with proper validation and state management
- **Resource Deletion System**: Comprehensive soft delete functionality with data preservation
- **Delete Confirmation Dialog**: Detailed warning modal showing related data impact
- **Data Integrity Protection**: Historical allocations, time entries, and project assignments preserved
- **Admin Access Control**: Delete functionality with proper permission checks and audit trail
- **Change Effort Report System**: Comprehensive reporting for Manager Change roles with estimated vs actual hours analysis
- **Role-based Access Control**: Only Manager Change users can access the Change Effort Report
- **API Parameter Fix**: Fixed apiRequest function call parameter order bug that was causing fetch errors
- **Enhanced Debugging**: Added console logging and user feedback for report generation status
- **Excel Export Functionality**: Complete Excel export with summary and detailed sheets for Change Effort data
- **Business Controller Report System**: Comprehensive reporting for Business Controller roles with actual hours logged per change and resource
- **Monthly Filtering**: Month-based filtering for Business Controller reports with optional active-only toggle
- **Resource-Change Analytics**: Detailed view of actual hours by resource-change-month combinations with department and role tracking
- **Multi-Sheet Excel Export**: Enhanced Excel export with separate sheets for main report, change summaries, and resource summaries
- **Top Performance Insights**: Visual widgets showing top resources by hours and most time-consuming changes
- **Enhanced Resource Cards UI**: Modern responsive design with enhanced resource cards featuring hover effects, tooltips, and consistent layout
- **Profile Picture Upload**: Implemented profile image upload functionality with circular avatars, fallback placeholders, and image validation
- **Database Schema Update**: Added profileImage field to resources table for storing profile pictures
- **Responsive Resource View**: Added grid/list view toggle for resource cards with optimized layouts for desktop and mobile
- **Enhanced Resource Detail Pages**: Updated resource detail pages to use profile image upload component with improved UI consistency
- **Profile Image API**: Added backend endpoint for profile image upload with validation and secure storage simulation
- **Fixed Profile Image Deletion**: Resolved issue where profile image deletion didn't properly update the frontend display
- **Comprehensive Time Off Management**: Full CRUD system for managing vacation, sick leave, and other time off requests
- **Advanced Capacity Management**: Non-project hour tracking with effective capacity calculations for meetings, admin, and training time
- **Enhanced Resource Detail UI**: Modern glassmorphism design with tooltips, responsive layout, and improved information hierarchy
- **Real-time Capacity Monitoring**: Live utilization tracking with over-allocation warnings and capacity breakdown visualization
- **Time Off Integration**: Time off entries automatically affect capacity calculations and resource availability reporting

### New Resource Detail Features (2025-07-10)
- **Complete Time Off System**: Add, edit, and delete time off requests with working day calculations and hour tracking
- **Non-Project Capacity Tracking**: Manage meetings, administration, training, and other non-billable activities
- **Effective Capacity Calculations**: Real-time capacity monitoring that accounts for both project allocations and non-project time
- **Enhanced UI Components**: Modern card layouts with gradient backgrounds, tooltips, and professional styling
- **Responsive Design**: Optimized for both desktop and mobile with proper spacing and component arrangement
- **Data Integrity**: All capacity changes integrate with existing reports and allocation systems

### Settings Page Implementation (2025-07-10)
- **Comprehensive Configuration Management**: Complete Settings page with tabbed interface for managing core system configurations
- **OGSM Charter Administration**: Full CRUD operations for strategic alignment charters used in project classification
- **Department Management**: Complete department lifecycle management for resource organization and team structure
- **Admin Role-Based Access Control**: Secure API endpoints restricted to system administrators only
- **Real-time Form Validation**: Client-side validation with proper error handling and success notifications
- **Cross-System Integration**: Automatic cache invalidation ensures new configurations immediately appear in project and resource forms
- **Future-Ready Architecture**: Placeholder for Jira integration with clear roadmap indicators
- **Enhanced User Experience**: Tooltips, usage indicators, and professional modal forms for seamless configuration management

### Role-Based Access Control Implementation (2025-07-11)
- **Comprehensive RBAC System**: Implemented centralized role-based access control with user roles and permissions management
- **Role Management Interface**: Admin-only Settings tab for managing user roles and editing role definitions
- **Resource-Based User Management**: System to add existing resources/users to role management instead of creating new users
- **Dynamic Permission Assignment**: Editable role definitions allowing admins to customize permissions for each role
- **Menu Access Control**: Navigation sidebar dynamically filters based on user roles and permissions
- **Role Assignment Workflow**: Interface for assigning roles to existing resources with automatic user account creation
- **Custom Role Permissions**: In-memory storage for custom role permissions with real-time updates
- **Authentication Integration**: Full integration with existing auth system and user session management

### Enhanced Project Management System (2025-07-10)
- **Functional Project Details View**: Complete modal with comprehensive project information, timeline visualization, and leadership details
- **Safe Project Deletion**: Confirmation modal with safety warnings and checklist for stakeholder considerations
- **Visual Enhancements**: Consistent color palette for status badges, hover effects, and smooth animations on project cards
- **Progress Visualization**: Real-time progress bars based on project timeline and completion percentage
- **Smart Deadline Alerts**: Color-coded deadline warnings showing overdue, urgent, and upcoming project deadlines
- **Interactive Tooltips**: Expandable descriptions and charter information with hover functionality
- **Enhanced Empty States**: Intelligent empty state handling for no projects vs filtered results with actionable buttons
- **Mini Interactions**: Card hover effects with scaling and color transitions for improved user engagement
- **Improved UX Design**: Professional card layouts with consistent spacing, typography, and visual hierarchy

The application follows modern web development practices with strong typing, component reusability, and efficient data management patterns.