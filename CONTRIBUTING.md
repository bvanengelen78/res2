# Contributing to ResourceFlow

Thank you for your interest in contributing to ResourceFlow! We welcome contributions from the community and are pleased to have you join us.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database or Supabase account
- Git for version control

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/resourceflow.git`
3. Install dependencies: `npm install`
4. Copy environment variables: `cp .env.example .env`
5. Configure your `.env` file with your database credentials
6. Run migrations: `npm run migrate`
7. Start development server: `npm run dev`

## 📋 How to Contribute

### Reporting Bugs
- Use the GitHub issue tracker
- Check if the issue already exists
- Provide detailed reproduction steps
- Include environment information (OS, Node.js version, etc.)

### Suggesting Features
- Open an issue with the "enhancement" label
- Describe the feature and its use case
- Explain why it would be valuable to the project

### Code Contributions

#### Branch Naming Convention
- `feature/description` - for new features
- `fix/description` - for bug fixes
- `docs/description` - for documentation updates
- `refactor/description` - for code refactoring

#### Commit Message Format
We follow [Conventional Commits](https://conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

Examples:
```
feat: add user authentication system
fix: resolve memory leak in dashboard component
docs: update API documentation for resource endpoints
```

#### Pull Request Process
1. Create a feature branch from `main`
2. Make your changes
3. Add or update tests as needed
4. Ensure all tests pass: `npm test`
5. Update documentation if necessary
6. Submit a pull request with a clear description

#### Code Style Guidelines
- Use TypeScript for all new code
- Follow the existing code style (ESLint + Prettier)
- Write meaningful variable and function names
- Add JSDoc comments for exported functions
- Keep functions small and focused
- Use proper error handling

#### Testing Requirements
- Write unit tests for new features
- Ensure existing tests still pass
- Add integration tests for API endpoints
- Test responsive design on different screen sizes

## 🏗️ Project Structure

```
resourceflow/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Backend Node.js application
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   └── utils/             # Server utilities
├── shared/                # Shared types and schemas
├── migrations/            # Database migrations
└── tests/                 # Test files
```

## 🔧 Development Guidelines

### Frontend (React/TypeScript)
- Use function components with hooks
- Implement proper TypeScript typing
- Use Tailwind CSS for styling
- Follow shadcn/ui component patterns
- Use TanStack Query for data fetching
- Implement proper error boundaries

### Backend (Node.js/Express)
- Use TypeScript for type safety
- Implement proper error handling
- Use middleware for common functionality
- Follow RESTful API conventions
- Validate input data with Zod
- Use proper HTTP status codes

### Database
- Use migrations for schema changes
- Follow naming conventions (snake_case)
- Add proper indexes for performance
- Use transactions for data consistency

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

### Writing Tests
- Write tests for all new features
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies
- Keep tests isolated and independent

## 📚 Documentation

- Update README.md for significant changes
- Add JSDoc comments for public APIs
- Update API documentation
- Include examples in documentation
- Keep documentation up to date

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the code of conduct
- Ask questions if you're unsure

## 📞 Getting Help

- Check existing issues and documentation
- Join our Discord community
- Ask questions in GitHub discussions
- Reach out to maintainers for guidance

Thank you for contributing to ResourceFlow! 🎉
