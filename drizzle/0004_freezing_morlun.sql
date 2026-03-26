CREATE TABLE `bill_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`billId` int NOT NULL,
	`daysBeforeDue` int NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bill_notifications_id` PRIMARY KEY(`id`)
);
