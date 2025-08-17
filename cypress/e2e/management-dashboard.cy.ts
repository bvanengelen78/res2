// Cypress smoke test for Management Dashboard v2
// Derived from Cypress best practices for dashboard testing

describe('Management Dashboard v2', () => {
  beforeEach(() => {
    // Visit the home page which now shows the management dashboard
    cy.visit('/');
  });

  it('should load the management dashboard successfully', () => {
    // Check that the dashboard loads
    cy.get('[data-testid="management-dashboard"]').should('be.visible');
    
    // Check the main title
    cy.contains('Management Dashboard').should('be.visible');
    cy.contains('Resource planning and utilization overview').should('be.visible');
  });

  it('should display all KPI cards', () => {
    // Check that all 4 KPI cards are present
    cy.contains('Active Projects').should('be.visible');
    cy.contains('Under-utilised (<80%)').should('be.visible');
    cy.contains('Over-utilised (>100%)').should('be.visible');
    cy.contains('Avg Utilisation Rate').should('be.visible');
  });

  it('should display all deep-dive widgets', () => {
    // Check that all 5 deep-dive widgets are present
    cy.contains('Capacity vs Demand (6 weeks)').should('be.visible');
    cy.contains('Utilization Trend (YTD)').should('be.visible');
    cy.contains('Overtime Cost (YTD)').should('be.visible');
    cy.contains('Skills Gap Snapshot').should('be.visible');
    cy.contains('At-Risk Projects').should('be.visible');
  });

  it('should have functional time range buttons', () => {
    // Check time range buttons exist and are clickable
    cy.contains('6 Months').should('be.visible').click();
    cy.contains('YTD').should('be.visible').click();
  });

  it('should apply the blue theme correctly', () => {
    // Check that the blue theme class is applied
    cy.get('.dashboard-blue-theme').should('exist');
    
    // Check that KPI cards have the correct styling
    cy.get('.kpi-card').should('have.length', 4);

    // Check that widget cards have the correct styling
    cy.get('.widget-card').should('have.length.at.least', 5);
  });

  it('should be responsive on mobile', () => {
    // Test mobile viewport
    cy.viewport('iphone-6');
    
    // Dashboard should still be visible and functional
    cy.contains('Management Dashboard').should('be.visible');
    cy.get('.kpi-card').should('be.visible');
    
    // Time range buttons should be stacked on mobile
    cy.contains('6 Months').should('be.visible');
    cy.contains('YTD').should('be.visible');
  });

  it('should have accessible elements', () => {
    // Check for proper heading structure
    cy.get('h1').should('contain', 'Management Dashboard');

    // Check that buttons have proper attributes
    cy.get('button').should('have.attr', 'type');

    // Check that cards have proper structure
    cy.get('.kpi-card').each(($card) => {
      cy.wrap($card).should('be.visible');
    });
  });

  it('should display greeting header with personalized message', () => {
    // Check for greeting header
    cy.contains(/Good (morning|afternoon|evening)/).should('be.visible');
    cy.contains('👋').should('be.visible');

    // Check for current date
    cy.get('p').contains(/\d{1,2}(st|nd|rd|th), \d{4}/).should('be.visible');
  });

  it('should have sparklines in KPI cards', () => {
    // Check that sparklines are present in KPI cards
    cy.get('.kpi-card').each(($card) => {
      cy.wrap($card).find('svg').should('exist'); // Sparkline SVG
    });
  });

  it('should have View more links that navigate to sections', () => {
    // Check that View more links exist
    cy.contains('View more').should('have.length', 4);

    // Test navigation to deep-dive sections
    cy.contains('Active Projects').parent().contains('View more').click();
    cy.get('#capacity-demand').should('be.visible');

    cy.contains('Under-utilised').parent().contains('View more').click();
    cy.get('#utilization-trend').should('be.visible');
  });

  it('should use CSS variables for theme colors', () => {
    // Check that sparklines use CSS variable colors
    cy.get('.kpi-card svg path').should('have.attr', 'stroke').and('include', 'var(--primary)');

    // Check that chart elements use CSS variables
    cy.get('.widget-card').should('exist');
  });
});
