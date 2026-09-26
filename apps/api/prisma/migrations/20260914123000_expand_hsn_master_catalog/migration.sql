-- Candidate HSN headings for the current Sirohi Point product catalogue.
-- Product-level selection remains available because final classification depends
-- on material, construction and intended use.
INSERT INTO "HsnMaster" ("id", "code", "description", "cgstRate", "sgstRate", "igstRate") VALUES
('00000000-0000-4000-8000-000000002008', '8481', 'Taps, cocks, valves and similar appliances', 9, 9, 18),
('00000000-0000-4000-8000-000000002009', '7412', 'Copper tube or pipe fittings', 9, 9, 18),
('00000000-0000-4000-8000-000000002010', '7307', 'Iron or steel tube or pipe fittings', 9, 9, 18),
('00000000-0000-4000-8000-000000002011', '3922', 'Plastic sanitary ware', 9, 9, 18),
('00000000-0000-4000-8000-000000002012', '8537', 'Boards, panels and consoles for electric control', 9, 9, 18),
('00000000-0000-4000-8000-000000002013', '8544', 'Insulated wires and cables', 9, 9, 18),
('00000000-0000-4000-8000-000000002014', '8539', 'Electric filament and LED lamps', 9, 9, 18),
('00000000-0000-4000-8000-000000002015', '8516', 'Electric water heaters and other electro-thermic appliances', 9, 9, 18),
('00000000-0000-4000-8000-000000002016', '8413', 'Pumps for liquids', 9, 9, 18),
('00000000-0000-4000-8000-000000002017', '3208', 'Paints and varnishes in non-aqueous medium', 9, 9, 18),
('00000000-0000-4000-8000-000000002018', '3210', 'Other paints and varnishes', 9, 9, 18),
('00000000-0000-4000-8000-000000002019', '3214', 'Putty, mastics and painters fillings', 9, 9, 18),
('00000000-0000-4000-8000-000000002020', '9603', 'Brooms, brushes and paint brushes', 9, 9, 18),
('00000000-0000-4000-8000-000000002021', '7315', 'Iron or steel chain', 9, 9, 18),
('00000000-0000-4000-8000-000000002022', '8201', 'Agricultural hand tools', 9, 9, 18),
('00000000-0000-4000-8000-000000002023', '8203', 'Pliers, pincers and similar hand tools', 9, 9, 18),
('00000000-0000-4000-8000-000000002024', '8205', 'Other hand tools', 9, 9, 18),
('00000000-0000-4000-8000-000000002025', '8433', 'Harvesting or threshing machinery', 9, 9, 18),
('00000000-0000-4000-8000-000000002026', '8436', 'Other agricultural machinery', 9, 9, 18),
('00000000-0000-4000-8000-000000002027', '8211', 'Knives with cutting blades', 9, 9, 18),
('00000000-0000-4000-8000-000000002028', '9613', 'Cigarette lighters and other lighters', 9, 9, 18),
('00000000-0000-4000-8000-000000002029', '8513', 'Portable electric lamps', 9, 9, 18),
('00000000-0000-4000-8000-000000002030', '3923', 'Plastic containers and packing articles', 9, 9, 18),
('00000000-0000-4000-8000-000000002031', '8302', 'Base metal mountings and fittings', 9, 9, 18),
('00000000-0000-4000-8000-000000002032', '7326', 'Other articles of iron or steel', 9, 9, 18),
('00000000-0000-4000-8000-000000002033', '6912', 'Ceramic tableware and household articles', 9, 9, 18),
('00000000-0000-4000-8000-000000002034', '3402', 'Organic surface-active and cleaning preparations', 9, 9, 18),
('00000000-0000-4000-8000-000000002035', '3506', 'Prepared glues and adhesives', 9, 9, 18)
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description", "cgstRate" = EXCLUDED."cgstRate", "sgstRate" = EXCLUDED."sgstRate", "igstRate" = EXCLUDED."igstRate", "active" = true, "updatedAt" = CURRENT_TIMESTAMP;
