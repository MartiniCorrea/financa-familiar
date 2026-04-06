CREATE TABLE `import_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('bank_statement','credit_card') NOT NULL,
	`filename` varchar(255) NOT NULL,
	`bankAccountId` int,
	`creditCardId` int,
	`totalRows` int NOT NULL DEFAULT 0,
	`confirmedRows` int NOT NULL DEFAULT 0,
	`status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL,
	CONSTRAINT `import_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `import_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`date` date NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`type` enum('debit','credit') NOT NULL DEFAULT 'debit',
	`subcategoryId` int,
	`notes` text,
	`status` enum('pending','confirmed','ignored') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL,
	CONSTRAINT `import_transactions_id` PRIMARY KEY(`id`)
);
