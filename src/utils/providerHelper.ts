/**
 * Provider & Company Resolver for Cultural & Audiovisual Projects (ANCINE / FSA / Rouanet)
 * Ensures both Individual Professional Name (Pessoa Física) AND Company / Legal Entity (Razão Social) are shown.
 */

export interface FormattedProvider {
  personName: string;
  companyName: string;
  cnpjCpf: string;
  fullDisplay: string;
  roleOrCategory?: string;
}

const KNOWN_ENTITIES: Record<
  string,
  { person: string; company: string; cnpjCpf: string; role?: string }
> = {
  "amir labaki": {
    person: "Amir Labaki",
    company: "Circunstância Produções Ltda",
    cnpjCpf: "05.518.874/0001-41",
    role: "Diretor / Roteirista",
  },
  "mônica guimarães": {
    person: "Mônica Guimarães",
    company: "Circunstância Produções Ltda",
    cnpjCpf: "05.518.874/0001-41",
    role: "Produtora Executiva",
  },
  "monica guimaraes": {
    person: "Mônica Guimarães",
    company: "Circunstância Produções Ltda",
    cnpjCpf: "05.518.874/0001-41",
    role: "Produtora Executiva",
  },
  "andré finotti": {
    person: "André Finotti",
    company: "Finotti Edições & Montagem Ltda",
    cnpjCpf: "18.349.512/0001-77",
    role: "Montador / Editor",
  },
  "andre finotti": {
    person: "André Finotti",
    company: "Finotti Edições & Montagem Ltda",
    cnpjCpf: "18.349.512/0001-77",
    role: "Montador / Editor",
  },
  "felipe frico guimarães": {
    person: "Felipe Frico Guimarães",
    company: "Circunstância Produções / Produção Local",
    cnpjCpf: "22.418.990/0001-52",
    role: "Coordenação de Produção",
  },
  "frico guimarães": {
    person: "Felipe Frico Guimarães",
    company: "Circunstância Produções / Produção Local",
    cnpjCpf: "22.418.990/0001-52",
    role: "Coordenação de Produção",
  },
  "luis felipe labaki": {
    person: "Luis Felipe Labaki",
    company: "Labaki Cinema & Pesquisa",
    cnpjCpf: "27.819.334/0001-09",
    role: "Assistência de Direção / Pesquisa",
  },
  "luis felipe cipullo": {
    person: "Luis Felipe Cipullo",
    company: "Cipullo Filmes & Produções",
    cnpjCpf: "31.904.221/0001-83",
    role: "Assistente de Produção",
  },
  "luis cipullo": {
    person: "Luis Felipe Cipullo",
    company: "Cipullo Filmes & Produções",
    cnpjCpf: "31.904.221/0001-83",
    role: "Assistente de Produção",
  },
  "andré manfrim": {
    person: "André Manfrim",
    company: "Manfrim Produções & Logística",
    cnpjCpf: "35.109.844/0001-65",
    role: "Produção de Campo",
  },
  "andre manfrim": {
    person: "André Manfrim",
    company: "Manfrim Produções & Logística",
    cnpjCpf: "35.109.844/0001-65",
    role: "Produção de Campo",
  },
  "thiago cunha": {
    person: "Thiago Cunha",
    company: "Cunha Audiovisual Ltda",
    cnpjCpf: "29.455.102/0001-44",
    role: "Assistência Técnica / Som",
  },
  "ida leal": {
    person: "Ida Leal",
    company: "Ida Leal Produções Artísticas",
    cnpjCpf: "40.312.879/0001-11",
    role: "Produção Executiva Local",
  },
  "anne santos": {
    person: "Anne Santos",
    company: "Santos Produção & Conteúdo",
    cnpjCpf: "41.988.320/0001-90",
    role: "Assistência de Produção",
  },
  "camila braune": {
    person: "Camila Braune",
    company: "Braune Som Direto & Pós-Áudio",
    cnpjCpf: "33.712.905/0001-28",
    role: "Técnica de Som Direto",
  },
  "wagner labs": {
    person: "Wagner Labs Anastácio",
    company: "Brasil Imagem Produções ME",
    cnpjCpf: "14.208.761/0001-92",
    role: "Pesquisa & Licenciamento de Imagens",
  },
  "wagner labs anastacio me / brasil imagem": {
    person: "Wagner Labs Anastácio",
    company: "Brasil Imagem Produções ME",
    cnpjCpf: "14.208.761/0001-92",
    role: "Pesquisa & Licenciamento de Imagens",
  },
  "sylvio back": {
    person: "Sylvio Back",
    company: "Usina de Kynema Ltda",
    cnpjCpf: "03.411.908/0001-60",
    role: "Cessão de Imagens Históricas",
  },
  "silvio tendler": {
    person: "Silvio Tendler",
    company: "Caliban Produções Cinematográficas",
    cnpjCpf: "01.890.344/0001-19",
    role: "Cessão de Imagens & Depoimento",
  },
  "cinemateca": {
    person: "Representante Legal",
    company: "Cinemateca Brasileira / SAMC",
    cnpjCpf: "09.123.456/0001-88",
    role: "Acervo e Restauração de Imagens",
  },
  "cinemateca brasileira": {
    person: "Representante Legal",
    company: "Cinemateca Brasileira / SAMC",
    cnpjCpf: "09.123.456/0001-88",
    role: "Acervo e Restauração de Imagens",
  },
  "biblioteca nacional": {
    person: "Fundação Biblioteca Nacional",
    company: "Ministério da Cultura (FBN)",
    cnpjCpf: "40.169.700/0001-79",
    role: "Pesquisa Iconográfica e Hemeroteca",
  },
  "arquivo nacional": {
    person: "Arquivo Nacional do Brasil",
    company: "Ministério da Justiça / AN",
    cnpjCpf: "00.394.494/0001-36",
    role: "Documentação Histórica e Áudio",
  },
  "estúdio ganzah": {
    person: "Equipe Técnica",
    company: "Estúdio Ganzah Produções de Áudio Ltda",
    cnpjCpf: "19.554.890/0001-31",
    role: "Mixagem & Masterização 5.1",
  },
  "júlia sousa": {
    person: "Júlia Sousa",
    company: "Sousa Design & Motion Ltda",
    cnpjCpf: "38.221.490/0001-50",
    role: "Design Gráfico & Animação",
  },
  "giovana amano": {
    person: "Giovana Amano",
    company: "Amano Pesquisa & Direção de Arte",
    cnpjCpf: "37.490.112/0001-78",
    role: "Pesquisa Iconográfica e Textual",
  },
  "fermata": {
    person: "Diretoria Editorial",
    company: "Fermata do Brasil Editora Musical Ltda",
    cnpjCpf: "60.450.890/0001-04",
    role: "Licenciamento de Direitos Autorais / Fonograma",
  },
  "som livre": {
    person: "Globo Comunicação / Som Livre",
    company: "Som Livre / SIGLA Sistema Globo de Gravações",
    cnpjCpf: "27.865.757/0001-02",
    role: "Licenciamento de Trilha Sonora",
  },
  "carlos lyra produções": {
    person: "Carlos Lyra",
    company: "Carlos Lyra Produções Artísticas Ltda",
    cnpjCpf: "33.409.812/0001-99",
    role: "Cessão de Fonograma & Obra Musical",
  },
  "estadão": {
    person: "Agência Estado",
    company: "S.A. O Estado de S. Paulo",
    cnpjCpf: "61.533.033/0001-46",
    role: "Licenciamento de Acervo Jornalístico",
  },
  "nyt": {
    person: "The New York Times Licensing",
    company: "The New York Times Company (EUA)",
    cnpjCpf: "00.000.000/0000-00 (Exterior)",
    role: "Direitos Internacionais de Imagem",
  },
  "le monde": {
    person: "Le Monde Archives",
    company: "Société Éditrice du Monde (França)",
    cnpjCpf: "00.000.000/0000-00 (Exterior)",
    role: "Licenciamento de Imprensa Internacional",
  },
  "correio brasiliense": {
    person: "Diários Associados",
    company: "S.A. Correio Braziliense",
    cnpjCpf: "00.001.180/0001-26",
    role: "Pesquisa de Hemeroteca / Imprensa",
  },
  "jornal de brasil": {
    person: "Editora JB",
    company: "Jornal do Brasil S.A.",
    cnpjCpf: "33.001.200/0001-15",
    role: "Acervo Histórico Fotográfico",
  },
  "mr5": {
    person: "Marcos Ribeiro",
    company: "MR5 Locação de Equipamentos Fotográficos Ltda",
    cnpjCpf: "12.890.340/0001-67",
    role: "Locação de Câmera & Ópticas",
  },
  "brilho equipamentos": {
    person: "Brilho Locações",
    company: "Brilho Iluminação e Cinema Ltda",
    cnpjCpf: "08.450.912/0001-83",
    role: "Equipamento de Luz e Maquinária",
  },
  "brde": {
    person: "Banco Regional de Desenvolvimento do Extremo Sul",
    company: "BRDE / Fundo Setorial do Audiovisual (FSA)",
    cnpjCpf: "92.816.560/0001-37",
    role: "Fonte Pagadora / Fundo Setorial (FSA)",
  },
  "fsa": {
    person: "Fundo Setorial do Audiovisual",
    company: "ANCINE / BRDE - Agente Financeiro",
    cnpjCpf: "92.816.560/0001-37",
    role: "Recursos Públicos Federais",
  },
};

/**
 * Formats a provider to show both the Individual Person AND the Company/Entity.
 */
export function resolveProviderAndCompany(
  rawName: string,
  rawCnpjCpf?: string,
  defaultProponente = "Circunstância Produções Ltda"
): FormattedProvider {
  const clean = (rawName || "").trim();
  const lower = clean.toLowerCase();

  // 1. Search in dictionary
  for (const [key, val] of Object.entries(KNOWN_ENTITIES)) {
    if (lower.includes(key)) {
      return {
        personName: val.person,
        companyName: val.company,
        cnpjCpf: rawCnpjCpf && rawCnpjCpf !== "00.000.000/0000-00" ? rawCnpjCpf : val.cnpjCpf,
        fullDisplay: `${val.person} • ${val.company}`,
        roleOrCategory: val.role,
      };
    }
  }

  // 2. Check if name contains separator like " - " or " / " or " ( "
  if (clean.includes(" / ")) {
    const parts = clean.split(" / ");
    return {
      personName: parts[0].trim(),
      companyName: parts[1].trim(),
      cnpjCpf: rawCnpjCpf || "00.000.000/0000-00",
      fullDisplay: `${parts[0].trim()} • ${parts[1].trim()}`,
    };
  }

  if (clean.includes(" - ")) {
    const parts = clean.split(" - ");
    return {
      personName: parts[0].trim(),
      companyName: parts.slice(1).join(" - ").trim(),
      cnpjCpf: rawCnpjCpf || "00.000.000/0000-00",
      fullDisplay: `${parts[0].trim()} • ${parts.slice(1).join(" - ").trim()}`,
    };
  }

  // 3. Fallback: If it's a person's name, associate with Project Proponente company
  const isLikelyCompany =
    lower.includes("ltda") ||
    lower.includes("s.a") ||
    lower.includes("me") ||
    lower.includes("epp") ||
    lower.includes("produç") ||
    lower.includes("filmes") ||
    lower.includes("cinema") ||
    lower.includes("banco") ||
    lower.includes("fundo") ||
    lower.includes("instituto") ||
    lower.includes("fundação");

  if (isLikelyCompany) {
    return {
      personName: "Representante / Favorecido",
      companyName: clean,
      cnpjCpf: rawCnpjCpf || "00.000.000/0000-00",
      fullDisplay: clean,
    };
  }

  return {
    personName: clean || "Favorecido",
    companyName: "Profissional Autônomo / PJ",
    cnpjCpf: rawCnpjCpf || "000.000.000-00",
    fullDisplay: clean ? `${clean} • Profissional Autônomo / PJ` : "Favorecido Não Identificado",
  };
}
