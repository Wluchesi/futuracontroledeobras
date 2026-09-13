/**
 * FUTURA CONTROLE DE OBRAS - Landing Page Config
 * 
 * Centralize todas as URLs, dados de contato, planos e IDs de métricas.
 * Qualquer alteração aqui é refletida automaticamente em todos os botões e CTAs da landing page.
 */

window.FUTURA_CONFIG = {
  // URLs do Sistema e Conversão
  APP_URL: "https://app-futuragerenciadordeobras.netlify.app/login",
  SIGNUP_URL: "https://app-futuragerenciadordeobras.netlify.app/cadastrar-empresa",
  DEMO_URL: "https://app-futuragerenciadordeobras.netlify.app/login?demo=true",
  PRICING_URL: "#planos",
  WHATSAPP_URL: "https://wa.me/5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20conhecer%20o%20Futura%20Controle%20de%20Obras",

  // Planos e Preços (Placeholders editáveis sem inventar valores fixos não confirmados)
  PRICING: {
    gratuito: {
      price: "Gratuito",
      period: "para sempre",
      badge: "Ideal para começar",
      description: "Perfeito para profissionais autônomos ou para testar o sistema na sua primeira obra.",
      features: [
        "1 Obra ativa (até 4 unidades/kitnets)",
        "Até 2 usuários na equipe",
        "Orçamento executivo estruturado",
        "Cotações e pedidos de compras",
        "Contas a pagar e baixas financeiras",
        "Exportação de relatórios em Excel/PDF"
      ],
      ctaText: "Começar Grátis",
      action: "signup"
    },
    basico: {
      price: "Consulte o plano",
      period: "faturamento mensal ou anual",
      badge: "Para pequenas construtoras",
      description: "Controle financeiro e suprimentos para quem gerencia obras simultâneas.",
      features: [
        "Até 3 Obras simultâneas",
        "Até 5 usuários com níveis de acesso",
        "Todas as funções do plano gratuito",
        "Regra anti-estouro (Modo Alerta)",
        "Consulta à base SINAPI integrada",
        "Importador de planilhas Excel (.xlsx)",
        "Suporte por e-mail e WhatsApp"
      ],
      ctaText: "Escolher Plano Básico",
      action: "signup"
    },
    pro: {
      price: "Consulte o plano",
      period: "faturamento mensal ou anual",
      badge: "Mais Escolhido por Construtoras",
      isRecommended: true,
      description: "O padrão definitivo para médias construtoras que exigem tolerância zero a prejuízos.",
      features: [
        "Até 10 Obras simultâneas",
        "Até 15 usuários com permissões avançadas",
        "Regra anti-estouro (Alerta + Confirmação + Bloqueio Total)",
        "Mapa comparativo inteligente de cotações",
        "Fluxo de caixa projetado e relatórios executivos",
        "Trilha de auditoria completa (Logs com IP/usuário)",
        "Backup completo em 1 clique",
        "Restauração inteligente em micro-lotes",
        "Suporte prioritário via WhatsApp"
      ],
      ctaText: "Garantir Controle Máximo (Pro)",
      action: "signup"
    },
    premium: {
      price: "Sob Consulta",
      period: "atendimento corporativo",
      badge: "Grandes Operações",
      description: "Para empresas de engenharia com alto volume de compras e múltiplos canteiros.",
      features: [
        "Obras ativas ilimitadas",
        "Usuários da construtora ilimitados",
        "Todos os recursos Pro inclusos",
        "Treinamento dedicado para equipe de compras e engenharia",
        "Customização de centros de custo e planos de contas",
        "Backup e restauração em micro-lotes dedicada",
        "Gerente de contas exclusivo"
      ],
      ctaText: "Falar com Especialista",
      action: "whatsapp"
    }
  },

  // Analytics e Pixels (Os scripts NÃO são carregados se os IDs estiverem vazios)
  ANALYTICS: {
    GA_ID: "",         // Ex: "G-XXXXXXXXXX"
    META_PIXEL_ID: "", // Ex: "123456789012345"
    GTM_ID: ""         // Ex: "GTM-XXXXXXX"
  }
};
