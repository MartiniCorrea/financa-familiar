CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
CREATE TABLE `bills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`familyMemberId` int,
	`description` varchar(255) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`type` enum('pagar','receber') NOT NULL DEFAULT 'pagar',
	`category` enum('habitacao','alimentacao','saude','educacao','transporte','vestuario','lazer','financeiro','utilidades','pessoal','outros','salario','renda_extra') DEFAULT 'outros',
	`dueDate` date NOT NULL,
	`paidAt` date,
	`status` enum('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente',
	`isRecurring` boolean DEFAULT false,
	`recurringDay` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bills_id` PRIMARY KEY(`id`)
);
CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('habitacao','alimentacao','saude','educacao','transporte','vestuario','lazer','financeiro','utilidades','pessoal','outros') NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`plannedAmount` decimal(15,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
CREATE TABLE `credit_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`familyMemberId` int,
	`name` varchar(100) NOT NULL,
	`bank` varchar(100),
	`lastFourDigits` varchar(4),
	`creditLimit` decimal(15,2) NOT NULL,
	`closingDay` int NOT NULL,
	`dueDay` int NOT NULL,
	`color` varchar(20) DEFAULT '#6366f1',
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_cards_id` PRIMARY KEY(`id`)
);
CREATE TABLE `expense_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`parentCategory` enum('habitacao','alimentacao','saude','educacao','transporte','vestuario','lazer','financeiro','utilidades','pessoal','outros') NOT NULL,
	`color` varchar(20) DEFAULT '#6366f1',
	`icon` varchar(50) DEFAULT 'tag',
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expense_categories_id` PRIMARY KEY(`id`)
);
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`familyMemberId` int,
	`creditCardId` int,
	`categoryId` int,
	`description` varchar(255) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`parentCategory` enum('habitacao','alimentacao','saude','educacao','transporte','vestuario','lazer','financeiro','utilidades','pessoal','outros') NOT NULL DEFAULT 'outros',
	`date` date NOT NULL,
	`paymentMethod` enum('dinheiro','debito','credito','pix','transferencia','boleto','outros') DEFAULT 'outros',
	`isRecurring` boolean DEFAULT false,
	`recurringDay` int,
	`installments` int DEFAULT 1,
	`currentInstallment` int DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
CREATE TABLE `family_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`relationship` enum('titular','conjuge','filho','filha','pai','mae','outro') NOT NULL DEFAULT 'titular',
	`color` varchar(20) DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `family_members_id` PRIMARY KEY(`id`)
);
CREATE TABLE `financial_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`description` text,
	`targetAmount` decimal(15,2) NOT NULL,
	`currentAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`deadline` date,
	`type` enum('curto_prazo','medio_prazo','longo_prazo') NOT NULL DEFAULT 'medio_prazo',
	`category` enum('emergencia','viagem','imovel','veiculo','educacao','aposentadoria','outros') DEFAULT 'outros',
	`color` varchar(20) DEFAULT '#6366f1',
	`icon` varchar(50) DEFAULT 'target',
	`isCompleted` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_goals_id` PRIMARY KEY(`id`)
);
CREATE TABLE `goal_contributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goalId` int NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`date` date NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `goal_contributions_id` PRIMARY KEY(`id`)
);
CREATE TABLE `incomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`familyMemberId` int,
	`description` varchar(255) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`category` enum('salario','renda_extra','pensao','aluguel','investimento','freelance','bonus','dividendos','outros') NOT NULL DEFAULT 'salario',
	`date` date NOT NULL,
	`isRecurring` boolean DEFAULT false,
	`recurringDay` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incomes_id` PRIMARY KEY(`id`)
);
CREATE TABLE `investment_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investmentId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('aporte','resgate','rendimento') NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`date` date NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `investment_transactions_id` PRIMARY KEY(`id`)
);
CREATE TABLE `investments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`type` enum('poupanca','cdb','lci','lca','tesouro_direto','fundos','acoes','fii','criptomoedas','previdencia','outros') NOT NULL DEFAULT 'poupanca',
	`institution` varchar(100),
	`initialAmount` decimal(15,2) NOT NULL,
	`currentAmount` decimal(15,2) NOT NULL,
	`investedAt` date NOT NULL,
	`maturityDate` date,
	`annualRate` decimal(8,4),
	`isEmergencyFund` boolean DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investments_id` PRIMARY KEY(`id`)
);
CREATE TABLE `price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productName` varchar(150) NOT NULL,
	`supermarketId` int NOT NULL,
	`price` decimal(15,2) NOT NULL,
	`unit` varchar(20) DEFAULT 'un',
	`recordedAt` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_history_id` PRIMARY KEY(`id`)
);
CREATE TABLE `shopping_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`quantity` decimal(10,3) DEFAULT '1',
	`unit` varchar(20) DEFAULT 'un',
	`estimatedPrice` decimal(15,2),
	`actualPrice` decimal(15,2),
	`category` varchar(50),
	`isChecked` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shopping_items_id` PRIMARY KEY(`id`)
);
CREATE TABLE `shopping_lists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`supermarketId` int,
	`estimatedTotal` decimal(15,2),
	`actualTotal` decimal(15,2),
	`status` enum('ativa','concluida','cancelada') NOT NULL DEFAULT 'ativa',
	`shoppingDate` date,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shopping_lists_id` PRIMARY KEY(`id`)
);
CREATE TABLE `supermarkets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`address` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supermarkets_id` PRIMARY KEY(`id`)
);
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