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

SELECT 
    tm.turma_id,
    t.turma_name,
    tm.module_id,
    m.name AS module_name,
    tm.teacher_id,
    u.username AS teacher_name,
    tm.num_hours_completed,
    tm.isCompleted
FROM mydb.turma_modules tm
INNER JOIN mydb.turmas t ON tm.turma_id = t.turma_id
INNER JOIN mydb.modules m ON tm.module_id = m.module_id
INNER JOIN mydb.users u ON tm.teacher_id = u.user_id;
-- WHERE tm.turma_id = @turmaId;

use mydb;
SELECT 
    t.turma_id, 
    t.turma_name, 
    m.module_id, 
    m.name AS module_name, 
    m.duration_h, 
    cm.order_index,
    m.isDeleted AS module_deleted
FROM turmas t
INNER JOIN courses c ON t.course_id = c.id_cursos
INNER JOIN course_modules cm ON c.id_cursos = cm.course_id
INNER JOIN modules m ON cm.module_id = m.module_id
WHERE t.turma_id = 6 
  AND m.isDeleted = 0  -- Changed from module_deleted to m.isDeleted
ORDER BY cm.order_index ASC;

-- Formador module they teach
SELECT 
    u.username AS formador_name, 
    m.name AS module_name,
    ftm.isDeleted
FROM 
    mydb.formador_teaches_module ftm
JOIN 
    mydb.users u ON ftm.formador_id = u.user_id
JOIN 
    mydb.modules m ON ftm.module_id = m.module_id;
    


