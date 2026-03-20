CREATE TABLE `account_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fromAccountId` int NOT NULL,
	`toAccountId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`date` date NOT NULL,
	`description` varchar(255),
	`notes` text,
	`fromExpenseId` int,
	`toIncomeId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`bank` varchar(100),
	`type` enum('corrente','poupanca','carteira','investimento','outro') NOT NULL DEFAULT 'corrente',
	`color` varchar(20) DEFAULT '#6366f1',
	`icon` varchar(50) DEFAULT 'building-2',
	`initialBalance` decimal(15,2) NOT NULL DEFAULT '0',
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_card_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`creditCardId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`closingDate` date,
	`dueDate` date,
	`totalAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`status` enum('aberta','fechada','paga') NOT NULL DEFAULT 'aberta',
	`billId` int,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_card_invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_card_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`invoiceId` int NOT NULL,
	`creditCardId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`parentCategory` enum('habitacao','alimentacao','saude','educacao','transporte','vestuario','lazer','financeiro','utilidades','pessoal','outros') NOT NULL DEFAULT 'outros',
	`subcategoryId` int,
	`purchaseDate` date NOT NULL,
	`installments` int NOT NULL DEFAULT 1,
	`currentInstallment` int NOT NULL DEFAULT 1,
	`totalInstallments` int NOT NULL DEFAULT 1,
	`notes` text,
	`isRecurring` tinyint NOT NULL DEFAULT 0,
	`expenseId` int,
	`recurringRuleId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_card_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recurring_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('expense','income','credit_card_item') NOT NULL,
	`description` varchar(255) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`parentCategory` varchar(64),
	`subcategoryId` int,
	`bankAccountId` int,
	`familyMemberId` int,
	`paymentMethod` varchar(32),
	`category` varchar(64),
	`notes` text,
	`creditCardId` int,
	`frequency` enum('monthly','weekly','yearly') NOT NULL DEFAULT 'monthly',
	`dayOfMonth` int,
	`startDate` date NOT NULL,
	`endDate` date,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`lastGeneratedDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recurring_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bills` ADD `bankAccountId` int;--> statement-breakpoint
ALTER TABLE `bills` ADD `subcategoryId` int;--> statement-breakpoint
ALTER TABLE `expenses` ADD `bankAccountId` int;--> statement-breakpoint
ALTER TABLE `expenses` ADD `subcategoryId` int;--> statement-breakpoint
ALTER TABLE `expenses` ADD `sourceType` enum('normal','cartao_credito') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` ADD `creditCardItemId` int;--> statement-breakpoint
ALTER TABLE `expenses` ADD `recurringRuleId` int;--> statement-breakpoint
ALTER TABLE `incomes` ADD `bankAccountId` int;--> statement-breakpoint
ALTER TABLE `incomes` ADD `recurringRuleId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `initialBalance` decimal(15,2) DEFAULT '0' NOT NULL;