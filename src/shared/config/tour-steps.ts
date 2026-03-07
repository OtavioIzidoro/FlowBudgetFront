export interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="sidebar"]',
    title: 'Bem-vindo ao FlowBudget',
    content: 'Este é o seu painel de controle financeiro. Vamos conhecer as principais áreas.',
  },
  {
    id: 'nav-dashboard',
    target: '[data-tour="nav-dashboard"]',
    title: 'Dashboard',
    content: 'Visão geral do seu saldo, receitas, despesas e economia do mês.',
  },
  {
    id: 'nav-transactions',
    target: '[data-tour="nav-transactions"]',
    title: 'Transações',
    content: 'Registre e acompanhe todas as entradas e saídas de dinheiro.',
  },
  {
    id: 'nav-categories',
    target: '[data-tour="nav-categories"]',
    title: 'Categorias',
    content: 'Organize transações por categoria: alimentação, transporte, lazer e mais.',
  },
  {
    id: 'nav-goals',
    target: '[data-tour="nav-goals"]',
    title: 'Metas',
    content: 'Defina objetivos financeiros e acompanhe o progresso de cada meta.',
  },
  {
    id: 'nav-notifications',
    target: '[data-tour="nav-notifications"]',
    title: 'Notificações',
    content: 'Alertas de vencimento, orçamento e metas alcançadas.',
  },
  {
    id: 'nav-projections',
    target: '[data-tour="nav-projections"]',
    title: 'Projeções',
    content: 'Simule cenários e planeje seu futuro financeiro.',
  },
  {
    id: 'nav-profile',
    target: '[data-tour="nav-profile"]',
    title: 'Perfil',
    content: 'Gerencie suas preferências e dados da conta.',
  },
  {
    id: 'content',
    target: '[data-tour="main-content"]',
    title: 'Conteúdo da página',
    content: 'Aqui é exibido o conteúdo da área selecionada no menu.',
  },
  {
    id: 'complete',
    target: '[data-tour="sidebar"]',
    title: 'Tour concluído',
    content: 'Agora você conhece o FlowBudget. Comece explorando o Dashboard.',
  },
];
