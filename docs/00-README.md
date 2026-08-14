# StreetServe — Product & Engineering Blueprint

This is the master planning reference for StreetServe, built before any implementation code, per the "planning before coding" directive. Read in order for a first pass; use as a reference thereafter.

1. [Executive Summary & Requirement Analysis](01-executive-summary-and-requirements.md) — what was reviewed, explicit/hidden requirements, conflicts, recommended improvements. **Start here.**
2. [Product Vision, Personas & Roles](02-product-vision-personas-roles.md)
3. [Complete User Flows](03-user-flows.md)
4. [Feature Breakdown](04-feature-breakdown.md) — MVP vs. V1.x vs. Future
5. [PRD — Functional & Non-Functional Spec](05-prd-functional-spec.md) — business rules, edge cases, acceptance criteria
6. [UX Recommendations & Design System](06-ux-and-design-system.md)
7. [Technical Architecture & Tech Stack](07-technical-architecture-and-stack.md)
8. [Database Design](08-database-design.md)
9. [API Specification & Auth Flow](09-api-specification.md)
10. [Security, Risk & Scalability](10-security-and-scalability.md)
11. [Roadmap, Future Enhancements & Open Questions](11-roadmap-and-open-questions.md) — **the numbered client-clarification list lives here**

## Scope note

StreetServe is treated throughout as **one unified platform with two layers**: a real-time live-map/vendor layer (wave down, line-up discounts, Block Parties, ping sharing) and a consignment/gig-seller layer (AI-assisted mobile selling, Consignment Hubs, Trust Score, Jobs, Shelter Partner Program). They share one map, one identity system, and one payout rail — see §1 of the Product Vision doc for the reasoning.

A WhatsApp conversation and a mobile-business category list referencing a separate project ("Honest Need") were included in the original source material but confirmed out of scope and excluded from this blueprint. The chat log contained content worth independent attention regardless — see the note in the Executive Summary, §2.
