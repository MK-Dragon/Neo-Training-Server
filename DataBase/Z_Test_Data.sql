USE `mydb`;

-- 1. User Roles
INSERT INTO `user_roles` (`title`, `description`) VALUES  
('Admin', 'System administrator with full access'),
('Teacher', 'Instructor responsible for specific modules'),
('Student', 'Learner enrolled in courses and classes');

-- 2. Users 
-- Roles: 1=Admin, 2=Teacher, 3=Student
-- Note: IDs will be 1 (mc), 2 (admin_jane), 3 (teacher_bob), 4 (teacher_alice), 5 (student_john), 6 (student_mary)
INSERT INTO `users` (`username`, `email`, `pass_hash`, `role_id`, `activeted`, `birth_date`) VALUES  
('mc', 'mc@example.com', 'uhIIeTqqVHM=', 1, 1, '1993-03-09'),
('admin_jane', 'jane.admin@example.com', 'hash', 1, 1, '1985-05-15'),
('teacher_bob', 'bob.instructor@example.com', 'hash', 2, 1, '1978-10-20'),
('teacher_alice', 'alice.smith@example.com', 'hash', 2, 1, '1982-03-12'),
('student_john', 'john.doe@example.com', 'hash', 3, 1, '2002-01-25'),
('student_mary', 'mary.jane@example.com', 'hash', 3, 1, '2001-11-30'),
-- more students
('Vitor', 'v.doe@example.com', 'hash', 3, 1, '2002-01-25'),
('Grazina', 'gra.doe@example.com', 'hash', 3, 1, '2002-01-25'),
('Filipe', 'fi.doe@example.com', 'hash', 3, 1, '2002-01-25'),
('Leonor', 'leo.jane@example.com', 'hash', 3, 1, '2001-11-30'),
-- more teachers
('Pacheco', 'v.doe@example.com', 'hash', 2, 1, '2002-01-25'),
('Vitor_teacher', 'v_teacher.doe@example.com', 'hash', 2, 1, '2002-01-25'),
('Maria', 'ma.doe@example.com', 'hash', 2, 1, '2002-01-25'),
('Dario', 'dario.teacher@example.com', 'hash', 2, 1, '2001-11-30');

-- 3. Audit Log
INSERT INTO `audit` (`user_id`, `token`, `created_at`, `expires_at`, `platform`, `ip_address`) VALUES  
(1, 'session_token_a1b2c3', NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR), 'Chrome/Windows', '192.168.1.10');

-- 4. Courses
INSERT INTO `courses` (`nome_curso`, `duration`, `level`) VALUES  
('Full Stack Development', 1200, 'Advanced'),
('Digital Marketing 101', 600, 'Beginner');

-- 5. Turmas (Classes)
INSERT INTO `turmas` (`turma_name`, `course_id`, `date_start`, `date_end`) VALUES  
('FS-2025-CLOSED', 1, '2025-09-01', '2026-01-15'),
('DM-2026-SUMMER', 2, '2026-06-01', '2026-08-30'),
('FS-2026-B-LIVE', 1, '2026-01-01', '2026-05-30'),
('DM-WORKSHOP-OPEN', 2, '2026-02-01', NULL),
('FS-2026-CRASH', 1, '2026-01-10', '2026-02-05');

-- 6. Modules
INSERT INTO `modules` (`name`, `duration_h`) VALUES  
('Backend Logic', 45),
('Frontend UX', 50),
('Social Media Ads', 30);

-- 7. Course Modules (Linking modules to courses)
INSERT INTO `course_modules` (`course_id`, `module_id`, `order_index`) VALUES  
(1, 1, 1), 
(1, 2, 2), 
(2, 3, 1);

-- 8. Formador Teaches Module (NEW: Certifying teachers for specific subjects)
INSERT INTO `formador_teaches_module` (`formador_id`, `module_id`) VALUES 
(3, 1), -- Bob can teach Backend
(3, 3), -- Bob can teach Social Media
(4, 2); -- Alice can teach Frontend

-- 9. Enrollments (Enrolling students into classes)
-- Using student IDs 5 and 6
INSERT INTO `enrollments` (`student_id`, `turma_id`, `enrollment_date`) VALUES  
(5, 1, '2026-01-02'),
(6, 1, '2026-01-03');

-- 10. Student Grades (NEW: Assigning grades per module for enrolled students)
INSERT INTO `student_grades` (`id_enrollment`, `module_id`, `grade`) VALUES 
(1, 1, 18), -- Student John (Enrollment 1) got 18 in Backend
(2, 1, 15); -- Student Mary (Enrollment 2) got 15 in Backend

-- 11. Salas (Rooms)
INSERT INTO `salas` (`sala_nome`, `tem_pcs`, `tem_oficina`) VALUES  
('Computer Lab 1', 1, 0),
('Seminar Room A', 0, 0);

-- 12. Disponibilidades (Updated: uses formador_id)
INSERT INTO `disponibilidades` (`formador_id`, `disponivel`, `data_hora`) VALUES  
(3, 1, '2026-02-01 09:00:00'),
(4, 1, '2026-02-01 09:00:00');

-- 13. Schedules (NEW: The updated schedule table)
INSERT INTO `schedules` (`schedule_id`, `turma_id`, `module_id`, `formador_id`, `sala_id`, `date_time`) VALUES 
(1, 1, 1, 3, 1, '2026-02-01 09:00:00'), -- Class A, Backend, Bob, Lab 1
(2, 1, 2, 4, 1, '2026-02-01 14:00:00'); -- Class A, Frontend, Alice, Lab 1