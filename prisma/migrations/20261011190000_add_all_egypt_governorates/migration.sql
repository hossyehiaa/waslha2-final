-- Add the remaining Egyptian governorates as selectable shipment cities.
-- Keep existing city records untouched; this migration only inserts missing entries.
INSERT INTO "City" ("id", "name", "code", "governorate", "pricingBand", "standardPrice", "status")
VALUES
  ('egypt-city-port-said', 'Port Said', 'PTD', 'Port Said', 'IMAGE_85', 85, 'ACTIVE'),
  ('egypt-city-suez', 'Suez', 'SUE', 'Suez', 'IMAGE_85', 85, 'ACTIVE'),
  ('egypt-city-damietta', 'Damietta', 'DAM', 'Damietta', 'IMAGE_85', 85, 'ACTIVE'),
  ('egypt-city-zagazig', 'Zagazig', 'SHR', 'Sharqia', 'IMAGE_85', 85, 'ACTIVE'),
  ('egypt-city-benha', 'Benha', 'QAL', 'Qalyubia', 'IMAGE_85', 85, 'ACTIVE'),
  ('egypt-city-kafr-el-sheikh', 'Kafr El Sheikh', 'KFS', 'Kafr El Sheikh', 'IMAGE_85', 85, 'ACTIVE'),
  ('egypt-city-shibin-el-kom', 'Shibin El Kom', 'MNF', 'Monufia', 'IMAGE_85', 85, 'ACTIVE'),
  ('egypt-city-damanhur', 'Damanhur', 'BHR', 'Beheira', 'IMAGE_85', 85, 'ACTIVE'),
  ('egypt-city-ismailia', 'Ismailia', 'ISM', 'Ismailia', 'IMAGE_85', 85, 'ACTIVE'),
  ('egypt-city-beni-suef', 'Beni Suef', 'BSF', 'Beni Suef', 'UPPER_EGYPT', 100, 'ACTIVE'),
  ('egypt-city-fayoum', 'Fayoum', 'FYM', 'Fayoum', 'UPPER_EGYPT', 100, 'ACTIVE'),
  ('egypt-city-minya', 'Minya', 'MNY', 'Minya', 'UPPER_EGYPT', 100, 'ACTIVE'),
  ('egypt-city-assiut', 'Assiut', 'AST', 'Assiut', 'UPPER_EGYPT', 100, 'ACTIVE'),
  ('egypt-city-sohag', 'Sohag', 'SHG', 'Sohag', 'UPPER_EGYPT', 100, 'ACTIVE'),
  ('egypt-city-qena', 'Qena', 'QNA', 'Qena', 'UPPER_EGYPT', 100, 'ACTIVE'),
  ('egypt-city-luxor', 'Luxor', 'LXR', 'Luxor', 'UPPER_EGYPT', 100, 'ACTIVE'),
  ('egypt-city-hurghada', 'Hurghada', 'RSH', 'Red Sea', 'NEW_VALLEY_HURGHADA', 110, 'ACTIVE'),
  ('egypt-city-kharga', 'Kharga', 'WAD', 'New Valley', 'NEW_VALLEY_HURGHADA', 110, 'ACTIVE'),
  ('egypt-city-marsa-matruh', 'Marsa Matruh', 'MTR', 'Matrouh', 'IMAGE_85', 85, 'ACTIVE'),
  ('egypt-city-al-arish', 'Al Arish', 'NSN', 'North Sinai', 'IMAGE_85', 85, 'ACTIVE'),
  ('egypt-city-sharm-el-sheikh', 'Sharm El Sheikh', 'SSN', 'South Sinai', 'SHARM_EL_SHEIKH', 135, 'ACTIVE')
ON CONFLICT DO NOTHING;
