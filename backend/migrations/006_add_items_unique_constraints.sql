ALTER TABLE items
ADD CONSTRAINT items_name_variant_committee_unique
UNIQUE (name, variant, committee_id);