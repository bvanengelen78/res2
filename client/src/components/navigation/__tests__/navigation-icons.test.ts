import { describe, it, expect } from 'vitest';
import { NAVIGATION_ICONS, validateUniqueIcons, getNavigationIcon } from '../navigation-icons';

describe('Navigation Icons', () => {
  it('should have all required navigation icons', () => {
    expect(NAVIGATION_ICONS.DASHBOARD).toBeDefined();
    expect(NAVIGATION_ICONS.PROJECTS).toBeDefined();
    expect(NAVIGATION_ICONS.RESOURCES).toBeDefined();
    expect(NAVIGATION_ICONS.TIME_LOGGING).toBeDefined();
    expect(NAVIGATION_ICONS.SUBMISSION_OVERVIEW).toBeDefined();
    expect(NAVIGATION_ICONS.REPORTS).toBeDefined();
    expect(NAVIGATION_ICONS.CHANGE_LEAD_REPORTS).toBeDefined();
    expect(NAVIGATION_ICONS.SETTINGS).toBeDefined();
  });

  it('should have no duplicate icons', () => {
    const duplicates = validateUniqueIcons();
    expect(duplicates).toHaveLength(0);
  });

  it('should return correct icon for given key', () => {
    const dashboardIcon = getNavigationIcon('DASHBOARD');
    expect(dashboardIcon).toBe(NAVIGATION_ICONS.DASHBOARD);
  });

  it('should have distinct icons for Reports and Change Lead Reports', () => {
    expect(NAVIGATION_ICONS.REPORTS).not.toBe(NAVIGATION_ICONS.CHANGE_LEAD_REPORTS);
  });
});
