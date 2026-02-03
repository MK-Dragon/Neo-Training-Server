SELECT * FROM mydb.users;


SELECT * FROM mydb.formador_teaches_module;


SELECT * FROM mydb.modules;


-- Test for "Active" Turmas logic:
SELECT turma_name, date_end 
FROM turmas 
WHERE isDeleted = 0 
AND (date_end IS NULL OR date_end >= CURDATE());

-- Test for "Finished" Trumas logic:
SELECT turma_name, date_end 
FROM turmas 
WHERE date_end < CURDATE();

SELECT * FROM mydb.turma_modules;


