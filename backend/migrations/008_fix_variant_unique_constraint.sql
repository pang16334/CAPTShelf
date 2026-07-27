-- drop old constraint
ALTER TABLE items DROP CONSTRAINT items_name_variant_committee_unique;

-- add new constraint using COALESCE to treat NULL as empty string
CREATE UNIQUE INDEX items_name_variant_committee_unique 
ON items (name, COALESCE(variant, ''), committee_id);