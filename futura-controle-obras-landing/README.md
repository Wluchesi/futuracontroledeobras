# 🏗️ Futura Controle de Obras — Landing Page & Página de Vendas

Página de vendas de alta conversão, ultrarrápida e 100% independente, desenvolvida especificamente para o SaaS brasileiro **Futura Controle de Obras**.

Projetada para atender os mais rigorosos padrões de **Core Web Vitals**, **Lighthouse 100**, **SEO Semântico com Schema.org** e **Responsividade Impecável (Desktop, Tablet e Mobile)**.

---

## 📁 Estrutura de Arquivos

A pasta `futura-controle-obras-landing/` é completamente autônoma e **não depende de backend nem de processo de build**:

```text
futura-controle-obras-landing/
├── index.html          # Estrutura semântica HTML5, copy de alta conversão, mockups puros e SEO
├── favicon.svg         # Ícone vetorial estrutural em alta resolução
├── netlify.toml        # Configuração oficial de deploy no Netlify com políticas de cache e segurança
├── styles/
│   └── main.css        # Design system em CSS moderno (B2B SaaS premium, paleta obsidian/esmeralda)
├── scripts/
│   ├── config.js       # ARQUIVO CENTRAL DE CONFIGURAÇÃO (URLs, Preços, WhatsApp e Analytics)
│   └── main.js         # Interações leves (menu mobile, sticky CTA, hidratação de planos, FAQ)
└── README.md           # Guia de configuração e deploy
```

---

## ⚙️ Como Personalizar URLs, Preços e Métricas

Todas as variáveis da página estão concentradas em um único arquivo: **[`scripts/config.js`](scripts/config.js)**.

### 1. URLs de Acesso e Cadastro
Abra `scripts/config.js` e atualize:
```javascript
window.FUTURA_CONFIG = {
  APP_URL: "https://seu-dominio.com/login",
  SIGNUP_URL: "https://seu-dominio.com/login?tab=register",
  DEMO_URL: "https://seu-dominio.com/login?demo=true",
  WHATSAPP_URL: "https://wa.me/5511999999999?text=..."
};
```
*Todos os botões de ação e CTAs da landing page serão atualizados automaticamente!*

### 2. Tabela de Preços e Recursos dos Planos
No mesmo arquivo `scripts/config.js`, edite os valores e itens dos planos:
```javascript
PRICING: {
  gratuito: { price: "Gratuito", ... },
  basico: { price: "R$ 97/mês", ... },
  pro: { price: "R$ 197/mês", isRecommended: true, ... },
  premium: { price: "Sob Consulta", ... }
}
```

### 3. Google Analytics e Meta Pixel
Insira os IDs nos campos designados:
```javascript
ANALYTICS: {
  GA_ID: "G-XXXXXXXXXX",        // Google Analytics 4
  META_PIXEL_ID: "1234567890",  // Meta / Facebook Pixel
  GTM_ID: ""                    // Google Tag Manager (opcional)
}
```
*Se os campos estiverem vazios, nenhum script externo é carregado, garantindo velocidade máxima.*

---

## 🚀 Como Fazer o Deploy no Netlify

Você pode publicar esta pasta no Netlify de três formas simples:

### Opção 1: Drag & Drop (Arraste e Solte no Painel)
1. Acesse sua conta no [Netlify](https://app.netlify.com/).
2. Vá na aba **Sites** e clique em **Add new site** > **Deploy manually**.
3. Arraste e solte a pasta inteira `futura-controle-obras-landing` dentro da área indicada.
4. Seu site estará no ar em segundos com certificado SSL automático!

### Opção 2: Pelo Netlify CLI
Na raiz desta pasta, execute no terminal:
```bash
npx netlify-cli deploy --prod --dir .
```

### Opção 3: Conectar a um Repositório Git (Recomendado)
1. No Netlify, selecione seu repositório no GitHub.
2. Nas configurações de build:
   - **Base directory**: `futura-controle-obras-landing`
   - **Publish directory**: `.` (ou deixe em branco, pois o `netlify.toml` já configura automaticamente)
   - **Build command**: *(deixe vazio, não necessita compilação)*

---

## 🎯 Pilares Estratégicos da Página

1. **Foco no Dinheiro da Obra**: Vende controle, prevenção de perdas e clareza financeira, e não apenas uma lista fria de recursos.
2. **Destaque para a Regra Anti-Estouro**: Apresenta os 3 modos exclusivos (Avisar, Confirmação Explícita e Bloqueio Total).
3. **Mockups Visuais em Código Puro**: Dashboard, Mapa Comparativo de Cotações e Fluxo de Caixa feitos em HTML/CSS/SVG, sem imagens pesadas que prejudiquem a pontuação do Google.
4. **Alinhado à Realidade Brasileira**: Base SINAPI, PIX, bancos nacionais e suporte a exportações em Excel.
