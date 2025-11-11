-- Database Backup
-- Date: 2025-11-07T07:19:54.801Z
-- Database: cavendish_appointment_system


-- Table: appointments
DROP TABLE IF EXISTS `appointments`;
CREATE TABLE `appointments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `appointment_code` varchar(50) NOT NULL,
  `student_id` int(11) NOT NULL,
  `official_id` int(11) NOT NULL,
  `purpose` text NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `mode` enum('Virtual','Physical') NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointment_code` (`appointment_code`),
  KEY `student_id` (`student_id`),
  KEY `official_id` (`official_id`),
  CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`official_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table: appointments
INSERT INTO `appointments` (`id`, `appointment_code`, `student_id`, `official_id`, `purpose`, `appointment_date`, `appointment_time`, `mode`, `status`, `created_at`) VALUES (1, 'CAV-20251105-U1RL', 5, 4, 'wwwww', '2025-11-05 22:00:00', '18:55:00', 'Virtual', 'approved', '2025-11-05 14:53:42');


-- Table: official_availability
DROP TABLE IF EXISTS `official_availability`;
CREATE TABLE `official_availability` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `official_id` int(11) NOT NULL,
  `day_of_week` enum('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_official_day` (`official_id`,`day_of_week`),
  CONSTRAINT `official_availability_ibfk_1` FOREIGN KEY (`official_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `student_number` varchar(50) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('student','admin','official') NOT NULL,
  `status` enum('pending','active','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `student_number` (`student_number`),
  KEY `idx_student_number` (`student_number`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table: users
INSERT INTO `users` (`id`, `full_name`, `email`, `student_number`, `title`, `password_hash`, `role`, `status`, `created_at`) VALUES (1, 'System Admin', 'admin@cavendish.edu.zm', NULL, NULL, '$2b$10$K6LqcGBhkoG23UpHwu2FDu2XwvXLTUnIcBE6BFSdVBlJxmDhURLm2', 'admin', 'active', '2025-11-05 14:37:48');
INSERT INTO `users` (`id`, `full_name`, `email`, `student_number`, `title`, `password_hash`, `role`, `status`, `created_at`) VALUES (2, 'Precious Mate', 'dean@cavendish.edu.zm', NULL, 'Dean of Students', '$2b$10$b4zVTVdGbo8xDYWeP.BDO.lG3t8VJvDIWXnAc7PlPbcKa/F3qJqnu', 'official', 'active', '2025-11-05 14:37:49');
INSERT INTO `users` (`id`, `full_name`, `email`, `student_number`, `title`, `password_hash`, `role`, `status`, `created_at`) VALUES (3, 'Susan Banda', 'susan@gmail.com', '123456', NULL, '$2b$10$bAus/bQGiPnBAplPzxGDVOGdxCdTtYoZvlLwX682NRn6cSCs9Cxpy', 'student', 'active', '2025-11-05 14:38:42');
INSERT INTO `users` (`id`, `full_name`, `email`, `student_number`, `title`, `password_hash`, `role`, `status`, `created_at`) VALUES (4, 'Banda Luckson', 'banda@gmail.com', NULL, 'Academic Officer', '$2b$10$QtN1h45/WuFtPUizf5Hk7.FNW6W8BVXIF150vNaBLR6UKGOIraJNe', 'official', 'active', '2025-11-05 14:40:22');
INSERT INTO `users` (`id`, `full_name`, `email`, `student_number`, `title`, `password_hash`, `role`, `status`, `created_at`) VALUES (5, 'Mika Nsama', 'mika@gmail.com', '109887', NULL, '$2b$10$gIb7K8f263.Lre8si09lM.7RjJwgfJjvPIr/ytWeilr1VNHeqdyS2', 'student', 'active', '2025-11-05 14:47:08');

