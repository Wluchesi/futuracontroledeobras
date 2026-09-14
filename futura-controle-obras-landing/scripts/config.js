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

  // Planos e Preços Oficiais do Sistema (3 Planos Reais)
  PRICING: {
    gratuito: {
      name: "Plano Gratuito",
      price: "R$ 0",
      period: "/mês",
      badge: "Ideal para começar",
      description: "Ideal para testar a ferramenta e iniciar sua primeira construção.",
      features: [
        "1 Obra Ativa",
        "Limite Rígido de até 4 Kitnets/Unidades",
        "Entrada Manual de Dados",
        "Orçamento Executivo Básico",
        "Contas a Pagar & Receber",
        "Ideal para Testar a Ferramenta"
      ],
      ctaText: "Começar Grátis",
      action: "signup"
    },
    pro: {
      name: "Kitneteiro Pro",
      price: "R$ 49",
      period: "/mês",
      badge: "Mais Popular",
      isRecommended: true,
      description: "Para quem constrói e busca unidades ilimitadas em sua obra.",
      features: [
        "1 Obra Ativa (Construção Principal)",
        "Kitnets / Unidades ILIMITADAS (ex: 10, 12 ou mais)",
        "Entrada Manual de Dados Completa",
        "Gestão Avançada de Orçamento & Etapas",
        "Cotações & Comparativo de Fornecedores",
        "Gestão Completa de Compras & Contas a Pagar",
        "Fluxo de Caixa & Gráficos Financeiros",
        "Exportação de Dados"
      ],
      ctaText: "Assinar Kitneteiro Pro",
      action: "signup"
    },
    premium: {
      name: "Kitneteiro Premium (SINAPI)",
      price: "R$ 99",
      period: "/mês",
      badge: "Mais Completo",
      description: "Para construtores e investidores com múltiplas obras e integração SINAPI.",
      features: [
        "Até 5 Obras Simultâneas",
        "Kitnets / Unidades ILIMITADAS por Obra",
        "Integração com Tabela SINAPI (Preços Automáticos)",
        "Rateio / Divisão Automática de Compras em Lote",
        "Relatórios Profissionais Customizados (PDF / Excel)",
        "Alertas Financeiros & Lembretes",
        "Importação de Orçamentos via Excel",
        "Suporte Prioritário por WhatsApp com Especialista"
      ],
      ctaText: "Assinar Kitneteiro Premium",
      action: "signup"
    }
  },

  // Analytics e Pixels (Os scripts NÃO são carregados se os IDs estiverem vazios)
  ANALYTICS: {
    GA_ID: "",         // Ex: "G-XXXXXXXXXX"
    META_PIXEL_ID: "", // Ex: "123456789012345"
    GTM_ID: ""         // Ex: "GTM-XXXXXXX"
  }
};
