-- -----------------------------------------------------
-- Randomized Availability for Formadores 11-14
-- -----------------------------------------------------
USE `mydb`;

DELIMITER $$

CREATE PROCEDURE PopulateRandomAvailability()
BEGIN
    DECLARE v_date DATE DEFAULT '2026-01-10'; -- Start of TPSI 05 25
    DECLARE v_end_date DATE DEFAULT '2026-05-05'; -- End of TPSI 05 25
    DECLARE v_hour INT;
    DECLARE v_teacher_id INT;
    
    -- Loop through every day in the course timeframe
    WHILE v_date <= v_end_date DO
        -- Only add availability for weekdays (Monday=0 to Friday=4)
        IF WEEKDAY(v_date) < 5 THEN
            
            SET v_teacher_id = 11;
            WHILE v_teacher_id <= 14 DO
                
                SET v_hour = 8;
                WHILE v_hour <= 22 DO
                    -- Randomness: Only insert if a random number is > 0.3 (70% chance)
                    -- This creates the "gaps" you requested
                    IF RAND() > 0.3 THEN
                        INSERT INTO `disponibilidades` (`formador_id`, `disponivel`, `data_hora`) 
                        VALUES (v_teacher_id, 1, TIMESTAMP(v_date, MAKETIME(v_hour, 0, 0)));
                    END IF;
                    
                    SET v_hour = v_hour + 1;
                END WHILE;
                
                SET v_teacher_id = v_teacher_id + 1;
            END WHILE;
            
        END IF;
        
        SET v_date = DATE_ADD(v_date, INTERVAL 1 DAY);
    END WHILE;
END$$

DELIMITER ;

-- Execute and cleanup
CALL PopulateRandomAvailability();
DROP PROCEDURE IF EXISTS PopulateRandomAvailability;