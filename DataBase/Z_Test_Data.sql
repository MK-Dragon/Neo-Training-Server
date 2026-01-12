USE `mydb`;

-- 1. User Roles
INSERT INTO `user_roles` (`title`, `description`) VALUES 
('Admin', 'System administrator with full access'),
('Teacher', 'Instructor responsible for specific modules'),
('Student', 'Learner enrolled in courses and classes');

-- 2. Users (Updated to use role_id)
-- Roles: 1=Admin, 2=Teacher, 3=Student
INSERT INTO `users` (`username`, `email`, `pass_hash`, `role_id`, `activeted`, `birth_date`) VALUES 
('mc', 'mc@example.com', '123', 1, 1, '1993-03-09'),
('admin_jane', 'jane.admin@example.com', 'pbkdf2_sha256_hash', 1, 1, '1985-05-15'),
('teacher_bob', 'bob.instructor@example.com', 'pbkdf2_sha256_hash', 2, 1, '1978-10-20'),
('teacher_alice', 'alice.smith@example.com', 'pbkdf2_sha256_hash', 2, 1, '1982-03-12'),
('student_john', 'john.doe@example.com', 'pbkdf2_sha256_hash', 3, 1, '2002-01-25'),
('student_mary', 'mary.jane@example.com', 'pbkdf2_sha256_hash', 3, 1, '2001-11-30');

-- 3. Audit Log
INSERT INTO `audit` (`user_id`, `token`, `created_at`, `expires_at`, `platform`, `ip_address`) VALUES 
(1, 'session_token_a1b2c3', NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR), 'Chrome/Windows', '192.168.1.10');

-- 4. Courses
INSERT INTO `courses` (`nome_curso`, `duration`, `level`) VALUES 
('Full Stack Development', 1200, 'Advanced'),
('Digital Marketing 101', 600, 'Beginner');

-- 5. Turmas (Classes)
INSERT INTO `turmas` (`turma_name`, `course_id`) VALUES 
('FS-2026-A', 1),
('DM-2026-B', 2);

-- 6. Modules (Updated to use modual_id / duration_h)
INSERT INTO `modules` (`name`, `duration_h`) VALUES 
('Backend Logic', 45),
('Frontend UX', 50),
('Social Media Ads', 30);

-- 7. Course Modules (Linking modules to courses)
INSERT INTO `course_modules` (`course_id`, `module_id`, `order_index`) VALUES 
(1, 1, 1), -- Backend for Full Stack
(1, 2, 2), -- Frontend for Full Stack
(2, 3, 1); -- Ads for Marketing

-- 8. Enrollments (Enrolling students into classes)
INSERT INTO `enrollments` (`student_id`, `turma_id`, `enrollment_date`) VALUES 
(4, 1, '2026-01-02'),
(5, 1, '2026-01-03');

-- 9. Turma Modulo Formador (Assignment: Class + Module + Teacher)
INSERT INTO `turma_modulo_formador` (`turma_id`, `module_id`, `formador_id`) VALUES 
(1, 1, 2), -- Bob teaching Backend to Full Stack
(1, 2, 3), -- Alice teaching Frontend to Full Stack
(2, 3, 2); -- Bob teaching Social Media to Marketing

-- 10. Salas (Rooms)
INSERT INTO `salas` (`sala_nome`, `tem_pcs`, `tem_oficina`) VALUES 
('Computer Lab 1', 1, 0),
('Seminar Room A', 0, 0);

-- 11. Disponibilidades (Teacher Availability)
INSERT INTO `disponibilidades` (`user_id`, `disponivel`, `data_hora`) VALUES 
(2, 1, '2026-01-15 09:00:00'),
(3, 1, '2026-01-15 14:00:00');

-- 12. Horaios Sala Turma (Final Schedule Linking)
INSERT INTO `horaios_sala_turma` (`sala`, `id_turma_modulo_formador`) VALUES 
(1, 1), -- Backend in Lab 1
(1, 2); -- Frontend in Lab 1