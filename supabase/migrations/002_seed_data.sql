-- ============================================================================
-- IPD Budget App — Seed Data
-- ============================================================================

-- ============================================================================
-- BUSINESS UNITS
-- ============================================================================
INSERT INTO business_units (name, color, sort_order) VALUES
  ('Vaccine Manufacturing', '#1e40af', 1),
  ('Diagnostic Manufacturing', '#059669', 2),
  ('Clinical Laboratory Services', '#7c3aed', 3),
  ('Public Health', '#dc2626', 4),
  ('R&D (Research & Innovation)', '#d97706', 5),
  ('Product Development & Innovation', '#0891b2', 6),
  ('Education & Training', '#be185d', 7),
  ('Institutional Functions', '#4b5563', 8);

-- ============================================================================
-- OPERATIONAL UNITS
-- ============================================================================
-- Vaccine Manufacturing
INSERT INTO operational_units (business_unit_id, name, sort_order) VALUES
  ((SELECT id FROM business_units WHERE name='Vaccine Manufacturing'), 'AfricAmaril', 1),
  ((SELECT id FROM business_units WHERE name='Vaccine Manufacturing'), 'Assurance Qualité - Garap', 2),
  ((SELECT id FROM business_units WHERE name='Vaccine Manufacturing'), 'DAVAX', 3),
  ((SELECT id FROM business_units WHERE name='Vaccine Manufacturing'), 'LCQ - Garap', 4),
  ((SELECT id FROM business_units WHERE name='Vaccine Manufacturing'), 'MADIBA', 5),
  ((SELECT id FROM business_units WHERE name='Vaccine Manufacturing'), 'Pharmacien Responsable - Garap', 6),
  ((SELECT id FROM business_units WHERE name='Vaccine Manufacturing'), 'Production - Garap', 7),
  ((SELECT id FROM business_units WHERE name='Vaccine Manufacturing'), 'SMS - Maintenance Scientifique Garap', 8),
  ((SELECT id FROM business_units WHERE name='Vaccine Manufacturing'), 'Regional Training Hub - MADIBA Support', 9);

-- Diagnostic Manufacturing
INSERT INTO operational_units (business_unit_id, name, sort_order) VALUES
  ((SELECT id FROM business_units WHERE name='Diagnostic Manufacturing'), 'Diatropix (Mbao)', 1);

-- Clinical Laboratory Services
INSERT INTO operational_units (business_unit_id, name, sort_order) VALUES
  ((SELECT id FROM business_units WHERE name='Clinical Laboratory Services'), 'CVI', 1),
  ((SELECT id FROM business_units WHERE name='Clinical Laboratory Services'), 'LBM', 2),
  ((SELECT id FROM business_units WHERE name='Clinical Laboratory Services'), 'LSAHE', 3);

-- Public Health
INSERT INTO operational_units (business_unit_id, name, sort_order) VALUES
  ((SELECT id FROM business_units WHERE name='Public Health'), 'Direction Santé Publique', 1);

-- R&D
INSERT INTO operational_units (business_unit_id, name, sort_order) VALUES
  ((SELECT id FROM business_units WHERE name='R&D (Research & Innovation)'), 'Biobanque', 1),
  ((SELECT id FROM business_units WHERE name='R&D (Research & Innovation)'), 'Direction Scientifique', 2),
  ((SELECT id FROM business_units WHERE name='R&D (Research & Innovation)'), 'Epidémiologie', 3),
  ((SELECT id FROM business_units WHERE name='R&D (Research & Innovation)'), 'Ferme de MBAO', 4),
  ((SELECT id FROM business_units WHERE name='R&D (Research & Innovation)'), 'G4 Paludisme / Mega', 5),
  ((SELECT id FROM business_units WHERE name='R&D (Research & Innovation)'), 'IMI', 6),
  ((SELECT id FROM business_units WHERE name='R&D (Research & Innovation)'), 'Microbiologie', 7),
  ((SELECT id FROM business_units WHERE name='R&D (Research & Innovation)'), 'Stations de Recherche', 8),
  ((SELECT id FROM business_units WHERE name='R&D (Research & Innovation)'), 'Virologie', 9),
  ((SELECT id FROM business_units WHERE name='R&D (Research & Innovation)'), 'Zoologie', 10);

-- Product Development & Innovation
INSERT INTO operational_units (business_unit_id, name, sort_order) VALUES
  ((SELECT id FROM business_units WHERE name='Product Development & Innovation'), 'Diatropix (R&D)', 1),
  ((SELECT id FROM business_units WHERE name='Product Development & Innovation'), 'Vaccine Research Center', 2);

-- Education & Training
INSERT INTO operational_units (business_unit_id, name, sort_order) VALUES
  ((SELECT id FROM business_units WHERE name='Education & Training'), 'CARE', 1),
  ((SELECT id FROM business_units WHERE name='Education & Training'), 'Regional Training Hub', 2);

-- Institutional Functions
INSERT INTO operational_units (business_unit_id, name, sort_order) VALUES
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'Achats - Approvisionnements', 1),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'Administration Générale', 2),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'Delivery Unit / Bureau Exécutif', 3),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'Direction Digitalisation & SI', 4),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'Direction Financière & Comptable', 5),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'Direction du Capital Humain', 6),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'Magasin Général', 7),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'Medecine du Travail', 8),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'Métrologie', 9),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'Partenariats & Communication', 10),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'Produits & Charges Communes', 11),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'SMTI', 12),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'QHSE', 13),
  ((SELECT id FROM business_units WHERE name='Institutional Functions'), 'Transit', 14);

-- ============================================================================
-- BUDGET LINES
-- ============================================================================
INSERT INTO budget_lines (name, category, sort_order) VALUES
  ('Ventes de Vaccins / Tests', 'revenue', 1),
  ('Vente de Services', 'revenue', 2),
  ('Autres produits', 'revenue', 3),
  ('Matières Premières', 'opex', 4),
  ('Consommables Labo', 'opex', 5),
  ('Utilités', 'opex', 6),
  ('Sous traitance', 'opex', 7),
  ('Réparations', 'opex', 8),
  ('Assurance', 'opex', 9),
  ('Consultance', 'opex', 10),
  ('Frais de Personnel', 'opex', 11),
  ('Frais de Formation', 'opex', 12),
  ('Frais Mission/Restauration', 'opex', 13),
  ('Amortissements', 'opex', 14),
  ('Autres Charges', 'opex', 15),
  ('Bâtiments, Matériels & Equipements', 'capex', 16);

-- ============================================================================
-- HISTORICAL ENTRIES
-- ============================================================================
INSERT INTO historical_entries (budget_line_id, year, amount)
SELECT bl.id, h.year, h.amount
FROM (VALUES
  ('Ventes de Vaccins / Tests', '2023', 327978500),
  ('Vente de Services', '2023', 5250508500),
  ('Autres produits', '2023', 0),
  ('Matières Premières', '2023', 451696025),
  ('Consommables Labo', '2023', 2628632564),
  ('Utilités', '2023', 535277373),
  ('Sous traitance', '2023', 567112118),
  ('Réparations', '2023', 344596475),
  ('Assurance', '2023', 94230958),
  ('Consultance', '2023', -132442146),
  ('Frais de Personnel', '2023', 6021608487),
  ('Frais de Formation', '2023', 93966960),
  ('Frais Mission/Restauration', '2023', 446227187),
  ('Amortissements', '2023', 851843994),
  ('Autres Charges', '2023', -935799892),
  ('Bâtiments, Matériels & Equipements', '2023', 17638892476),
  ('Ventes de Vaccins / Tests', '2024', 0),
  ('Vente de Services', '2024', 5144392610),
  ('Autres produits', '2024', 0),
  ('Matières Premières', '2024', 333867743),
  ('Consommables Labo', '2024', 3843006784),
  ('Utilités', '2024', 610997135),
  ('Sous traitance', '2024', 879030848),
  ('Réparations', '2024', 308140100),
  ('Assurance', '2024', 162126452),
  ('Consultance', '2024', 1060373240),
  ('Frais de Personnel', '2024', 7824293190),
  ('Frais de Formation', '2024', 100375893),
  ('Frais Mission/Restauration', '2024', 632442263),
  ('Amortissements', '2024', 474806647),
  ('Autres Charges', '2024', 673780076),
  ('Bâtiments, Matériels & Equipements', '2024', 14278696860),
  ('Ventes de Vaccins / Tests', '2025_est', 0),
  ('Vente de Services', '2025_est', 6694161925),
  ('Autres produits', '2025_est', 0),
  ('Matières Premières', '2025_est', 1123845701),
  ('Consommables Labo', '2025_est', 4358170504),
  ('Utilités', '2025_est', 306890298),
  ('Sous traitance', '2025_est', 2940124424),
  ('Réparations', '2025_est', 329070050),
  ('Assurance', '2025_est', 128563226),
  ('Consultance', '2025_est', 1004124289),
  ('Frais de Personnel', '2025_est', 7821971048),
  ('Frais de Formation', '2025_est', 52197810),
  ('Frais Mission/Restauration', '2025_est', 339850532),
  ('Amortissements', '2025_est', 508162124),
  ('Autres Charges', '2025_est', 334708096),
  ('Bâtiments, Matériels & Equipements', '2025_est', 8861278312)
) AS h(line_name, year, amount)
JOIN budget_lines bl ON bl.name = h.line_name;
