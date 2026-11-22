interface Parameter {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  initial: number;
}
interface Result { label: string; unit: string; value: number; decimals?: number }
export interface Experiment {
  title: string;
  prompt: string;
  formula: string;
  parameters: Parameter[];
  calculate: (values: number[]) => Result[];
}

const param = (label: string, unit: string, min: number, max: number, initial: number, step = 1): Parameter =>
  ({ label, unit, min, max, step, initial });
const result = (label: string, unit: string, value: number, decimals = 2): Result => ({ label, unit, value, decimals });
const airR = 0.287;

const experiments = {
  idealGas: {
    title: 'Gás ideal em um cilindro', prompt: 'O que acontece com o volume de 1 kg de ar quando a pressão dobra a temperatura constante?',
    formula: 'V = mRT/p · R = 0,287 kJ/(kg·K)',
    parameters: [param('Temperatura', 'K', 250, 650, 300, 5), param('Pressão absoluta', 'kPa', 50, 400, 100, 5)],
    calculate: ([T, p]) => [result('Volume', 'm³', airR * T / p, 3)],
  },
  equilibrium: {
    title: 'Equilíbrio térmico de duas amostras', prompt: 'As duas amostras têm a mesma capacidade térmica e o recipiente é isolado. Em que valor estabiliza a temperatura?',
    formula: 'Tₑ = (T₁ + T₂)/2',
    parameters: [param('Amostra 1', '°C', 10, 95, 65), param('Amostra 2', '°C', 10, 95, 25)],
    calculate: ([hot, cold]) => [result('Temperatura final', '°C', (hot + cold) / 2, 1), result('Diferença inicial', 'K', Math.abs(hot - cold), 1)],
  },
  compressibility: {
    title: 'Diagnóstico de gás ideal', prompt: 'Ajuste o volume específico medido e procure a condição que mais se aproxima de Z = 1.',
    formula: 'Z = pv/(RT) · ar a 300 K',
    parameters: [param('Pressão absoluta', 'kPa', 80, 300, 100, 5), param('Volume específico', 'm³/kg', 0.2, 1.2, 0.85, 0.01)],
    calculate: ([p, v]) => [result('Fator de compressibilidade', '', p * v / (airR * 300), 3)],
  },
  boundary: {
    title: 'Trabalho de fronteira a pressão constante', prompt: 'Troque o sinal de ΔV e observe a diferença entre expansão e compressão.',
    formula: 'W = p ΔV · trabalho positivo sai do sistema',
    parameters: [param('Pressão', 'kPa', 80, 500, 200, 10), param('Variação de volume', 'm³', -0.5, 0.5, 0.2, 0.02)],
    calculate: ([p, deltaV]) => [result('Trabalho de fronteira', 'kJ', p * deltaV, 1)],
  },
  polytropic: {
    title: 'Compressão politrópica', prompt: 'Compare n = 1 com n = 1,4 para a mesma razão volumétrica.',
    formula: 'pVⁿ = constante · p₁ = 100 kPa · V₁ = 0,30 m³',
    parameters: [param('Expoente politrópico', '', 1, 1.6, 1.25, 0.05), param('Razão V₂/V₁', '', 0.25, 1, 0.6, 0.05)],
    calculate: ([n, ratio]) => {
      const pressure = 100 * ratio ** -n;
      const work = n === 1 ? 30 * Math.log(ratio) : 30 * (ratio ** (1 - n) - 1) / (1 - n);
      return [result('Pressão final', 'kPa', pressure, 1), result('Trabalho do gás', 'kJ', work, 1)];
    },
  },
  sensible: {
    title: 'Aquecimento de água sem mudança de fase', prompt: 'Dobrar a massa exige o dobro de energia para a mesma variação de temperatura?',
    formula: 'Q = m cₚ ΔT · cₚ ≈ 4,18 kJ/(kg·K)',
    parameters: [param('Massa', 'kg', 0.5, 5, 2, 0.1), param('Aumento de temperatura', 'K', 5, 45, 20)],
    calculate: ([mass, deltaT]) => [result('Calor recebido', 'kJ', mass * 4.18 * deltaT, 1)],
  },
  closed: {
    title: 'Balanço de energia do sistema fechado', prompt: 'Encontre duas combinações distintas de calor e trabalho com a mesma variação de energia.',
    formula: 'ΔE = Q − W',
    parameters: [param('Calor recebido', 'kJ', -120, 200, 100, 5), param('Trabalho realizado', 'kJ', -100, 150, 40, 5)],
    calculate: ([heat, work]) => [result('Variação de energia', 'kJ', heat - work, 1)],
  },
  massBalance: {
    title: 'Acúmulo de massa em um volume de controle', prompt: 'Qual combinação de vazões representa o regime permanente?',
    formula: 'Δm = (ṁₑ − ṁₛ) Δt · intervalo de 10 s',
    parameters: [param('Vazão de entrada', 'kg/s', 0, 5, 2, 0.1), param('Vazão de saída', 'kg/s', 0, 5, 1.5, 0.1)],
    calculate: ([input, output]) => [result('Saldo de massa', 'kg', 10 * (input - output), 1)],
  },
  turbine: {
    title: 'Turbina adiabática', prompt: 'Compare o efeito de aumentar a vazão com o de aumentar a queda de entalpia.',
    formula: 'Ẇ = ṁ (hₑ − hₛ) · regime permanente; energias cinética e potencial desprezadas',
    parameters: [param('Vazão mássica', 'kg/s', 0.1, 10, 2, 0.1), param('Queda de entalpia', 'kJ/kg', 25, 500, 250, 5)],
    calculate: ([flow, drop]) => [result('Potência no eixo', 'kW', flow * drop, 1)],
  },
  nozzle: {
    title: 'Bocal adiabático', prompt: 'Para uma mesma velocidade de entrada, como a queda de entalpia afeta a velocidade de saída?',
    formula: 'Vₛ = √(Vₑ² + 2Δh) · Vₑ = 40 m/s · Δh em J/kg',
    parameters: [param('Queda de entalpia', 'kJ/kg', 0, 90, 35, 1)],
    calculate: ([drop]) => [result('Velocidade de saída', 'm/s', Math.sqrt(40 ** 2 + 2000 * drop), 1)],
  },
  tank: {
    title: 'Enchimento adiabático de tanque evacuado', prompt: 'Por que o gás final pode ficar mais quente que a corrente de alimentação?',
    formula: 'Tfinal = γ Tentrada · tanque rígido; gás ideal; γ = 1,40',
    parameters: [param('Temperatura de entrada', 'K', 250, 450, 300, 5)],
    calculate: ([temperature]) => [result('Temperatura no tanque', 'K', 1.4 * temperature, 1)],
  },
  emptyTank: {
    title: 'Esvaziamento adiabático de um tanque',
    prompt: 'Reduza a fração de massa restante e observe o resfriamento do gás dentro do tanque.',
    formula: 'T/T₁ = (m/m₁)^(γ − 1) · tanque rígido; gás ideal bem misturado; γ = 1,40',
    parameters: [param('Temperatura inicial', 'K', 280, 450, 330, 5), param('Massa restante', '%', 20, 100, 60, 5)],
    calculate: ([initial, fraction]) => [result('Temperatura do gás restante', 'K', initial * (fraction / 100) ** 0.4, 1)],
  },
  cell: {
    title: 'Balanço térmico de uma célula eletrolítica', prompt: 'Varie a tensão e localize o ponto em que a célula passa de absorver para rejeitar calor.',
    formula: 'Q = ΔH − 2 F U · por mol de H₂; ΔH = 285,8 kJ/mol',
    parameters: [param('Tensão da célula', 'V', 1.23, 2.3, 1.6, 0.01)],
    calculate: ([voltage]) => {
      const work = 2 * 96485 * voltage / 1000;
      return [result('Trabalho elétrico recebido', 'kJ/mol', work, 1), result('Calor recebido', 'kJ/mol', 285.8 - work, 1)];
    },
  },
  quality: {
    title: 'Mistura líquido–vapor saturada', prompt: 'Varie o título e compare a fração mássica com a fração volumétrica de vapor.',
    formula: 'v = (1 − x)vₗ + xvᵥ · água saturada a 100 kPa',
    parameters: [param('Título mássico de vapor', '', 0, 1, 0.25, 0.01)],
    calculate: ([x]) => {
      const volume = (1 - x) * 0.001043 + x * 1.694;
      return [result('Volume específico', 'm³/kg', volume, 4), result('Fração volumétrica de vapor', '%', 100 * x * 1.694 / volume, 1)];
    },
  },
  interpolation: {
    title: 'Interpolação em uma tabela didática', prompt: 'Verifique as extremidades e o ponto médio antes de usar a interpolação em uma tabela real.',
    formula: 'h = h₁ + (h₂ − h₁)(T − T₁)/(T₂ − T₁) · tabela sintética: 300 K → 400; 400 K → 520 kJ/kg',
    parameters: [param('Temperatura intermediária', 'K', 300, 400, 350, 5)],
    calculate: ([T]) => [result('Entalpia interpolada', 'kJ/kg', 400 + 1.2 * (T - 300), 1)],
  },
  entropy: {
    title: 'Entropia gerada na transferência de calor', prompt: 'Mantenha o calor fixo e aproxime as temperaturas. O que acontece com a produção de entropia?',
    formula: 'Sger = Q (1/Tfria − 1/Tquente) · dois reservatórios',
    parameters: [param('Calor transferido', 'kJ', 25, 300, 100, 5), param('Fonte quente', 'K', 320, 650, 500, 10), param('Fonte fria', 'K', 250, 320, 300, 5)],
    calculate: ([heat, hot, cold]) => [result('Entropia gerada', 'kJ/K', heat * (1 / cold - 1 / hot), 3)],
  },
  blockEntropy: {
    title: 'Entropia de um bloco em resfriamento', prompt: 'A entropia do bloco pode diminuir? Compare-a com a entropia do ambiente.',
    formula: 'ΔSbloco = m c ln(T₂/T₁) · m c = 0,9 kJ/K · ambiente a 300 K',
    parameters: [param('Temperatura inicial', 'K', 305, 600, 450, 5)],
    calculate: ([T]) => {
      const block = 0.9 * Math.log(300 / T);
      return [result('ΔS do bloco', 'kJ/K', block, 3), result('S gerada', 'kJ/K', block + 0.9 * (T - 300) / 300, 3)];
    },
  },
  isentropic: {
    title: 'Eficiência isentrópica de uma turbina', prompt: 'Ajuste a queda real até coincidir com a queda ideal e interprete o limite.',
    formula: 'ηₜ = Δhreal/Δhisentrópica · queda ideal = 350 kJ/kg',
    parameters: [param('Queda real de entalpia', 'kJ/kg', 100, 350, 280, 5)],
    calculate: ([actual]) => [result('Eficiência isentrópica', '%', 100 * actual / 350, 1)],
  },
  compressor: {
    title: 'Eficiência isentrópica de um compressor',
    prompt: 'Compare o aumento de entalpia real ao ideal. Por que o trabalho requerido cresce com as irreversibilidades?',
    formula: 'ηc = Δhisentrópica/Δhreal · aumento ideal = 90 kJ/kg',
    parameters: [param('Aumento real de entalpia', 'kJ/kg', 90, 180, 120, 5)],
    calculate: ([actual]) => [result('Eficiência isentrópica', '%', 9000 / actual, 1)],
  },
  carnot: {
    title: 'Máquina reversível entre dois reservatórios', prompt: 'Fixe a fonte quente e observe como o reservatório frio limita o trabalho útil.',
    formula: 'ηmáx = 1 − Tfria/Tquente · 100 kJ recebidos da fonte quente',
    parameters: [param('Temperatura da fonte quente', 'K', 350, 850, 600, 10), param('Temperatura da fonte fria', 'K', 240, 340, 300, 5)],
    calculate: ([hot, cold]) => [result('Eficiência máxima', '%', 100 * (1 - cold / hot), 1), result('Trabalho máximo', 'kJ', 100 * (1 - cold / hot), 1)],
  },
  refrigerator: {
    title: 'Refrigerador e bomba de calor reversíveis', prompt: 'Aumente a diferença entre os reservatórios e compare os dois coeficientes de desempenho.',
    formula: 'COPᵣ = Tfria/(Tquente − Tfria) · COPbc = COPᵣ + 1',
    parameters: [param('Reservatório frio', 'K', 240, 290, 270, 5), param('Reservatório quente', 'K', 300, 350, 310, 5)],
    calculate: ([cold, hot]) => [result('COP do refrigerador', '', cold / (hot - cold)), result('COP da bomba de calor', '', hot / (hot - cold))],
  },
  lostWork: {
    title: 'Trabalho destruído por irreversibilidades', prompt: 'Dobre Sger mantendo T₀. O que muda na oportunidade de produzir trabalho?',
    formula: 'I = T₀ Sger · relação de Gouy–Stodola',
    parameters: [param('Temperatura de referência', 'K', 260, 325, 298, 1), param('Entropia gerada', 'kJ/K', 0, 2, 0.4, 0.05)],
    calculate: ([T, entropy]) => [result('Trabalho destruído', 'kJ', T * entropy, 1)],
  },
  flowExergy: {
    title: 'Exergia física de uma corrente', prompt: 'Compare duas correntes com a mesma diferença de entalpia e diferentes diferenças de entropia.',
    formula: 'ψ = (h − h₀) − T₀(s − s₀) · T₀ = 298 K; sem termos cinético e potencial',
    parameters: [param('Diferença de entalpia', 'kJ/kg', 110, 500, 250, 5), param('Diferença de entropia', 'kJ/(kg·K)', 0, 0.3, 0.18, 0.01)],
    calculate: ([h, entropy]) => [result('Exergia específica', 'kJ/kg', h - 298 * entropy, 1)],
  },
  exergyBalance: {
    title: 'Balanço exergético de um equipamento', prompt: 'Fixe o produto e aumente a perda. Compare a perda para o ambiente com a destruição interna.',
    formula: 'Xdestruída = Xcombustível − Xproduto − Xperda · Xcombustível = 150 kJ',
    parameters: [param('Exergia do produto', 'kJ', 10, 110, 90, 5), param('Exergia perdida', 'kJ', 0, 35, 15, 5)],
    calculate: ([product, loss]) => [result('Exergia destruída', 'kJ', 150 - product - loss, 1), result('Eficiência exergética', '%', 100 * product / 150, 1)],
  },
  cellExergy: {
    title: 'Eficiência exergética da célula eletrolítica',
    prompt: 'Compare a potência elétrica de entrada com o trabalho reversível associado ao hidrogênio produzido.',
    formula: 'ηex = Urev/U · Urev = 1,23 V; eficiência faradaica unitária; exergia do calor desprezada',
    parameters: [param('Tensão de operação', 'V', 1.23, 2.3, 1.7, 0.01)],
    calculate: ([voltage]) => [result('Eficiência exergética', '%', 123 / voltage, 1)],
  },
  maxwell: {
    title: 'Relação de Maxwell no gás ideal', prompt: 'Varie o volume específico. Que tendência têm as duas derivadas relacionadas?',
    formula: '(∂s/∂v)T = (∂p/∂T)v = R/v · ar ideal',
    parameters: [param('Volume específico', 'm³/kg', 0.15, 1.6, 0.8, 0.05)],
    calculate: ([v]) => [result('Valor da derivada', 'kPa/K', airR / v, 3)],
  },
  heatCapacity: {
    title: 'Diferença entre calores específicos', prompt: 'Para o mesmo gás ideal, mude cₚ. O que permanece constante?',
    formula: 'cₚ − cᵥ = R · R do ar = 0,287 kJ/(kg·K)',
    parameters: [param('Calor específico a pressão constante', 'kJ/(kg·K)', 0.95, 1.2, 1.01, 0.01)],
    calculate: ([cp]) => [result('Calor específico a volume constante', 'kJ/(kg·K)', cp - airR, 3), result('Razão cₚ/cᵥ', '', cp / (cp - airR), 3)],
  },
  clapeyron: {
    title: 'Inclinação da curva de coexistência', prompt: 'Compare o efeito de variar o calor latente e a diferença de volume sobre a inclinação.',
    formula: 'dp/dT = Δh/(T Δv) · exemplo didático a 373 K',
    parameters: [param('Entalpia latente', 'kJ/kg', 1000, 2800, 2250, 50), param('Diferença de volume específico', 'm³/kg', 0.8, 3, 1.7, 0.1)],
    calculate: ([h, v]) => [result('Inclinação', 'kPa/K', h / (373 * v), 3)],
  },
  jouleThomson: {
    title: 'Estrangulamento isentálpico', prompt: 'Com a mesma queda de pressão, compare um coeficiente positivo com um negativo.',
    formula: 'ΔT ≈ μJT Δp · hipótese local de coeficiente constante',
    parameters: [param('Coeficiente Joule–Thomson', 'K/bar', -0.5, 0.8, 0.2, 0.05), param('Queda de pressão', 'bar', 1, 20, 10)],
    calculate: ([mu, drop]) => [result('Variação de temperatura', 'K', -mu * drop, 2)],
  },
} satisfies Record<string, Experiment>;

type ExperimentId = keyof typeof experiments;
const defaults: ExperimentId[] = ['idealGas', 'closed', 'closed', 'quality', 'entropy', 'carnot', 'carnot', 'lostWork', 'exergyBalance', 'maxwell'];
const cases: Record<number, [RegExp, ExperimentId][]> = {
  1: [[/sistema e fronteira/, 'massBalance'], [/tipo de parede|lei zero|termomet|termic|equili|temperatura/, 'equilibrium'], [/compressibilidade|fator z|gases reais|waals/, 'compressibility']],
  2: [[/politr|compressao|caminho/, 'polytropic'], [/fronteira|trabalho/, 'boundary'], [/calor|joule|adiabat/, 'sensible']],
  3: [[/eletrolisador/, 'cell'], [/enchimento/, 'tank'], [/esvaziamento/, 'emptyTank'], [/bocal|valvula/, 'nozzle'], [/turbina|regime permanente|dispositivos/, 'turbine'], [/massa|volume.*controle|transiente/, 'massBalance'], [/aquecimento|entalpia/, 'sensible']],
  4: [[/interpol|tabela|superaquecido/, 'interpolation'], [/especificos|comprimido/, 'sensible']],
  5: [[/compressor/, 'compressor'], [/isentro|turbina/, 'isentropic'], [/resfriamento|substancias|gibbs|solidos|liquidos/, 'blockEntropy']],
  6: [[/refriger|freezer|bomba de calor|clausius/, 'refrigerator']],
  7: [[/invertido|refriger/, 'refrigerator'], [/desigualdade de clausius/, 'entropy']],
  8: [[/estrangulamento/, 'jouleThomson'], [/disponivel|corrente|trabalho util/, 'flowExergy'], [/maquina termica|fonte de calor/, 'carnot']],
  9: [[/eletrolisador/, 'cellExergy'], [/fluxo|ambiente|estado morto|componentes|exergia do calor/, 'flowExergy'], [/trocador|destruicao/, 'lostWork']],
  10: [[/joule.thomson/, 'jouleThomson'], [/clapeyron/, 'clapeyron'], [/calores|cp|du e dh/, 'heatCapacity'], [/trabalho depende/, 'polytropic']],
};

export function experimentFor(lesson: number, title: string): Experiment {
  const normalized = title.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const matched = cases[lesson]?.find(([pattern]) => pattern.test(normalized));
  return experiments[matched?.[1] ?? defaults[lesson - 1] ?? 'idealGas'];
}
