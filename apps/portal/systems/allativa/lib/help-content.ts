/**
 * Conteúdo de Ajuda Contextual do ERP AllAtiva Joias.
 * Textos em linguagem simples, pensados para ourives e vendedores.
 */

export type HelpModuleKey =
  | "ficha-tecnica"
  | "insumos"
  | "produtos"
  | "pdv";

export interface HelpField {
  /** Nome do campo como aparece na tela */
  name: string;
  /** Explicação leiga do que o campo faz */
  description: string;
  /** Exemplo prático do dia a dia da joalheria */
  example?: string;
}

export interface HelpModule {
  title: string;
  /** O que é este módulo, em 1–2 frases */
  summary: string;
  fields: HelpField[];
  /** Dicas extras de uso */
  tips?: string[];
}

export const helpContent: Record<HelpModuleKey, HelpModule> = {
  "ficha-tecnica": {
    title: "Ficha Técnica",
    summary:
      "Aqui você monta o custo real de uma joia: quais materiais entram, quanto de cada um, mão de obra e a margem de lucro. O sistema calcula o preço ideal de venda em tempo real.",
    fields: [
      {
        name: "Peça",
        description:
          "Escolha o produto do catálogo que você está precificando, ou trabalhe em uma peça avulsa.",
        example: "Anel Solitário Ouro 18k · aro 16",
      },
      {
        name: "Composição (materiais)",
        description:
          "Lista tudo que entra na joia: ouro, pedras, correntes, fios. Cada linha é um item com preço e quantidade usada.",
        example:
          "Em vez de só “Ouro”, use “Ouro 18k Amarelo” e informe quantos gramas a peça consome.",
      },
      {
        name: "Nome / Tipo / Compra",
        description:
          "Identifique o material, se é metal, gema ou componente, e quanto você pagou no pacote ou na unidade.",
        example: "Zircônia redonda rosa 2 mm — pacote R$ 45,00 com 100 unidades.",
      },
      {
        name: "Usado",
        description:
          "Quanto dessa matéria-prima realmente entra nesta peça (gramas, cm ou unidades).",
        example: "2,4 g de ouro · 12 pedras · 18 cm de corrente.",
      },
      {
        name: "Construtor de correntes e fios",
        description:
          "Atalho para calcular custo por centímetro. Informe o fio/corrente e o comprimento usado.",
        example: "Corrente veneziana 1 mm · 40 cm de corrente no colar.",
      },
      {
        name: "Sequenciador de pedras",
        description:
          "Monta o padrão de cravação (ex.: vermelha, azul, vermelha…) e repete até a quantidade total de pedras da peça.",
        example:
          "Padrão: 1 vermelha + 1 branca. Total: 24 pedras → o sistema calcula 12 de cada.",
      },
      {
        name: "Construtor de ligas",
        description:
          "Decompõe a liga (ex.: ouro 18k) em metal puro + pré-liga, para você ver o custo real do grama.",
        example: "Ouro 18k (Au750) · 5 g usados na peça.",
      },
      {
        name: "Mão de obra e extras",
        description:
          "Serviços e custos que não são material: cravação, polimento, caixa, frete interno.",
        example: "Cravação de 12 pedras — R$ 80,00.",
      },
      {
        name: "Margem / lucro",
        description:
          "Quanto você quer ganhar em cima do custo. O preço de venda sugerido atualiza sozinho.",
        example: "Custo R$ 420 · margem 60% → preço sugerido cerca de R$ 672.",
      },
    ],
    tips: [
      "Comece pelos insumos cadastrados na Biblioteca — assim o preço e o estoque de matéria-prima ficam alinhados.",
      "Use nomes completos (material + cor + tamanho). Assim fica fácil achar depois e a requisição de materiais sai correta.",
      "Salve a ficha no produto quando estiver satisfeito: o custo e o preço de venda podem ser atualizados no catálogo.",
    ],
  },

  insumos: {
    title: "Biblioteca de Insumos",
    summary:
      "É o estoque inteligente da oficina: pedras, correntes, fios/chapas e ligas. Cadastre com detalhes (lapidação, cor, tamanho, bitola) para achar rápido e usar na Ficha Técnica e na requisição de materiais.",
    fields: [
      {
        name: "Pedras — Nome",
        description:
          "Como você chama essa pedra no dia a dia. Quanto mais específico, melhor.",
        example:
          "Em vez de só “Zircônia”, digite “Zircônia redonda rosa 2 mm”.",
      },
      {
        name: "Lapidação / Formato",
        description:
          "O corte da pedra: redonda, gota, navete, estrela, quadrada etc.",
        example: "Redonda · Navete · Gota",
      },
      {
        name: "Cor",
        description: "A cor visual da pedra, como o cliente enxerga.",
        example: "Rosa · Safira azul · Cristal · Preta",
      },
      {
        name: "Tamanho (mm)",
        description: "Medida em milímetros da pedra.",
        example: "2 · 2,5 · 3 · 4",
      },
      {
        name: "Peso (ct) e Preço unitário",
        description:
          "Peso em quilates de uma pedra e quanto custa cada unidade.",
        example: "0,03 ct · R$ 1,50 por pedra",
      },
      {
        name: "Correntes — Malha / Material / Bitola",
        description:
          "Tipo de elos, metal e espessura. O preço e o peso são por centímetro.",
        example: "Veneziana · Ouro 18k · 1,0 mm · R$ 12,00/cm",
      },
      {
        name: "Fios / Chapas — Perfil e Bitola",
        description:
          "Se é redondo, chato ou quadrado, e a medida em mm. Ideal para soldas e acabamentos.",
        example: "Fio chato 0,45 mm · Ouro 18k · R$ 6,50/cm",
      },
      {
        name: "Ligas — Pureza e preços",
        description:
          "Cadastre a liga (ex.: 18k) com o preço do metal puro e da pré-liga por grama.",
        example: "Ouro 18k (Au750) · Au puro R$ 380/g · Pré-liga R$ 8/g",
      },
    ],
    tips: [
      "Use os filtros de Lapidação, Cor e Tamanho na lista de pedras — é o jeito mais rápido de achar o que precisa.",
      "Atualize o preço do grama da liga quando o mercado mudar: a Ficha Técnica passa a usar o valor novo.",
      "Cada variação (cor ou tamanho diferente) merece um cadastro próprio — evita confusão na hora de pedir material.",
    ],
  },

  produtos: {
    title: "Produtos",
    summary:
      "Aqui ficam as joias do catálogo: o que o cliente vê na vitrine e o que a loja vende no balcão. Cada produto tem foto, preço, categoria e, se quiser, um código interno (SKU).",
    fields: [
      {
        name: "Título",
        description:
          "Nome da peça como aparece na vitrine e nas buscas. Seja claro e atraente.",
        example: "Anel Solitário Ouro 18k com Zircônia",
      },
      {
        name: "Código (SKU)",
        description:
          "Código interno da loja. Ajuda o vendedor a achar a peça rápido no PDV. Não aparece para o cliente na vitrine.",
        example: "AN-18K-001 · BR-VZ-040 · CL-VEN-1MM",
      },
      {
        name: "Descrição",
        description:
          "Detalhes que ajudam a venda e a produção: metal, pedras, aro, comprimento.",
        example: "Ouro 18k amarelo, zircônia 20 pontos, aro 16.",
      },
      {
        name: "Preço de venda",
        description: "Valor cobrado do cliente, em reais.",
        example: "R$ 1.200,00",
      },
      {
        name: "Custo",
        description:
          "Quanto a peça custa para a loja (materiais + mão de obra). Pode vir da Ficha Técnica.",
        example: "R$ 480,00",
      },
      {
        name: "Categoria",
        description:
          "Grupo da peça (anéis, brincos, colares…). Organiza a vitrine e os filtros.",
        example: "Anéis · Brincos · Colares · Pulseiras",
      },
      {
        name: "Imagem",
        description:
          "Foto principal da joia. Use boa iluminação e fundo limpo — é o que vende na vitrine.",
        example: "Foto frontal da peça, fundo claro, bem enquadrada.",
      },
      {
        name: "Disponível",
        description:
          "Se estiver ligado, a peça aparece na vitrine e no PDV. Desligue quando acabar o estoque ou for modelo fora de linha.",
        example: "Desmarque quando a peça estiver esgotada.",
      },
    ],
    tips: [
      "Cadastre as categorias antes de criar produtos — sem categoria, o botão “Novo Produto” fica bloqueado.",
      "O código SKU é ótimo para o balcão: o vendedor digita AN-18K e acha na hora.",
      "Depois de precificar na Ficha Técnica, volte aqui e confira se preço e custo batem com o cálculo.",
    ],
  },

  pdv: {
    title: "Novo Pedido (PDV)",
    summary:
      "É o balcão de vendas: escolha as peças, informe o cliente, anote sinal se houver, e finalize. O pedido vai para a produção e pode gerar a requisição de materiais.",
    fields: [
      {
        name: "Busca de produtos",
        description:
          "Digite o nome da peça ou o código (SKU) para achar rápido no catálogo.",
        example: "AN-18K-001 ou “solitário”",
      },
      {
        name: "Nome do cliente",
        description: "Quem está comprando. Aparece no pedido e na impressão.",
        example: "Maria Silva",
      },
      {
        name: "Vendedor(a)",
        description:
          "Opcional. Quem atendeu a venda — útil para comissão e histórico.",
        example: "Ana",
      },
      {
        name: "WhatsApp",
        description:
          "Telefone do cliente para contato. Opcional, mas ajuda no pós-venda.",
        example: "(11) 99999-9999",
      },
      {
        name: "Sinal / adiantamento",
        description:
          "Valor já pago na hora do pedido. O restante fica como saldo.",
        example: "Pedido R$ 1.200 · sinal R$ 400 · saldo R$ 800",
      },
      {
        name: "Quantidade",
        description:
          "Quantas unidades de cada peça entram no pedido. Use + e − para ajustar.",
        example: "2 brincos iguais · 1 anel",
      },
      {
        name: "Carrinho e total",
        description:
          "Resumo do que foi escolhido e o valor final. Confira antes de finalizar.",
        example: "3 itens · Total R$ 2.450,00",
      },
    ],
    tips: [
      "Só aparecem produtos marcados como “Disponível” no catálogo.",
      "Depois de finalizar, acompanhe o pedido em Pedidos / Histórico e imprima a requisição de materiais se a oficina precisar.",
      "Se o cliente já conhece o código da peça, busque pelo SKU — é mais rápido que pelo nome.",
    ],
  },
};

export function getHelpModule(key: HelpModuleKey): HelpModule | undefined {
  return helpContent[key];
}
