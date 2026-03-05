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
