# FinançaFamiliar - TODO

## Fase 1: Banco de Dados e Estrutura Base
- [x] Schema completo no drizzle/schema.ts (16 tabelas)
- [x] Migração SQL aplicada via webdev_execute_sql
- [x] Helpers de DB em server/db.ts

## Fase 2: Design System e Layout
- [x] Tema elegante escuro com paleta de cores premium (index.css)
- [x] Fonte Google (Inter + Playfair Display)
- [x] DashboardLayout com sidebar completa e navegação
- [x] Utilitários de formatação financeira (lib/finance.ts)

## Fase 3: Dashboard Principal
- [x] KPIs: saldo, receitas, despesas, taxa de poupança
- [x] Gráfico de receita vs despesa (últimos 12 meses)
- [x] Gráfico de pizza por categoria de despesa
- [x] Contas a vencer nos próximos 7 dias
- [x] Resumo de metas financeiras

## Fase 4: Receitas
- [x] Listagem de receitas com filtros por mês/ano
- [x] Formulário de cadastro/edição
- [x] Categorias: salário, renda extra, pensão, investimento, outros
- [x] Vinculação a membro da família

## Fase 5: Despesas
- [x] Listagem de despesas com filtros por mês/ano
- [x] Formulário de cadastro/edição
- [x] Categorias: habitação, alimentação, saúde, educação, transporte, vestuário, lazer, financeiro
- [x] Vinculação a membro da família e cartão de crédito

## Fase 6: Contas a Pagar e Receber
- [x] Listagem com status (pendente, pago, vencido)
- [x] Formulário de cadastro/edição
- [x] Marcar como pago
- [x] Histórico completo

## Fase 7: Cartões de Crédito
- [x] Cadastro de múltiplos cartões
- [x] Rastreamento de fatura mensal
- [x] Limite de crédito e limite disponível
- [x] Data de fechamento e vencimento

## Fase 8: Orçamento Mensal
- [x] Definição de metas por categoria
- [x] Comparação orçado vs realizado em tempo real
- [x] Barras de progresso por categoria

## Fase 9: Metas Financeiras
- [x] Cadastro de metas (curto, médio, longo prazo)
- [x] Acompanhamento de progresso com barras visuais
- [x] Contribuições para metas
- [x] Prazo e valor alvo

## Fase 10: Compras de Mercado
- [x] Lista de compras com produtos
- [x] Registro de preços estimados
- [x] Marcar itens como comprados
- [x] Estimativa de gasto total

## Fase 11: Investimentos e Poupança
- [x] Cadastro de investimentos (CDB, LCI, LCA, Tesouro, Ações, FII, etc.)
- [x] Rastreamento de desempenho (valor inicial vs atual)
- [x] Resumo de rentabilidade

## Fase 12: Gráficos e Relatórios
- [x] Gráfico de pizza por categoria de despesa
- [x] Evolução temporal (barras)
- [x] Saldo mensal (área)
- [x] Filtros por período

## Fase 13: Membros da Família
- [x] Cadastro de membros com avatar e cor
- [x] Papéis: responsável, cônjuge, filho, dependente
- [x] Renda mensal por membro

## Fase 14: Testes e Finalização
- [x] 14 testes Vitest passando (auth, dashboard, receitas, despesas, contas, metas, orçamentos, investimentos, membros, compras)
- [x] TypeScript sem erros
- [x] Checkpoint final

## Melhorias Futuras
- [ ] Notificações de vencimento de contas
- [ ] Exportação de relatórios em PDF
- [ ] Comparação de preços entre supermercados
- [ ] Importação de extrato bancário
- [ ] Modo claro/escuro alternável

## Alterações v2 (solicitadas pelo usuário)
- [x] Tema claro vibrante com paleta azul/verde/laranja/amarelo
- [x] Sidebar azul escuro elegante (contraste com fundo claro)
- [x] Schema: tabela fuel_history (posto, combustível, preço, litros, data)
- [x] Schema: tabela expense_groups (grupos 50/30/20)
- [x] Schema: tabela expense_subcategories (subcategorias personalizadas)
- [x] Router: priceHistory (list, create, delete, comparison, products)
- [x] Router: fuelHistory (list, create, delete, stats, stations)
- [x] Router: expenseGroups (list, create, update, delete, subcategories, summary)
- [x] Página de Histórico de Preços de Mercado com comparativo entre mercados
- [x] Página de Histórico de Combustível com comparativo entre postos
- [x] Página 50/30/20 com grupos, subcategorias e gráfico de progresso
- [x] Menu lateral atualizado com novos links (Combustível, Preços, 50/30/20)

## Correções v3 (bugs reportados)
- [x] Bug: subcategorias criadas não aparecem na lista dentro do grupo
- [x] Bug: textos sobrepostos/encavalados na página 50/30/20
- [x] Integrar categorias 50/30/20 no formulário de despesas
- [x] Integrar categorias 50/30/20 no formulário de contas a pagar
- [x] Módulo de mercado: registro de gastos reais por visita ao mercado
- [x] Módulo de mercado: banco de dados automático de preços por produto/mercado

## Correções v4
- [x] Bug crítico: labels de grupo do menu (PLANEJAMENTO, UTILIDADES) sobrepostas aos itens (Cartões em cima de PLANEJAMENTO, Investimentos em cima de UTILIDADES) — corrigido substituindo SidebarGroupLabel por div simples sem -mt-8

## Melhorias v5 (deploy externo + PWA)
- [x] Login próprio: coluna passwordHash na tabela users (bcrypt)
- [x] Login próprio: endpoint POST /api/auth/register
- [x] Login próprio: endpoint POST /api/auth/login
- [x] Login próprio: endpoint POST /api/auth/logout
- [x] Login próprio: página de login/cadastro no frontend (/login)
- [x] Login próprio: DashboardLayout redireciona para /login se não autenticado
- [x] PWA: manifest.json com nome, ícones, atalhos e cores
- [x] PWA: Service Worker para cache offline (sw.js)
- [x] PWA: meta tags no index.html (apple-mobile-web-app, theme-color)
- [x] PWA: ícones 192x192 e 512x512 gerados
- [x] Guia de deploy na Hostinger VPS (GUIA_DEPLOY_HOSTINGER.md)

## Correções v6 (categorias)
- [x] Remover campo "categoria" antigo (fixo) do formulário de Despesas
- [x] Remover campo "categoria" antigo (fixo) do formulário de Contas
- [x] Garantir que apenas subcategorias 50/30/20 do usuário aparecem nos selects
- [x] Dashboard: gráfico "Despesas por Categoria" usar subcategorias 50/30/20
- [x] Dashboard: filtro de despesas usa subcategorias do usuário

## Melhorias v7
- [x] Relatórios: corrigir gráfico de pizza para usar subcategorias 50/30/20 do usuário
- [x] Relatórios: remover categorias antigas fixas dos filtros e gráficos
- [x] Dashboard: adicionar card 50/30/20 com barras de progresso por grupo
- [x] Mercado: ao salvar uma ida ao mercado, criar despesa automática vinculada à subcategoria
- [x] Combustível: ao salvar um abastecimento, criar despesa automática vinculada à subcategoria

## Correções v8
- [x] Seletores de ano dinâmicos em todo o sistema (Dashboard, Relatórios, Despesas, Receitas, Orçamento) — agora mostra 5 anos atrás até 2 anos à frente automaticamente

## Melhorias v9 (saldo inicial)
- [x] Schema: adicionar coluna initialBalance na tabela users
- [x] DB: funções getInitialBalance e setInitialBalance
- [x] Router: procedures balance.get e balance.set
- [x] Dashboard: exibir saldo acumulado real (saldo inicial + receitas - despesas de todos os tempos)
- [x] Dashboard: botão/modal para definir e editar o saldo inicial

## Módulo v10 — Contas Bancárias (inspirado no Mobills)
- [x] Schema: tabela bank_accounts (id, userId, name, bank, type, color, icon, initialBalance, isActive)
- [x] Schema: coluna bankAccountId em incomes, expenses e bills
- [x] DB: funções CRUD para bank_accounts
- [x] DB: função getAccountBalance (saldo inicial + receitas - despesas vinculadas)
- [x] DB: função getAccountsWithBalance (lista todas contas com saldo calculado)
- [x] Router: bankAccounts (list, create, update, delete, getBalance)
- [x] Página /contas-bancarias: listagem com cards de saldo por conta
- [x] Página /contas-bancarias: modal de criação/edição com tipo (corrente, poupança, carteira, etc.), banco, cor e ícone
- [x] Página /contas-bancarias: extrato da conta (histórico de movimentações vinculadas)
- [x] Formulário de Receitas: seletor de conta bancária de origem
- [x] Formulário de Despesas: seletor de conta bancária de origem
- [x] Formulário de Contas a Pagar: seletor de conta bancária de origem
- [x] Dashboard: remover saldo inicial único, mostrar cards de saldo por conta + total consolidado
- [x] Sidebar: adicionar link para Contas Bancárias

## Correções v11
- [x] Bug: erro ao cadastrar conta bancária — coluna updatedAt removida do schema (não existe no banco do VPS)

## Correções v12
- [x] Bug: saldo total consolidado mostra R$ 0,00 em vez de somar o saldo de todas as contas
- [x] Saldo por conta = saldo inicial + receitas vinculadas - despesas vinculadas
- [x] Saldo total = soma do saldo de todas as contas ativas

## Correções v13
- [x] Revisão completa: todos os SelectItem com value="" substituídos por valor não-vazio (Incomes, Expenses, Bills)

## Correções v14
- [x] Bug: erro ao salvar despesa — payload explícito sem spread do form em Expenses, Incomes e Bills

## Módulo v15 — Cartão de Crédito Completo

### Banco de Dados
- [x] Tabela credit_card_invoices (id, userId, creditCardId, month, year, closingDate, dueDate, totalAmount, status: aberta/fechada/paga, billId)
- [x] Tabela credit_card_items (id, userId, invoiceId, creditCardId, description, amount, category/parentCategory, subcategoryId, purchaseDate, installments, currentInstallment, totalInstallments, notes, isRecurring)
- [x] Coluna sourceType em expenses (normal | cartao_credito) e coluna creditCardItemId

### Backend
- [x] db.ts: funções CRUD para credit_card_invoices e credit_card_items
- [x] db.ts: função getOrCreateInvoice (busca ou cria fatura aberta do mês)
- [x] db.ts: função addItemToInvoice (adiciona item e recalcula total da fatura)
- [x] db.ts: função payInvoice (marca fatura como paga, cria bill pago, lança despesas individuais)
- [x] db.ts: função generateNextInstallments (cria itens das próximas parcelas nas faturas futuras)
- [x] Router: creditCardInvoices (list, getOrCreate, getItems, addItem, removeItem, payInvoice)

### Frontend — Página Cartões
- [x] Seção "Fatura" com navegação por mês/ano
- [x] Botão "Adicionar Gasto" com formulário (descrição, valor, categoria 50/30/20, data, parcelas)
- [x] Exibição do total da fatura, data de vencimento e status
- [x] Badge de status da fatura (Aberta / Fechada / Paga)
- [x] Botão "Pagar Fatura" com diálogo de confirmação
- [x] Ao pagar: fatura vira "Paga", bill é marcado como pago, despesas individuais são lançadas

### Integração com Contas a Pagar
- [x] Ao criar/atualizar fatura: gerar ou atualizar bill correspondente automaticamente
- [x] Bill do cartão aparece em Contas a Pagar com nome do cartão e valor total
- [x] Ao pagar fatura: bill é marcado como pago automaticamente

## Correções v16
- [x] Bug: erro ao abrir fatura — coluna updatedAt removida da tabela credit_card_invoices (não existe no banco do VPS)

## Melhorias v17
- [x] Cartões: formulário de gasto da fatura agora usa subcategorias 50/30/20 cadastradas pelo usuário

## Correções v18
- [x] Bug: erro ao adicionar gasto na fatura — tabelas credit_card_items/invoices não existem no VPS
- [x] Bug: botão Pagar Fatura não aparece — aparece após adicionar gastos (total > 0 e status != paga)

## Correções v19
- [ ] Bug: erro silencioso ao adicionar gasto na fatura — investigar router/db com logs detalhados

## Correções v20
- [x] Bug: isRecurring boolean convertido para 0/1 e notes tratado como null ao inserir item na fatura

## Correções v21
- [x] Bug: notes="" (string vazia) causa erro no MySQL — deve ser null
- [x] Bug: botão Pagar Fatura não aparece na tela
- [x] Bug: labels do formulário de gasto da fatura estão sobrepostos
- [x] Bug: "Invalid Date" na data de vencimento e data do item — corrigido com função formatDbDate
- [x] Bug: isRecurring boolean — schema Drizzle corrigido para tinyint (MySqlTinyInt)

## Correções v22
- [x] Bug: gasto após data de fechamento deve cair na fatura do mês seguinte (ex: compra dia 18/02 com fechamento dia 28/02 → fatura de março, não abril)
- [x] Melhoria: frontend navega automaticamente para o mês correto da fatura após adicionar gasto

## Correções v23
- [x] Bug: data inválida 2026-02-30 ao criar fatura — closingDay maior que dias do mês (ex: dia 30 em fevereiro) — corrigido com clampDay()

## Melhorias v24
- [x] Ao pagar fatura: perguntar qual conta bancária será usada e abater o valor nessa conta

## Correções v25
- [x] Bug: lógica de fatura corrigida — fatura nomeada pelo mês de pagamento (compra em fev → fatura de março)
- [x] Melhoria: edição de itens da fatura adicionada (botão de lápis ao lado do excluir)
