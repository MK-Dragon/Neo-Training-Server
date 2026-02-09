USE `mydb`;

-- 1. Ensure Areas exist
INSERT IGNORE INTO `area_curso` (`id_area`, `area`) VALUES 
(5, 'Cybersecurity'), 
(6, 'Data Science'), 
(7, 'Cloud Computing');

-- 2. Ensure the specific Courses exist
INSERT IGNORE INTO `courses` (`nome_curso`, `duration`, `level`, `id_area`) VALUES  
('Cybersecurity Specialist', 1500, 'Advanced', 5),
('Data Science & AI', 1800, 'Advanced', 6),
('Cloud Computing', 1200, 'Intermediate', 7);

-- 3. Ensure the missing Modules exist
INSERT IGNORE INTO `modules` (`name`, `duration_h`) VALUES 
('Network Security', 50), 
('Machine Learning', 60), 
('AWS Fundamentals', 40);

-- 4. Create the Turmas (Linking to the Course IDs automatically)
INSERT IGNORE INTO `turmas` (`turma_name`, `course_id`, `date_start`, `date_end`) VALUES 
('CYB-2026-A', (SELECT id_cursos FROM courses WHERE nome_curso = 'Cybersecurity Specialist' LIMIT 1), '2026-03-01', '2026-09-01'),
('DAT-2026-A', (SELECT id_cursos FROM courses WHERE nome_curso = 'Data Science & AI' LIMIT 1), '2026-03-15', '2026-11-15'),
('CLD-2026-A', (SELECT id_cursos FROM courses WHERE nome_curso = 'Cloud Computing' LIMIT 1), '2026-03-01', '2026-08-01');


-- 5. Massive Schedule Block
INSERT INTO `schedules` (`turma_id`, `module_id`, `formador_id`, `sala_id`, `date_time`) 
VALUES
-- CYBERSECURITY: Morning Block (08:00 - 13:00) | Teacher Bob (ID 3) | Lab 1
((SELECT turma_id FROM turmas WHERE turma_name = 'CYB-2026-A'), (SELECT module_id FROM modules WHERE name = 'Network Security'), 3, 1, '2026-03-09 08:00:00'),
((SELECT turma_id FROM turmas WHERE turma_name = 'CYB-2026-A'), (SELECT module_id FROM modules WHERE name = 'Network Security'), 3, 1, '2026-03-09 09:00:00'),
((SELECT turma_id FROM turmas WHERE turma_name = 'CYB-2026-A'), (SELECT module_id FROM modules WHERE name = 'Network Security'), 3, 1, '2026-03-09 10:00:00'),
((SELECT turma_id FROM turmas WHERE turma_name = 'CYB-2026-A'), (SELECT module_id FROM modules WHERE name = 'Network Security'), 3, 1, '2026-03-09 11:00:00'),
((SELECT turma_id FROM turmas WHERE turma_name = 'CYB-2026-A'), (SELECT module_id FROM modules WHERE name = 'Network Security'), 3, 1, '2026-03-09 12:00:00'),

-- DATA SCIENCE: Afternoon Shift (14:00 - 18:00) | Teacher Alice (ID 4) | Lab 2
((SELECT turma_id FROM turmas WHERE turma_name = 'DAT-2026-A'), (SELECT module_id FROM modules WHERE name = 'Machine Learning'), 4, 2, '2026-03-09 14:00:00'),
((SELECT turma_id FROM turmas WHERE turma_name = 'DAT-2026-A'), (SELECT module_id FROM modules WHERE name = 'Machine Learning'), 4, 2, '2026-03-09 15:00:00'),
((SELECT turma_id FROM turmas WHERE turma_name = 'DAT-2026-A'), (SELECT module_id FROM modules WHERE name = 'Machine Learning'), 4, 2, '2026-03-09 16:00:00'),
((SELECT turma_id FROM turmas WHERE turma_name = 'DAT-2026-A'), (SELECT module_id FROM modules WHERE name = 'Machine Learning'), 4, 2, '2026-03-09 17:00:00'),

-- CLOUD COMPUTING: Night Shift (19:00 - 23:00) | Teacher Dario (ID 14) | Lab 3
((SELECT turma_id FROM turmas WHERE turma_name = 'CLD-2026-A'), (SELECT module_id FROM modules WHERE name = 'AWS Fundamentals'), 14, 3, '2026-03-09 19:00:00'),
((SELECT turma_id FROM turmas WHERE turma_name = 'CLD-2026-A'), (SELECT module_id FROM modules WHERE name = 'AWS Fundamentals'), 14, 3, '2026-03-09 20:00:00'),
((SELECT turma_id FROM turmas WHERE turma_name = 'CLD-2026-A'), (SELECT module_id FROM modules WHERE name = 'AWS Fundamentals'), 14, 3, '2026-03-09 21:00:00'),
((SELECT turma_id FROM turmas WHERE turma_name = 'CLD-2026-A'), (SELECT module_id FROM modules WHERE name = 'AWS Fundamentals'), 14, 3, '2026-03-09 22:00:00');


SELECT 
    s.date_time, 
    t.turma_name, 
    m.name AS module, 
    u.username AS teacher, 
    sl.sala_nome
FROM schedules s
JOIN turmas t ON s.turma_id = t.turma_id
JOIN modules m ON s.module_id = m.module_id
JOIN users u ON s.formador_id = u.user_id
JOIN salas sl ON s.sala_id = sl.sala_id
ORDER BY s.date_time ASC;
