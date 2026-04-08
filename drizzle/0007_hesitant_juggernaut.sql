ALTER TABLE `credit_card_invoices` MODIFY COLUMN `status` enum('aberta','fechada','paga','parcialmente_paga') NOT NULL DEFAULT 'aberta';--> statement-breakpoint
ALTER TABLE `credit_card_invoices` ADD `paidAmount` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `credit_card_items` ADD `isRefund` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_card_items` ADD `refundItemId` int;