# RBAC Testing Guide

## Overview

This guide provides comprehensive testing procedures for the Role-Based Access Control (RBAC) system to ensure security, functionality, and reliability.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test User Accounts](#test-user-accounts)
3. [Manual Testing Procedures](#manual-testing-procedures)
4. [Automated Testing](#automated-testing)
5. [Security Testing](#security-testing)
6. [Performance Testing](#performance-testing)
7. [Test Scenarios](#test-scenarios)

## Testing Strategy

### Testing Levels

1. **Unit Tests**: Individual permission checking functions
2. **Component Tests**: RBAC guard components
3. **Integration Tests**: Auth flow and permission resolution
4. **End-to-End Tests**: Complete user workflows
5. **Security Tests**: Permission bypass attempts
6. **Performance Tests**: Auth system performance

### Test Environment Setup

```bash
# Test database setup
npm run test:db:setup

# Seed test data
npm run test:db:seed

# Run test suite
npm run test:rbac
```

## Test User Accounts

### Default Test Users

Create these test accounts in your development environment:

```sql
-- Admin User
INSERT INTO user_profiles (id, email, full_name, is_active) 
VALUES ('admin-test-id', 'admin@test.com', 'Test Admin', true);

INSERT INTO user_roles (user_id, role_id, is_active)
SELECT 'admin-test-id', id, true FROM roles WHERE name = 'admin';

-- Manager User  
INSERT INTO user_profiles (id, email, full_name, is_active) 
VALUES ('manager-test-id', 'manager@test.com', 'Test Manager', true);

INSERT INTO user_roles (user_id, role_id, is_active)
SELECT 'manager-test-id', id, true FROM roles WHERE name = 'manager';

-- Regular User
INSERT INTO user_profiles (id, email, full_name, is_active) 
VALUES ('user-test-id', 'user@test.com', 'Test User', true);

INSERT INTO user_roles (user_id, role_id, is_active)
SELECT 'user-test-id', id, true FROM roles WHERE name = 'user';

-- User with No Roles
INSERT INTO user_profiles (id, email, full_name, is_active) 
VALUES ('norole-test-id', 'norole@test.com', 'No Role User', true);
```

### Test Credentials

| Role | Email | Password | Expected Permissions |
|------|-------|----------|---------------------|
| Admin | admin@test.com | test123 | All permissions (12) |
| Manager | manager@test.com | test123 | 8 permissions |
| User | user@test.com | test123 | 3 permissions |
| No Role | norole@test.com | test123 | 0 permissions |

## Manual Testing Procedures

### 1. Authentication Flow Testing

#### Login Process
1. Navigate to `/login`
2. Enter test credentials
3. Verify successful login
4. Check auth context state
5. Verify JWT token generation
6. Confirm user profile loading

#### Session Management
1. Refresh browser page
2. Verify session persistence
3. Test automatic token refresh
4. Verify logout functionality
5. Check session cleanup

### 2. Permission-Based Navigation Testing

#### Admin User Testing
```
✅ Should see all navigation items:
- Dashboard
- Projects  
- Resources
- Time Logging
- Submission Overview
- Reports
- Change Lead Reports
- User Management
- Settings

✅ Should access all pages without restrictions
```

#### Manager User Testing
```
✅ Should see navigation items:
- Dashboard
- Projects
- Resources  
- Time Logging
- Submission Overview
- Reports
- Change Lead Reports
- Settings

❌ Should NOT see:
- User Management
```

#### Regular User Testing
```
✅ Should see navigation items:
- Dashboard
- Time Logging

❌ Should NOT see:
- Projects
- Resources
- Submission Overview
- Reports
- Change Lead Reports
- User Management
- Settings
```

### 3. Page Access Testing

#### Test Matrix

| Page | Admin | Manager | User | No Role |
|------|-------|---------|------|---------|
| `/` (Dashboard) | ✅ | ✅ | ✅ | ❌ |
| `/projects` | ✅ | ✅ | ❌ | ❌ |
| `/resources` | ✅ | ✅ | ❌ | ❌ |
| `/mobile-time-logging` | ✅ | ✅ | ✅ | ❌ |
| `/submission-overview` | ✅ | ✅ | ❌ | ❌ |
| `/reports` | ✅ | ✅ | ❌ | ❌ |
| `/change-lead-reports` | ✅ | ✅ | ❌ | ❌ |
| `/user-management` | ✅ | ❌ | ❌ | ❌ |
| `/settings` | ✅ | ✅ | ❌ | ❌ |

#### Testing Procedure
1. Login as each user type
2. Attempt to access each page
3. Verify expected behavior:
   - ✅ = Page loads successfully
   - ❌ = Access denied or redirect

### 4. Component-Level Permission Testing

#### RBAC Guard Testing
```typescript
// Test each guard component
<AdminGuard> - Only admins should see content
<ManagerGuard> - Admins and managers should see content  
<UserGuard> - All authenticated users should see content
<PermissionGuard permission="specific"> - Users with permission should see content
```

#### Testing Checklist
- [ ] AdminGuard shows content for admin users
- [ ] AdminGuard hides content for non-admin users
- [ ] PermissionGuard respects specific permissions
- [ ] Fallback content displays for unauthorized users
- [ ] Loading states work correctly
- [ ] Guards work with nested components

### 5. API Endpoint Testing

#### Protected Endpoints
Test each protected API endpoint with different user types:

```bash
# Admin endpoints
curl -H "Authorization: Bearer $ADMIN_TOKEN" /api/admin/users
curl -H "Authorization: Bearer $USER_TOKEN" /api/admin/users # Should fail

# Manager endpoints  
curl -H "Authorization: Bearer $MANAGER_TOKEN" /api/projects
curl -H "Authorization: Bearer $USER_TOKEN" /api/projects # Should fail

# User endpoints
curl -H "Authorization: Bearer $USER_TOKEN" /api/time-entries
curl -H "Authorization: Bearer $INVALID_TOKEN" /api/time-entries # Should fail
```

## Automated Testing

### Unit Tests

```typescript
// __tests__/rbac/permission-checking.test.ts
describe('Permission Checking', () => {
  it('should correctly identify admin permissions', () => {
    const adminUser = createMockUser(['admin'])
    expect(adminUser.hasPermission('user_management')).toBe(true)
    expect(adminUser.hasPermission('project_management')).toBe(true)
    expect(adminUser.isAdmin()).toBe(true)
  })

  it('should correctly identify manager permissions', () => {
    const managerUser = createMockUser(['manager'])
    expect(managerUser.hasPermission('project_management')).toBe(true)
    expect(managerUser.hasPermission('user_management')).toBe(false)
    expect(managerUser.isAdmin()).toBe(false)
  })

  it('should correctly identify user permissions', () => {
    const regularUser = createMockUser(['user'])
    expect(regularUser.hasPermission('time_logging')).toBe(true)
    expect(regularUser.hasPermission('project_management')).toBe(false)
    expect(regularUser.isAdmin()).toBe(false)
  })
})
```

### Component Tests

```typescript
// __tests__/components/rbac-guards.test.tsx
describe('RBAC Guards', () => {
  it('should render content for authorized users', () => {
    render(
      <MockAuthProvider user={adminUser}>
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      </MockAuthProvider>
    )
    
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('should not render content for unauthorized users', () => {
    render(
      <MockAuthProvider user={regularUser}>
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      </MockAuthProvider>
    )
    
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('should render fallback for unauthorized users', () => {
    render(
      <MockAuthProvider user={regularUser}>
        <AdminGuard fallback={<div>Access Denied</div>}>
          <div>Admin Content</div>
        </AdminGuard>
      </MockAuthProvider>
    )
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/auth-flow.test.ts
describe('Authentication Flow', () => {
  it('should complete full login flow', async () => {
    // Navigate to login
    await page.goto('/login')
    
    // Enter credentials
    await page.fill('[name="email"]', 'admin@test.com')
    await page.fill('[name="password"]', 'test123')
    await page.click('[type="submit"]')
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/')
    
    // Verify user data loaded
    await expect(page.locator('[data-testid="user-email"]')).toContainText('admin@test.com')
    
    // Verify navigation items visible
    await expect(page.locator('[data-testid="nav-user-management"]')).toBeVisible()
  })
})
```

## Security Testing

### 1. Permission Bypass Attempts

#### Direct URL Access
```typescript
// Test direct URL access without proper permissions
describe('Security - Direct URL Access', () => {
  it('should prevent unauthorized page access', async () => {
    // Login as regular user
    await loginAs('user@test.com')
    
    // Attempt to access admin page directly
    await page.goto('/user-management')
    
    // Should be redirected or show access denied
    expect(page.url()).not.toContain('/user-management')
  })
})
```

#### Token Manipulation
```typescript
// Test with invalid/expired tokens
describe('Security - Token Validation', () => {
  it('should reject invalid tokens', async () => {
    const response = await fetch('/api/admin/users', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    })
    
    expect(response.status).toBe(401)
  })

  it('should reject expired tokens', async () => {
    const expiredToken = generateExpiredToken()
    const response = await fetch('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      }
    })
    
    expect(response.status).toBe(401)
  })
})
```

### 2. Role Escalation Testing

```typescript
// Test role escalation attempts
describe('Security - Role Escalation', () => {
  it('should prevent role escalation via API', async () => {
    // Login as regular user
    const userToken = await getTokenFor('user@test.com')
    
    // Attempt to assign admin role to self
    const response = await fetch('/api/admin/users/self/role', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'admin' })
    })
    
    expect(response.status).toBe(403)
  })
})
```

### 3. Data Access Testing

```typescript
// Test data access restrictions
describe('Security - Data Access', () => {
  it('should only return user-accessible data', async () => {
    const userToken = await getTokenFor('user@test.com')
    
    const response = await fetch('/api/projects', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    })
    
    expect(response.status).toBe(403)
  })
})
```

## Performance Testing

### 1. Auth Context Performance

```typescript
// Test auth context performance
describe('Performance - Auth Context', () => {
  it('should load user data within acceptable time', async () => {
    const startTime = performance.now()
    
    render(
      <SupabaseAuthProvider>
        <TestComponent />
      </SupabaseAuthProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('user-loaded')).toBeInTheDocument()
    })
    
    const loadTime = performance.now() - startTime
    expect(loadTime).toBeLessThan(2000) // 2 seconds max
  })
})
```

### 2. Permission Checking Performance

```typescript
// Test permission checking performance
describe('Performance - Permission Checking', () => {
  it('should check permissions quickly', () => {
    const user = createMockUser(['admin'])
    
    const startTime = performance.now()
    
    // Check 100 permissions
    for (let i = 0; i < 100; i++) {
      user.hasPermission('user_management')
    }
    
    const checkTime = performance.now() - startTime
    expect(checkTime).toBeLessThan(100) // 100ms max for 100 checks
  })
})
```

## Test Scenarios

### Scenario 1: New User Onboarding
1. Admin creates new user account
2. Assigns appropriate role
3. User logs in for first time
4. Verify correct permissions applied
5. Test access to assigned features

### Scenario 2: Role Change
1. User starts with 'user' role
2. Admin promotes to 'manager' role
3. User logs out and back in
4. Verify new permissions active
5. Test access to manager features

### Scenario 3: Permission Revocation
1. User has access to feature
2. Admin removes permission
3. User refreshes page
4. Verify access revoked
5. Test graceful handling

### Scenario 4: Concurrent Sessions
1. User logs in on multiple devices
2. Admin changes user role
3. Verify changes apply to all sessions
4. Test session synchronization

### Scenario 5: System Recovery
1. Database connection lost
2. User attempts to access features
3. Connection restored
4. Verify system recovery
5. Test data consistency

## Test Reporting

### Test Coverage Requirements
- Unit Tests: 90%+ coverage
- Component Tests: 85%+ coverage
- Integration Tests: Key user flows
- Security Tests: All permission scenarios
- Performance Tests: Critical paths

### Test Documentation
- Document all test scenarios
- Record expected vs actual results
- Track security test results
- Monitor performance metrics
- Report any security vulnerabilities

### Continuous Testing
- Run tests on every commit
- Automated security scans
- Performance monitoring
- Regular penetration testing
- User acceptance testing

## Troubleshooting Test Issues

### Common Test Failures

1. **Permission Check Fails**
   - Verify test user setup
   - Check role assignments
   - Validate permission definitions

2. **Component Not Rendering**
   - Check mock auth provider
   - Verify permission props
   - Test loading states

3. **API Tests Failing**
   - Validate test tokens
   - Check endpoint permissions
   - Verify database state

### Debug Tools

```typescript
// Test debugging utilities
const debugTest = {
  logUserState: (user) => {
    console.log('User:', user)
    console.log('Roles:', user.roles)
    console.log('Permissions:', user.permissions)
  },
  
  checkPermission: (user, permission) => {
    const result = user.hasPermission(permission)
    console.log(`Permission ${permission}:`, result)
    return result
  }
}
```

## Conclusion

Thorough testing of the RBAC system is critical for security and functionality. Follow this guide to ensure comprehensive coverage of all permission scenarios and maintain system integrity.

Remember: Security testing is an ongoing process, not a one-time activity.
