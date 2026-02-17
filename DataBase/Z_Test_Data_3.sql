USE `mydb`;

-- Adding New Teachers
INSERT IGNORE INTO `users` (`username`, `email`, `pass_hash`, `role_id`, `activeted`, `birth_date`) VALUES  
('Isabel_teacher', 'isabel.t@example.com', 'hash', 2, 1, '1988-07-15'),
('Nuno_teacher', 'nuno.t@example.com', 'hash', 2, 1, '1980-11-05');

-- Adding New Students
INSERT IGNORE INTO `users` (`username`, `email`, `pass_hash`, `role_id`, `activeted`, `birth_date`) VALUES  
('Beatriz_student', 'b.stu@example.com', 'hash', 3, 1, '2003-04-12'),
('Tiago_student', 't.stu@example.com', 'hash', 3, 1, '2004-01-20'),
('Diana_student', 'd.stu@example.com', 'hash', 3, 1, '2003-09-10'),
('Andre_student', 'a.stu@example.com', 'hash', 3, 1, '2002-12-05');

-- Certifying Isabel for Frontend (JavaScript & HTML)
INSERT IGNORE INTO `formador_teaches_module` (`formador_id`, `module_id`) VALUES 
((SELECT user_id FROM users WHERE username = 'Isabel_teacher'), (SELECT module_id FROM modules WHERE name = 'JavaScript')),
((SELECT user_id FROM users WHERE username = 'Isabel_teacher'), (SELECT module_id FROM modules WHERE name = 'HTML'));

-- Certifying Nuno for Backend
INSERT IGNORE INTO `formador_teaches_module` (`formador_id`, `module_id`) VALUES 
((SELECT user_id FROM users WHERE username = 'Nuno_teacher'), (SELECT module_id FROM modules WHERE name = 'Backend Logic'));

-- Assigning Isabel to teach JavaScript for FSD 02 26
INSERT IGNORE INTO `turma_modules` (`turma_id`, `module_id`, `teacher_id`, `num_hours_completed`, `isCompleted`) VALUES
((SELECT turma_id FROM turmas WHERE turma_name = 'FSD 02 26'), 
 (SELECT module_id FROM modules WHERE name = 'JavaScript'), 
 (SELECT user_id FROM users WHERE username = 'Isabel_teacher'), 
 0, 0);

-- Assigning Nuno to teach Backend Logic for FSD 02 26
INSERT IGNORE INTO `turma_modules` (`turma_id`, `module_id`, `teacher_id`, `num_hours_completed`, `isCompleted`) VALUES
((SELECT turma_id FROM turmas WHERE turma_name = 'FSD 02 26'), 
 (SELECT module_id FROM modules WHERE name = 'Backend Logic'), 
 (SELECT user_id FROM users WHERE username = 'Nuno_teacher'), 
 0, 0);
 
 -- Enrolling Beatriz and Tiago into FSD 02 26
INSERT IGNORE INTO `enrollments` (`student_id`, `turma_id`, `enrollment_date`) VALUES  
((SELECT user_id FROM users WHERE username = 'Beatriz_student'), (SELECT turma_id FROM turmas WHERE turma_name = 'FSD 02 26'), '2026-02-10'),
((SELECT user_id FROM users WHERE username = 'Tiago_student'), (SELECT turma_id FROM turmas WHERE turma_name = 'FSD 02 26'), '2026-02-11');

-- Enrolling Diana and Andre into TPS 05 25
INSERT IGNORE INTO `enrollments` (`student_id`, `turma_id`, `enrollment_date`) VALUES  
((SELECT user_id FROM users WHERE username = 'Diana_student'), (SELECT turma_id FROM turmas WHERE turma_name = 'TPS 05 25'), '2026-01-05'),
((SELECT user_id FROM users WHERE username = 'Andre_student'), (SELECT turma_id FROM turmas WHERE turma_name = 'TPS 05 25'), '2026-01-06');


SELECT 
    t.turma_name, 
    m.name AS module_name, 
    u.username AS assigned_teacher
FROM turma_modules tm
JOIN turmas t ON tm.turma_id = t.turma_id
JOIN modules m ON tm.module_id = m.module_id
JOIN users u ON tm.teacher_id = u.user_id
WHERE t.turma_name = 'FSD 02 26';

