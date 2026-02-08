-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `mydb` DEFAULT CHARACTER SET utf8 ;
USE `mydb` ;

-- -----------------------------------------------------
-- Table `mydb`.`user_roles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`user_roles` (
  `role_id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(45) NOT NULL,
  `description` VARCHAR(256) NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE INDEX `title_UNIQUE` (`title` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`files`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`files` (
  `file_id` INT NOT NULL AUTO_INCREMENT,
  `file_name` VARCHAR(256) NOT NULL,
  `file_type` VARCHAR(128) NULL,
  `file_size_bytes` INT NULL,
  `file_path` VARCHAR(512) NULL,
  `file_data` LONGBLOB NULL,
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isDeleted` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`file_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`users` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(45) NOT NULL,
  `email` VARCHAR(45) NOT NULL,
  `pass_hash` VARCHAR(256) NULL,
  `role_id` INT NOT NULL,
  `activeted` INT NOT NULL DEFAULT 0,
  `birth_date` DATE NULL,
  `Provider` VARCHAR(45) NULL,
  `ProviderKey` TEXT NULL,
  `isDeleted` INT NOT NULL DEFAULT 0,
  `profile_image` INT NULL,
  PRIMARY KEY (`user_id`),
  INDEX `user_type_idx` (`role_id` ASC) VISIBLE,
  INDEX `user_photo_idx` (`profile_image` ASC) VISIBLE,
  CONSTRAINT `user_type`
    FOREIGN KEY (`role_id`)
    REFERENCES `mydb`.`user_roles` (`role_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `user_photo`
    FOREIGN KEY (`profile_image`)
    REFERENCES `mydb`.`files` (`file_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`audit`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`audit` (
  `audit_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `token` TEXT NULL,
  `created_at` DATETIME NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `platform` VARCHAR(256) NULL,
  `ip_address` VARCHAR(45) NULL,
  PRIMARY KEY (`audit_id`),
  INDEX `user_id_idx` (`user_id` ASC) VISIBLE,
  CONSTRAINT `user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`courses`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`courses` (
  `id_cursos` INT NOT NULL AUTO_INCREMENT,
  `nome_curso` VARCHAR(45) NOT NULL,
  `duration` INT NOT NULL,
  `level` VARCHAR(45) NULL,
  `isDeleted` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_cursos`),
  UNIQUE INDEX `nome_curso_UNIQUE` (`nome_curso` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`turmas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`turmas` (
  `turma_id` INT NOT NULL AUTO_INCREMENT,
  `turma_name` VARCHAR(45) NOT NULL,
  `course_id` INT NOT NULL,
  `isDeleted` INT NOT NULL DEFAULT 0,
  `date_start` DATE NULL,
  `date_end` DATE NULL,
  PRIMARY KEY (`turma_id`),
  INDEX `course_idx` (`course_id` ASC) VISIBLE,
  UNIQUE INDEX `turma_name_UNIQUE` (`turma_name` ASC) VISIBLE,
  CONSTRAINT `course_turma`
    FOREIGN KEY (`course_id`)
    REFERENCES `mydb`.`courses` (`id_cursos`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`enrollments`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`enrollments` (
  `id_enrollment` INT NOT NULL AUTO_INCREMENT,
  `student_id` INT NOT NULL,
  `turma_id` INT NOT NULL,
  `enrollment_date` DATE NOT NULL,
  `isDeleted` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_enrollment`),
  INDEX `studant_idx` (`student_id` ASC) VISIBLE,
  INDEX `turma_idx` (`turma_id` ASC) VISIBLE,
  UNIQUE INDEX `id_unic_student_turma` (`student_id` ASC, `turma_id` ASC) VISIBLE,
  CONSTRAINT `studant`
    FOREIGN KEY (`student_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `turma`
    FOREIGN KEY (`turma_id`)
    REFERENCES `mydb`.`turmas` (`turma_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`modules`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`modules` (
  `module_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NOT NULL,
  `duration_h` INT NOT NULL,
  `isDeleted` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`module_id`),
  UNIQUE INDEX `name_UNIQUE` (`name` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`course_modules`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`course_modules` (
  `course_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `isDeleted` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`course_id`, `module_id`),
  INDEX `modual_idx` (`module_id` ASC) VISIBLE,
  CONSTRAINT `course_module`
    FOREIGN KEY (`course_id`)
    REFERENCES `mydb`.`courses` (`id_cursos`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `modual`
    FOREIGN KEY (`module_id`)
    REFERENCES `mydb`.`modules` (`module_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`salas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`salas` (
  `sala_id` INT NOT NULL AUTO_INCREMENT,
  `sala_nome` VARCHAR(45) NOT NULL,
  `tem_pcs` INT NOT NULL,
  `tem_oficina` INT NOT NULL DEFAULT 0,
  `isDeleted` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`sala_id`),
  UNIQUE INDEX `sala_nome_UNIQUE` (`sala_nome` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`disponibilidades`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`disponibilidades` (
  `dispo_id` INT NOT NULL AUTO_INCREMENT,
  `formador_id` INT NOT NULL,
  `disponivel` INT NOT NULL DEFAULT 0,
  `data_hora` DATETIME NOT NULL,
  PRIMARY KEY (`dispo_id`),
  INDEX `teacher_idx` (`formador_id` ASC) VISIBLE,
  INDEX `unique_teacher-time` (`formador_id` ASC, `data_hora` ASC) INVISIBLE,
  CONSTRAINT `teacher`
    FOREIGN KEY (`formador_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`formador_teaches_module`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`formador_teaches_module` (
  `formador_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `isDeleted` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`formador_id`, `module_id`),
  INDEX `module_idx` (`module_id` ASC) VISIBLE,
  CONSTRAINT `formador`
    FOREIGN KEY (`formador_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `module`
    FOREIGN KEY (`module_id`)
    REFERENCES `mydb`.`modules` (`module_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`student_grades`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`student_grades` (
  `id_enrollment` INT NOT NULL,
  `module_id` INT NOT NULL,
  `grade` INT NULL,
  PRIMARY KEY (`id_enrollment`, `module_id`),
  INDEX `module_idx` (`module_id` ASC) VISIBLE,
  CONSTRAINT `student_grade`
    FOREIGN KEY (`id_enrollment`)
    REFERENCES `mydb`.`enrollments` (`id_enrollment`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `module_grade`
    FOREIGN KEY (`module_id`)
    REFERENCES `mydb`.`modules` (`module_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`schedules`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`schedules` (
  `schedule_id` INT NOT NULL AUTO_INCREMENT,
  `turma_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `formador_id` INT NOT NULL,
  `sala_id` INT NOT NULL,
  `date_time` DATETIME NOT NULL,
  PRIMARY KEY (`schedule_id`),
  INDEX `turma_idx` (`turma_id` ASC) VISIBLE,
  INDEX `module_idx` (`module_id` ASC) VISIBLE,
  INDEX `formador_idx` (`formador_id` ASC) VISIBLE,
  INDEX `sala_idx` (`sala_id` ASC) VISIBLE,
  INDEX `unique_sala_time` (`sala_id` ASC, `date_time` ASC) VISIBLE,
  CONSTRAINT `turma_schedule`
    FOREIGN KEY (`turma_id`)
    REFERENCES `mydb`.`turmas` (`turma_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `module_schedule`
    FOREIGN KEY (`module_id`)
    REFERENCES `mydb`.`modules` (`module_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `formador_schedule`
    FOREIGN KEY (`formador_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `sala_schedule`
    FOREIGN KEY (`sala_id`)
    REFERENCES `mydb`.`salas` (`sala_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`turma_modules`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`turma_modules` (
  `turma_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `teacher_id` INT NOT NULL,
  `num_hours_completed` INT NOT NULL DEFAULT 0,
  `isCompleted` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`turma_id`, `module_id`),
  INDEX `module-turma_idx` (`module_id` ASC) VISIBLE,
  INDEX `module-turma-teacher_idx` (`teacher_id` ASC) VISIBLE,
  CONSTRAINT `turma-module`
    FOREIGN KEY (`turma_id`)
    REFERENCES `mydb`.`turmas` (`turma_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `module-turma`
    FOREIGN KEY (`module_id`)
    REFERENCES `mydb`.`modules` (`module_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `module-turma-teacher`
    FOREIGN KEY (`teacher_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`summaries`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`summaries` (
  `summary_id` INT NOT NULL,
  `summary_text` VARCHAR(512) NULL,
  PRIMARY KEY (`summary_id`),
  CONSTRAINT `summay_schedule`
    FOREIGN KEY (`summary_id`)
    REFERENCES `mydb`.`schedules` (`schedule_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`pre_enrollment`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`pre_enrollment` (
  `pre_enroll_id` INT NOT NULL AUTO_INCREMENT,
  `student_id` INT NOT NULL,
  `turma_id` INT NOT NULL,
  `isDeleted` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`pre_enroll_id`),
  INDEX `student_id_pre_enroll_idx` (`student_id` ASC) VISIBLE,
  INDEX `course_turma_choosen_idx` (`turma_id` ASC) VISIBLE,
  UNIQUE INDEX `user_turma_only_once` (`student_id` ASC, `turma_id` ASC) VISIBLE,
  CONSTRAINT `student_id_pre_enroll`
    FOREIGN KEY (`student_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `course_turma_choosen`
    FOREIGN KEY (`turma_id`)
    REFERENCES `mydb`.`turmas` (`turma_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
