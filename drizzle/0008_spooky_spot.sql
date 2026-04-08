ALTER TABLE `bills` ADD `expenseData` text;--> statement-breakpoint
ALTER TABLE `bills` ADD `parentCategory` enum('habitacao','alimentacao','saude','educacao','transporte','vestuario','lazer','financeiro','utilidades','pessoal','outros');--> statement-breakpoint
ALTER TABLE `bills` ADD `paymentMethod` enum('dinheiro','debito','credito','pix','transferencia','boleto','outros');