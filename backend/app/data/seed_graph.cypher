CREATE CONSTRAINT supplier_id IF NOT EXISTS FOR (n:Supplier) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT batch_id IF NOT EXISTS FOR (n:Batch) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT kitchen_id IF NOT EXISTS FOR (n:Kitchen) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT dish_id IF NOT EXISTS FOR (n:Dish) REQUIRE n.id IS UNIQUE;

MERGE (supplier:Supplier {id: 'supplier:ncr-fresh-foods'})
SET supplier.name = 'NCR Fresh Foods', supplier.region = 'Delhi-NCR', supplier.status = 'flagged';
MERGE (bad:Batch {id: 'batch:paneer-2026-0918-a'})
SET bad.batchNumber = 'PANEER-2026-0918-A', bad.ingredient = 'Paneer', bad.supplierId = supplier.id,
    bad.status = 'contaminated', bad.flaggedAt = '2026-09-19T09:30:00Z';
MERGE (good:Batch {id: 'batch:paneer-2026-0919-b'})
SET good.batchNumber = 'PANEER-2026-0919-B', good.ingredient = 'Paneer', good.supplierId = supplier.id,
    good.status = 'approved';
MERGE (noida:Kitchen {id: 'kitchen:noida-sector-62'})
SET noida.name = 'NCR Fresh Noida', noida.city = 'Noida', noida.region = 'Noida Sector 62', noida.status = 'operational';
MERGE (gurugram:Kitchen {id: 'kitchen:dlf-phase-3'})
SET gurugram.name = 'NCR Fresh Gurugram', gurugram.city = 'Gurugram', gurugram.region = 'DLF Phase 3', gurugram.status = 'operational';
MERGE (delhi:Kitchen {id: 'kitchen:connaught-place'})
SET delhi.name = 'NCR Fresh Delhi', delhi.city = 'Delhi', delhi.region = 'Connaught Place', delhi.status = 'operational';
MERGE (contrast:Kitchen {id: 'kitchen:dwarka'})
SET contrast.name = 'NCR Fresh Dwarka', contrast.city = 'Delhi', contrast.region = 'Dwarka', contrast.status = 'operational';
MERGE (tikka:Dish {id: 'dish:paneer-tikka'})
SET tikka.name = 'Paneer Tikka', tikka.category = 'Grill', tikka.menuStatus = 'active', tikka.price = 329;
MERGE (kadhai:Dish {id: 'dish:kadhai-paneer'})
SET kadhai.name = 'Kadhai Paneer', kadhai.category = 'Main', kadhai.menuStatus = 'active', kadhai.price = 289;
MERGE (wrap:Dish {id: 'dish:paneer-wrap'})
SET wrap.name = 'Paneer Wrap', wrap.category = 'Quick Service', wrap.menuStatus = 'active', wrap.price = 229;
MERGE (unrelated:Dish {id: 'dish:dal-makhani'})
SET unrelated.name = 'Dal Makhani', unrelated.category = 'Main', unrelated.menuStatus = 'active', unrelated.price = 249;
MERGE (supplier)-[:SUPPLIES]->(bad);
MERGE (supplier)-[:SUPPLIES]->(good);
MERGE (bad)-[:DELIVERED_TO]->(noida);
MERGE (bad)-[:DELIVERED_TO]->(gurugram);
MERGE (bad)-[:DELIVERED_TO]->(delhi);
MERGE (good)-[:DELIVERED_TO]->(contrast);
MERGE (noida)-[:USED_IN]->(tikka);
MERGE (gurugram)-[:USED_IN]->(kadhai);
MERGE (delhi)-[:USED_IN]->(wrap);
MERGE (contrast)-[:USED_IN]->(unrelated);
MERGE (bad)-[:USED_IN]->(tikka);
MERGE (bad)-[:USED_IN]->(kadhai);
MERGE (bad)-[:USED_IN]->(wrap);
