CREATE TABLE `expense_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`groupType` enum('necessario','nao_necessario','investimento') NOT NULL,
	`targetPercent` decimal(5,2) NOT NULL DEFAULT '0',
	`color` varchar(20) DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expense_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expense_subcategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(20) DEFAULT '#6366f1',
	`icon` varchar(50) DEFAULT 'tag',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expense_subcategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fuel_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`gasStationName` varchar(150) NOT NULL,
	`fuelType` enum('gasolina_comum','gasolina_aditivada','etanol','diesel','diesel_s10','gnv') NOT NULL DEFAULT 'gasolina_comum',
	`pricePerLiter` decimal(10,3) NOT NULL,
	`liters` decimal(10,3),
	`totalAmount` decimal(15,2),
	`mileage` int,
	`recordedAt` date NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_history_id` PRIMARY KEY(`id`)
);
