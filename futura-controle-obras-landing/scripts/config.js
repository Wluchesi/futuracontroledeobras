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
      description: "Perfeito para conhecer o sistema e controlar sua primeira construção pequena.",
      features: [
        "1 Obra Ativa",
        "Limite rígido de até 4 Kitnets/Unidades",
        "Entrada manual de dados",
        "Orçamento executivo estruturado",
        "Lançamento de compras e despesas",
        "Contas a pagar e baixas financeiras",
        "Ideal para testar a ferramenta"
      ],
      ctaText: "Começar Grátis",
      action: "signup"
    },
    pro: {
      name: "Kitneteiro Pro",
      price: "R$ 49",
      period: "/mês",
      badge: "Mais Popular ⚡",
      isRecommended: true,
      description: "Para investidores e construtores que querem unidades ilimitadas em 1 obra ativa.",
      features: [
        "1 Obra Ativa (Construção Principal)",
        "Kitnets / Unidades ILIMITADAS (10, 12 ou mais)",
        "Entrada manual de dados completa",
        "Gestão avançada de orçamento & etapas",
        "Cotações & comparativo de fornecedores",
        "Gestão completa de compras e contas a pagar",
        "Fluxo de caixa e gráficos financeiros",
        "Exportação de relatórios em Excel e PDF"
      ],
      ctaText: "Assinar Kitneteiro Pro",
      action: "signup"
    },
    premium: {
      name: "Kitneteiro Premium",
      price: "R$ 99",
      period: "/mês",
      badge: "Multi-Obras & SINAPI",
      description: "Máximo controle: até 5 obras simultâneas com preços automáticos da base SINAPI.",
      features: [
        "Até 5 Obras Simultâneas",
        "Kitnets / Unidades ILIMITADAS por obra",
        "Integração com Tabela SINAPI (Preços automáticos)",
        "Rateio / divisão automática de compras em lote",
        "Relatórios profissionais customizados (PDF/Excel)",
        "Regra Anti-Estouro (Alerta, Confirmação e Bloqueio)",
        "Importação de orçamentos via planilha Excel",
        "Suporte prioritário via WhatsApp com especialista"
      ],
      ctaText: "Garantir Plano Premium",
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
