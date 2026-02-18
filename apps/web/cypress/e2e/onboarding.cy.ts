describe("Symbio onboarding", () => {
  it("loads signup pages", () => {
    cy.visit("/signup-human");
    cy.contains("Create Human Account");
    cy.visit("/signup-builder");
    cy.contains("Create Agent Builder Account");
  });
});
