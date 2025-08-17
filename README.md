# ResourceFlow - Resource Planning & Management Platform

A comprehensive resource planning and management platform built with React, TypeScript, and Node.js. ResourceFlow helps organizations efficiently manage their human resources, track project allocations, monitor capacity utilization, and generate insightful reports.

## 🚀 Features

### 📊 Dashboard & Analytics
- **Real-time KPI monitoring** with interactive charts and metrics
- **Capacity utilization tracking** with visual indicators and alerts
- **Resource availability overview** with current and forecasted data
- **Project timeline visualization** with milestone tracking
- **Gamified insights** with achievement tracking and progress indicators

### 👥 Resource Management
- **Comprehensive resource profiles** with skills, roles, and availability
- **Department-based organization** with hierarchical management
- **Role-based access control (RBAC)** with granular permissions
- **Resource allocation tracking** across multiple projects
- **Capacity planning** with effective hours calculation

### 📈 Project Management
- **Project overview** with status tracking and resource allocation
- **Time logging** with mobile-friendly interface
- **Allocation management** with drag-and-drop functionality
- **Progress tracking** with visual indicators and reporting
- **OGSM charter integration** for strategic alignment

### 📋 Reporting & Insights
- **Enhanced capacity alerts** with detailed breakdown and recommendations
- **Change lead reports** with specialized analytics
- **Recent reports** with automated generation and scheduling
- **Email delivery** for automated report distribution
- **Export capabilities** (PDF, Excel) for external sharing

### 🔧 Advanced Features
- **Real-time synchronization** across all components
- **Period-aware calculations** with flexible date range selection
- **Mobile-responsive design** with touch-friendly interfaces
- **Dark mode support** with professional styling
- **Keyboard shortcuts** for power users

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript for type-safe component development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for consistent, accessible UI components
- **Wouter** for lightweight client-side routing
- **TanStack Query** for efficient data fetching and caching
- **React Hook Form** for form management and validation
- **Recharts** for data visualization and charts
- **Framer Motion** for smooth animations and transitions

### Backend
- **Node.js** with Express.js for RESTful API development
- **TypeScript** for full-stack type safety
- **Supabase** for database, authentication, and real-time features
- **PostgreSQL** for robust data storage and complex queries
- **JWT** for secure authentication and authorization
- **Zod** for runtime type validation and schema enforcement

### Development & Testing
- **Vitest** for unit and integration testing
- **Playwright** for end-to-end testing
- **ESLint** and **Prettier** for code quality and formatting
- **Husky** for Git hooks and pre-commit validation
- **TypeScript** strict mode for enhanced type checking

### Infrastructure & Deployment
- **Docker** support for containerized deployment
- **Vercel/Netlify** ready for frontend deployment
- **Railway/Heroku** compatible for backend deployment
- **GitHub Actions** for CI/CD workflows

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm/yarn/pnpm
- **PostgreSQL** database (or Supabase account)
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/resourceflow.git
   cd resourceflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```

   Configure your environment variables:
   ```env
   # Database
   DATABASE_URL=your_postgresql_connection_string

   # Supabase (if using)
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Authentication
   JWT_SECRET=your_jwt_secret_key

   # Application
   NODE_ENV=development
   PORT=5000
   ```

4. **Database setup**
   ```bash
   # Run migrations
   npm run migrate

   # Seed initial data (optional)
   npm run seed
   ```

5. **Start development servers**
   ```bash
   # Start both frontend and backend
   npm run dev

   # Or start separately
   npm run dev:client  # Frontend only (port 3000)
   npm run dev:server  # Backend only (port 5000)
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000` to access the application.

## 📁 Project Structure

```
resourceflow/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components and routing
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions and helpers
│   │   ├── config/        # Configuration files
│   │   └── styles/        # Global styles and themes
│   ├── public/            # Static assets
│   └── index.html         # HTML entry point
├── server/                # Backend Node.js application
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   ├── utils/             # Server utilities
│   ├── auth.ts            # Authentication logic
│   └── index.ts           # Server entry point
├── shared/                # Shared types and schemas
├── migrations/            # Database migration files
├── tests/                 # Test files (E2E, integration)
├── docs/                  # Documentation
└── scripts/               # Build and deployment scripts
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
# Build for production
npm run build:client

# Preview production build
npm run preview
```

### Backend (Railway/Heroku)
```bash
# Build for production
npm run build:server

# Start production server
npm start
```

### Docker
```bash
# Build Docker image
docker build -t resourceflow .

# Run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style
- Follow the existing code style and conventions
- Use TypeScript for all new code
- Write tests for new features
- Update documentation as needed
- Follow [Conventional Commits](https://conventionalcommits.org/) for commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/) for the amazing frontend framework
- [Supabase](https://supabase.com/) for the backend-as-a-service platform
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- All the open-source contributors who made this project possible

## 📞 Support

If you have any questions or need help, please:
- Check the [documentation](docs/)
- Open an [issue](https://github.com/your-username/resourceflow/issues)
- Join our [Discord community](https://discord.gg/your-invite)

---

**Built with ❤️ by the ResourceFlow team**
