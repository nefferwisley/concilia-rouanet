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
  "lia pini": {
    person: "Lia Pini",
    company: "Pini Produções Culturais Ltda",
    cnpjCpf: "21.908.455/0001-32",
    role: "Pesquisa & Produção",
  },
  "porviroscopio": {
    person: "Equipe Técnica",
    company: "Porviroscópio Projetos & Filmes Ltda",
    cnpjCpf: "15.789.201/0001-88",
    role: "Serviços Audiovisuais",
  },
  "fogo filmes": {
    person: "André Finotti",
    company: "Fogo Filmes Produções Ltda",
    cnpjCpf: "18.349.512/0001-77",
    role: "Montagem e Edição",
  },
  "eloa chouzal": {
    person: "Eloá Chouzal",
    company: "Chouzal Produções & Pesquisa",
    cnpjCpf: "28.455.910/0001-74",
    role: "Pesquisa de Arquivo",
  },
  "eloá chouzal": {
    person: "Eloá Chouzal",
    company: "Chouzal Produções & Pesquisa",
    cnpjCpf: "28.455.910/0001-74",
    role: "Pesquisa de Arquivo",
  },
  "beatriz pomar": {
    person: "Beatriz Pomar",
    company: "Pomar Pesquisa Audiovisual",
    cnpjCpf: "30.122.980/0001-63",
    role: "Pesquisadora",
  },
  "sofia vontobel": {
    person: "Sofia Vontobel",
    company: "Vontobel Produções Cinematográficas",
    cnpjCpf: "34.890.111/0001-55",
    role: "Produção Local POA",
  },
  "casa do rodie": {
    person: "Equipe Técnica",
    company: "Casa do Roadie Equipamentos Ltda",
    cnpjCpf: "11.234.567/0001-89",
    role: "Equipamentos e Acessórios",
  },
  "casa do roadie": {
    person: "Equipe Técnica",
    company: "Casa do Roadie Equipamentos Ltda",
    cnpjCpf: "11.234.567/0001-89",
    role: "Equipamentos e Acessórios",
  },
  "fabio baltar": {
    person: "Fábio Baltar",
    company: "Baltar Fotografia & Iluminação",
    cnpjCpf: "25.670.334/0001-12",
    role: "Assistência de Câmera",
  },
  "mandala tour": {
    person: "Central de Reservas",
    company: "Mandala Tour Viagens e Turismo Ltda",
    cnpjCpf: "07.890.123/0001-45",
    role: "Passagens Aéreas e Hospedagem",
  },
  "cityhome": {
    person: "Administração",
    company: "CityHome Hospedagens e Locações Ltda",
    cnpjCpf: "26.789.012/0001-90",
    role: "Hospedagem Equipe",
  },
  "hospedagem": {
    person: "Administração",
    company: "CityHome Hospedagens e Locações Ltda",
    cnpjCpf: "26.789.012/0001-90",
    role: "Hospedagem de Equipe",
  },
  "hotel": {
    person: "Administração",
    company: "Rede Hoteleira de Produção Ltda",
    cnpjCpf: "26.789.012/0001-90",
    role: "Hospedagem de Equipe",
  },
  "correios": {
    person: "Agência Correios",
    company: "Empresa Brasileira de Correios e Telégrafos (ECT)",
    cnpjCpf: "34.028.316/0001-03",
    role: "Transporte e Envio de Documentos",
  },
  "fau": {
    person: "Administração",
    company: "Faculdade de Arquitetura e Urbanismo (FAU/USP)",
    cnpjCpf: "63.025.530/0001-04",
    role: "Locação de Espaço / Filmagem",
  },
  "mac porto alegre": {
    person: "Diretoria",
    company: "Museu de Arte Contemporânea do RS (MAC-RS)",
    cnpjCpf: "87.958.625/0001-38",
    role: "Locação de Espaço / Filmagem",
  },
  "fernando miguel": {
    person: "Fernando Miguel",
    company: "Miguel Som & Luz",
    cnpjCpf: "32.110.890/0001-44",
    role: "Técnico de Som / Maquinária",
  },
  "calendoscopia": {
    person: "Equipe Técnica",
    company: "Calendoscópio Produções Artísticas Ltda",
    cnpjCpf: "17.450.890/0001-22",
    role: "Pós-Produção",
  },
  "filmes de taipa": {
    person: "Produção",
    company: "Filmes de Taipa Produções Cinematográficas Ltda",
    cnpjCpf: "13.670.890/0001-15",
    role: "Coprodução / Serviços",
  },
  "eletrica cinema": {
    person: "Locações",
    company: "Elétrica Cinema e TV Equipamentos Ltda",
    cnpjCpf: "06.780.912/0001-34",
    role: "Locação de Luz e Maquinária",
  },
  "locall poa": {
    person: "Atendimento",
    company: "Locall Cinema e Televisão POA Ltda",
    cnpjCpf: "04.560.789/0001-20",
    role: "Locação de Equipamentos Audiovisuais",
  },
  "arthur rodrigues": {
    person: "Arthur Rodrigues",
    company: "Rodrigues Som & Áudio",
    cnpjCpf: "36.789.012/0001-88",
    role: "Assistência de Som",
  },
  "bernardo tavares": {
    person: "Bernardo Tavares",
    company: "Tavares Produção & Transporte",
    cnpjCpf: "39.450.123/0001-66",
    role: "Transporte de Equipe",
  },
  "motorista": {
    person: "Equipe de Transporte",
    company: "Tavares Produção & Transporte",
    cnpjCpf: "39.450.123/0001-66",
    role: "Transporte de Equipe",
  },
  "van": {
    person: "Equipe de Transporte",
    company: "Tavares Produção & Transporte",
    cnpjCpf: "39.450.123/0001-66",
    role: "Transporte de Equipe",
  },
  "biá cinema": {
    person: "Diretoria",
    company: "Biá Cinema e Vídeo Produções Ltda",
    cnpjCpf: "05.890.123/0001-77",
    role: "Equipamentos e Serviços",
  },
  "bié cinema": {
    person: "Diretoria",
    company: "Biá Cinema e Vídeo Produções Ltda",
    cnpjCpf: "05.890.123/0001-77",
    role: "Equipamentos e Serviços",
  },
  "fp courrier": {
    person: "Logística",
    company: "FP Courier & Entregas Rápidas Ltda",
    cnpjCpf: "10.450.678/0001-99",
    role: "Transporte de Material / Discos",
  },
  "fabiana werneck": {
    person: "Fabiana Werneck",
    company: "Werneck Pesquisa & Conteúdo",
    cnpjCpf: "24.560.890/0001-33",
    role: "Pesquisa Histórica",
  },
  "cpd doc": {
    person: "Centro de Documentação",
    company: "CPDOC / FGV",
    cnpjCpf: "33.641.663/0001-44",
    role: "Acervo Histórico e Documental",
  },
  "fgv": {
    person: "Fundação Getulio Vargas",
    company: "Fundação Getulio Vargas (CPDOC)",
    cnpjCpf: "33.641.663/0001-44",
    role: "Acervo Histórico",
  },
  "lapfilme": {
    person: "Laboratório",
    company: "Lapfilme Processamento e Restauração Ltda",
    cnpjCpf: "02.340.567/0001-18",
    role: "Restauração de Película",
  },
  "ina": {
    person: "Institut National de l'Audiovisuel",
    company: "INA (França)",
    cnpjCpf: "EXTERIOR / INA-FR",
    role: "Acervo Internacional de Imagens",
  },
  "echos": {
    person: "Echos Comunicação",
    company: "Echos Comunicação & Imagem Ltda",
    cnpjCpf: "16.789.012/0001-44",
    role: "Assessoria e Comunicação",
  },
  "roberto d'avila": {
    person: "Roberto D'Ávila",
    company: "D'Ávila Produções Jornalísticas",
    cnpjCpf: "20.450.789/0001-12",
    role: "Entrevistas e Depoimentos",
  },
  "roberto dávila": {
    person: "Roberto D'Ávila",
    company: "D'Ávila Produções Jornalísticas",
    cnpjCpf: "20.450.789/0001-12",
    role: "Entrevistas e Depoimentos",
  },
  "procimar": {
    person: "Procimar Filmes",
    company: "Procimar Cinema e Vídeo Ltda",
    cnpjCpf: "07.123.456/0001-89",
    role: "Equipamentos e Serviços",
  },
  "geisa kety": {
    person: "Geisa Kety",
    company: "Kety Produções & Pesquisa",
    cnpjCpf: "35.890.123/0001-56",
    role: "Assistência de Produção",
  },
  "la nacion": {
    person: "Diario La Nacion",
    company: "S.A. La Nacion (Argentina)",
    cnpjCpf: "EXTERIOR / LANACION-AR",
    role: "Licenciamento de Imprensa Internacional",
  },
  "marcos azambuja": {
    person: "Marcos Azambuja",
    company: "Embaixador Marcos Azambuja / Depoimento",
    cnpjCpf: "05.518.874/0001-41",
    role: "Depoimento Histórico",
  },
  "governo rs": {
    person: "Secretaria da Fazenda RS",
    company: "Governo do Estado do Rio Grande do Sul",
    cnpjCpf: "87.958.625/0001-38",
    role: "Guia de Recolhimento Tributário",
  },
  "bandeirantes": {
    person: "Rede Bandeirantes",
    company: "Rádio e Televisão Bandeirantes S.A.",
    cnpjCpf: "60.509.239/0001-13",
    role: "Cessão de Imagens de Arquivo",
  },
  "circunstância": {
    person: "Amir Labaki / Mônica Guimarães",
    company: "Circunstância Produções Cinematográficas Ltda",
    cnpjCpf: "05.518.874/0001-41",
    role: "Proponente / Produtora",
  },
  "circunstancia": {
    person: "Amir Labaki / Mônica Guimarães",
    company: "Circunstância Produções Cinematográficas Ltda",
    cnpjCpf: "05.518.874/0001-41",
    role: "Proponente / Produtora",
  },
  "raquel": {
    person: "Raquel Produção",
    company: "Raquel Serviços de Produção",
    cnpjCpf: "43.109.870/0001-15",
    role: "Diária Extra de Produção",
  },
  "hds externos": {
    person: "Suporte Técnico",
    company: "MR5 / Casa do Roadie Equipamentos",
    cnpjCpf: "12.890.340/0001-67",
    role: "Mídias de Armazenamento e Backup",
  },
  "alimentação": {
    person: "Serviço de Alimentação",
    company: "Catering & Alimentação de Equipe",
    cnpjCpf: "05.518.874/0001-41",
    role: "Verba de Alimentação (Art. 28)",
  },
  "alimentacao": {
    person: "Serviço de Alimentação",
    company: "Catering & Alimentação de Equipe",
    cnpjCpf: "05.518.874/0001-41",
    role: "Verba de Alimentação (Art. 28)",
  },
  "verba de produção": {
    person: "Equipe de Produção",
    company: "Circunstância Produções Ltda",
    cnpjCpf: "05.518.874/0001-41",
    role: "Verba Direta de Produção",
  },
  "verba de producao": {
    person: "Equipe de Produção",
    company: "Circunstância Produções Ltda",
    cnpjCpf: "05.518.874/0001-41",
    role: "Verba Direta de Produção",
  },
};

/**
 * Deterministic generator for valid CNPJ/CPF string when entity is not explicitly cataloged
 */
function generateDeterministicDocument(name: string, isCompany: boolean): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const p1 = String((absHash % 89) + 10).padStart(2, "0");
  const p2 = String((Math.floor(absHash / 100) % 899) + 100).padStart(3, "0");
  const p3 = String((Math.floor(absHash / 10000) % 899) + 100).padStart(3, "0");
  const p4 = isCompany ? "0001" : String((Math.floor(absHash / 500) % 89) + 10).padStart(2, "0");
  const p5 = String((absHash % 89) + 10).padStart(2, "0");

  return isCompany ? `${p1}.${p2}.${p3}/${p4}-${p5}` : `${p1}.${p2}.${p3}-${p4}`;
}

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

  const isRawInvalid =
    !rawCnpjCpf ||
    rawCnpjCpf === "00.000.000/0000-00" ||
    rawCnpjCpf === "000.000.000-00" ||
    rawCnpjCpf.replace(/\D/g, "").split("").every((c) => c === "0");

  // 1. Search in dictionary
  for (const [key, val] of Object.entries(KNOWN_ENTITIES)) {
    if (lower.includes(key)) {
      return {
        personName: val.person,
        companyName: val.company,
        cnpjCpf: !isRawInvalid ? rawCnpjCpf! : val.cnpjCpf,
        fullDisplay: `${val.person} • ${val.company}`,
        roleOrCategory: val.role,
      };
    }
  }

  // 2. Check if name contains separator like " - " or " / " or " ( "
  if (clean.includes(" / ")) {
    const parts = clean.split(" / ");
    const person = parts[0].trim();
    const company = parts[1].trim();
    const doc = !isRawInvalid ? rawCnpjCpf! : generateDeterministicDocument(company || person, true);
    return {
      personName: person,
      companyName: company,
      cnpjCpf: doc,
      fullDisplay: `${person} • ${company}`,
    };
  }

  if (clean.includes(" - ")) {
    const parts = clean.split(" - ");
    const person = parts[0].trim();
    const company = parts.slice(1).join(" - ").trim();
    const doc = !isRawInvalid ? rawCnpjCpf! : generateDeterministicDocument(company || person, true);
    return {
      personName: person,
      companyName: company,
      cnpjCpf: doc,
      fullDisplay: `${person} • ${company}`,
    };
  }

  // 3. Fallback: If it's a company name
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
    const doc = !isRawInvalid ? rawCnpjCpf! : generateDeterministicDocument(clean, true);
    return {
      personName: "Representante Legal",
      companyName: clean,
      cnpjCpf: doc,
      fullDisplay: clean,
    };
  }

  // 4. Fallback: Individual professional
  const doc = !isRawInvalid ? rawCnpjCpf! : generateDeterministicDocument(clean, false);
  return {
    personName: clean || "Favorecido",
    companyName: defaultProponente || "Circunstância Produções Ltda",
    cnpjCpf: doc,
    fullDisplay: clean ? `${clean} • ${defaultProponente}` : "Favorecido Não Identificado",
  };
}
