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
  `isDeleted` INT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`),
  INDEX `user_type_idx` (`role_id` ASC) VISIBLE,
  CONSTRAINT `user_type`
    FOREIGN KEY (`role_id`)
    REFERENCES `mydb`.`user_roles` (`role_id`)
    ON DELETE CASCADE
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
  `duration` INT NULL,
  `level` VARCHAR(45) NULL,
  `isDeleted` INT NULL DEFAULT 0,
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
  PRIMARY KEY (`turma_id`),
  INDEX `course_idx` (`course_id` ASC) VISIBLE,
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
  `isDeleted` INT NULL DEFAULT 0,
  PRIMARY KEY (`id_enrollment`),
  INDEX `studant_idx` (`student_id` ASC) VISIBLE,
  INDEX `turma_idx` (`turma_id` ASC) VISIBLE,
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
  `isDeleted` INT NULL DEFAULT 0,
  PRIMARY KEY (`module_id`),
  UNIQUE INDEX `name_UNIQUE` (`name` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`course_modules`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`course_modules` (
  `course_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `order_index` INT NULL,
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
-- Table `mydb`.`turma_modulo_formador`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`turma_modulo_formador` (
  `id_turma_modulo_formador` INT NOT NULL AUTO_INCREMENT,
  `turma_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `formador_id` INT NOT NULL,
  PRIMARY KEY (`id_turma_modulo_formador`),
  INDEX `turma_idx` (`turma_id` ASC) VISIBLE,
  INDEX `module_idx` (`module_id` ASC) VISIBLE,
  INDEX `formador_idx` (`formador_id` ASC) VISIBLE,
  CONSTRAINT `turma_tmf`
    FOREIGN KEY (`turma_id`)
    REFERENCES `mydb`.`turmas` (`turma_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `module_tmf`
    FOREIGN KEY (`module_id`)
    REFERENCES `mydb`.`modules` (`module_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `formador_tmf`
    FOREIGN KEY (`formador_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`salas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`salas` (
  `sala_id` INT NOT NULL AUTO_INCREMENT,
  `sala_nome` VARCHAR(45) NOT NULL,
  `tem_pcs` INT NULL,
  `tem_oficina` INT NULL DEFAULT 0,
  `isDeleted` INT NULL DEFAULT 0,
  PRIMARY KEY (`sala_id`),
  UNIQUE INDEX `sala_nome_UNIQUE` (`sala_nome` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`disponibilidades`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`disponibilidades` (
  `dispo_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `disponivel` INT NOT NULL DEFAULT 0,
  `data_hora` DATETIME NOT NULL,
  PRIMARY KEY (`dispo_id`),
  INDEX `teacher_idx` (`user_id` ASC) VISIBLE,
  CONSTRAINT `teacher`
    FOREIGN KEY (`user_id`)
    REFERENCES `mydb`.`users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`horaios_sala_turma`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`horaios_sala_turma` (
  `horadio_id` INT NOT NULL AUTO_INCREMENT,
  `sala` INT NOT NULL,
  `id_turma_modulo_formador` INT NOT NULL,
  PRIMARY KEY (`horadio_id`),
  INDEX `sala_idx` (`sala` ASC) VISIBLE,
  INDEX `turma_modulo_formador_idx` (`id_turma_modulo_formador` ASC) VISIBLE,
  CONSTRAINT `sala`
    FOREIGN KEY (`sala`)
    REFERENCES `mydb`.`salas` (`sala_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `turma_modulo_formador`
    FOREIGN KEY (`id_turma_modulo_formador`)
    REFERENCES `mydb`.`turma_modulo_formador` (`id_turma_modulo_formador`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
