/**
 * Caveman 服务
 * 实现 Caveman 核心功能，通过使用简短、直接的语言风格，减少 LLM 输出的 token 使用量
 */

/**
 * Caveman 模式类型
 */
export type CavemanMode = 'lite' | 'full' | 'ultra';

/**
 * 文言文模式类型
 */
export type WenyanMode = 'wenyan-lite' | 'wenyan' | 'wenyan-ultra';

/**
 * 扩展模式类型
 */
export type ExtendedMode = 'concise' | 'technical' | 'code';

/**
 * Caveman 服务配置
 */
export interface CavemanConfig {
  mode: CavemanMode | WenyanMode | ExtendedMode;
  enabled: boolean;
  customRules?: CustomRule[];
}

/**
 * 自定义规则
 */
export interface CustomRule {
  pattern: RegExp;
  replacement: string;
}

/**
 * Token 统计
 */
export interface TokenStats {
  originalTokens: number;
  processedTokens: number;
  savedTokens: number;
  savingsPercentage: number;
}

/**
 * Caveman 服务
 */
export class CavemanService {
  private config: CavemanConfig;
  private stats: TokenStats;

  // 预编译的正则表达式 - 填充词和冗余表达
  private static readonly FILLER_WORDS_REGEX = /\b(just|really|basically|actually|very|quite|extremely|absolutely|definitely|certainly|I think|I believe|I feel|I would say|I suggest|It seems|It appears|It looks like|that is|that are|which is|which are|in order to|so as to|for the purpose of|due to the fact that|because of the fact that|owing to the fact that|on account of the fact that|it is important to note that|it should be noted that|it is worth noting that|there are|there is|there was|there were|of course|needless to say|obviously|clearly|you know|you see|you understand|well|okay|alright|so|hm|hmm|uh|um|like|sort of|kind of|type of|a lot|a great deal|a good amount|a little|a bit|a small amount|in my opinion|from my perspective|as I see it|I mean|what I mean is|by that I mean|let me explain|let me clarify|let me elaborate|to be honest|to tell you the truth|frankly speaking|as a matter of fact|in fact|actually|however|nevertheless|nonetheless|notwithstanding|furthermore|moreover|additionally|in addition|consequently|as a result|therefore|thus|for example|for instance|such as|in conclusion|to sum up|in summary|finally|first of all|firstly|to begin with|secondly|thirdly|fourthly|lastly|in the end|in other words|put differently|to put it another way|it goes without saying|as you know|as we know|as everyone knows|I want to|I would like to|I wish to|you need to|you should|you ought to|he needs to|he should|he ought to|she needs to|she should|she ought to|they need to|they should|they ought to|it needs to|it should|it ought to|we need to|we should|we ought to)\b/gi;

  // 预编译的正则表达式 - 缩略词映射
  private static readonly CONTRACTIONS_REGEX = /\b(cannot|can not|do not|does not|did not|is not|are not|was not|were not|will not|would not|should not|could not|might not|must not|have not|has not|had not|am not|I am|you are|he is|she is|it is|we are|they are|I have|you have|he has|she has|it has|we have|they have|I will|you will|he will|she will|it will|we will|they will|I would|you would|he would|she would|it would|we would|they would)\b/gi;

  private static readonly CONTRACTIONS_MAP: Record<string, string> = {
    'cannot': "can't", 'can not': "can't",
    'do not': "don't", 'does not': "doesn't", 'did not': "didn't",
    'is not': "isn't", 'are not': "aren't", 'was not': "wasn't", 'were not': "weren't",
    'will not': "won't", 'would not': "wouldn't", 'should not': "shouldn't",
    'could not': "couldn't", 'might not': "mightn't", 'must not': "mustn't",
    'have not': "haven't", 'has not': "hasn't", 'had not': "hadn't",
    'am not': "ain't",
    'I am': "I'm", 'you are': "you're", 'he is': "he's", 'she is': "she's",
    'it is': "it's", 'we are': "we're", 'they are': "they're",
    'I have': "I've", 'you have': "you've", 'he has': "he's", 'she has': "she's",
    'it has': "it's", 'we have': "we've", 'they have': "they've",
    'I will': "I'll", 'you will': "you'll", 'he will': "he'll", 'she will': "she'll",
    'it will': "it'll", 'we will': "we'll", 'they will': "they'll",
    'I would': "I'd", 'you would': "you'd", 'he would': "he'd", 'she would': "she'd",
    'it would': "it'd", 'we would': "we'd", 'they would': "they'd"
  };

  // 文言文映射表
  private static readonly WENYAN_MAP: Record<string, string> = {
    'the': '', 'a': '', 'an': '',
    'and': '且', 'or': '或', 'but': '但', 'because': '因', 'so': '故',
    'if': '若', 'then': '则', 'when': '当', 'where': '于', 'who': '谁',
    'what': '何', 'why': '为何', 'how': '如何',
    'I': '吾', 'you': '尔', 'he': '彼', 'she': '她', 'it': '其',
    'we': '吾等', 'they': '彼等',
    'my': '吾之', 'your': '尔之', 'his': '彼之', 'her': '她之',
    'its': '其之', 'our': '吾等之', 'their': '彼等之',
    'is': '是', 'are': '是', 'was': '曾是', 'were': '曾是',
    'be': '为', 'been': '已为', 'being': '现为',
    'have': '有', 'has': '有', 'had': '曾有',
    'do': '做', 'does': '做', 'did': '做了',
    'will': '将', 'would': '将', 'should': '应', 'could': '可',
    'might': '可能', 'must': '必须', 'can': '能', 'may': '可', 'shall': '将',
    'to': '至', 'for': '为', 'with': '与', 'without': '无',
    'in': '于', 'on': '于', 'at': '于', 'by': '由', 'from': '自',
    'up': '上', 'down': '下', 'left': '左', 'right': '右',
    'front': '前', 'back': '后', 'inside': '内', 'outside': '外',
    'above': '上', 'below': '下', 'over': '上', 'under': '下',
    'through': '通过', 'across': '穿过', 'around': '周围', 'about': '关于',
    'between': '之间', 'among': '之中', 'before': '前', 'after': '后',
    'during': '期间', 'while': '而', 'since': '自', 'until': '直至',
    'as': '如', 'like': '如', 'than': '比',
    'too': '太', 'very': '甚', 'extremely': '极', 'quite': '颇',
    'rather': '颇', 'fairly': '颇', 'somewhat': '稍',
    'always': '总是', 'often': '常', 'frequently': '常',
    'sometimes': '有时', 'occasionally': '有时',
    'usually': '通常', 'generally': '通常', 'typically': '通常',
    'immediately': '立即', 'instantly': '立即',
    'quickly': '快速', 'rapidly': '快速', 'swiftly': '快速',
    'slowly': '缓慢', 'gradually': '逐渐', 'progressively': '逐渐',
    'exactly': '精确', 'precisely': '精确', 'accurately': '准确',
    'correctly': '正确', 'properly': '适当'
  };

  // 技术术语映射
  private static readonly TECHNICAL_MAP: Record<string, string> = {
    'application': 'app',
    'function': 'fn',
    'variable': 'var',
    'parameter': 'param',
    'argument': 'arg',
    'property': 'prop',
    'configuration': 'config',
    'environment': 'env',
    'development': 'dev',
    'production': 'prod',
    'repository': 'repo',
    'database': 'db',
    'document': 'doc',
    'object': 'obj',
    'array': 'arr',
    'string': 'str',
    'number': 'num',
    'boolean': 'bool',
    'integer': 'int',
    'character': 'char',
    'reference': 'ref',
    'pointer': 'ptr',
    'address': 'addr',
    'information': 'info',
    'administrator': 'admin',
    'authentication': 'auth',
    'authorization': 'authz',
    'asynchronous': 'async',
    'synchronous': 'sync',
    'error': 'err',
    'message': 'msg',
    'package': 'pkg',
    'library': 'lib',
    'temporary': 'tmp',
    'utilities': 'utils'
  };

  // 简洁模式映射
  private static readonly CONCISE_MAP: Record<string, string> = {
    'utilize': 'use',
    'implement': 'use',
    'execute': 'run',
    'perform': 'do',
    'initiate': 'start',
    'terminate': 'end',
    'facilitate': 'help',
    'optimize': 'improve',
    'validate': 'check',
    'verify': 'check',
    'modify': 'change',
    'update': 'change',
    'retrieve': 'get',
    'obtain': 'get',
    'acquire': 'get',
    'generate': 'make',
    'create': 'make',
    'construct': 'make',
    'establish': 'set',
    'configure': 'set',
    'determine': 'find',
    'identify': 'find',
    'locate': 'find',
    'demonstrate': 'show',
    'illustrate': 'show',
    'indicate': 'show',
    'represent': 'show',
    'communicate': 'tell',
    'inform': 'tell',
    'notify': 'tell',
    'require': 'need',
    'necessitate': 'need',
    'mandate': 'need',
    'attempt': 'try',
    'endeavor': 'try',
    'succeed': 'work',
    'function': 'work',
    'operate': 'work',
    'cease': 'stop',
    'discontinue': 'stop',
    'halt': 'stop',
    'commence': 'begin',
    'proceed': 'go',
    'continue': 'go',
    'advance': 'go',
    'return': 'give back',
    'yield': 'give',
    'produce': 'make',
    'manufacture': 'make',
    'fabricate': 'make',
    'assemble': 'put together',
    'compile': 'put together',
    'integrate': 'combine',
    'merge': 'combine',
    'consolidate': 'combine',
    'simplify': 'make simple',
    'streamline': 'make simple',
    'enhance': 'improve',
    'augment': 'add',
    'supplement': 'add',
    'append': 'add',
    'attach': 'add',
    'include': 'add',
    'incorporate': 'add',
    'contain': 'have',
    'possess': 'have',
    'retain': 'keep',
    'maintain': 'keep',
    'preserve': 'keep',
    'save': 'keep',
    'store': 'keep',
    'remove': 'take out',
    'eliminate': 'take out',
    'exclude': 'take out',
    'omit': 'take out',
    'delete': 'take out',
    'erase': 'take out',
    'expunge': 'take out',
    'extract': 'take out',
    'withdraw': 'take out',
    'subtract': 'take away',
    'deduct': 'take away',
    'reduce': 'make less',
    'decrease': 'make less',
    'diminish': 'make less',
    'lessen': 'make less',
    'increase': 'make more',
    'expand': 'make more',
    'extend': 'make more',
    'enlarge': 'make more',
    'amplify': 'make more',
    'magnify': 'make more',
    'intensify': 'make more',
    'strengthen': 'make strong',
    'fortify': 'make strong',
    'reinforce': 'make strong',
    'support': 'help',
    'assist': 'help',
    'aid': 'help',
    'enable': 'let',
    'allow': 'let',
    'permit': 'let',
    'authorize': 'let',
    'prevent': 'stop',
    'avoid': 'stay away from',
    'evade': 'stay away from',
    'escape': 'get away',
    'flee': 'run away',
    'depart': 'leave',
    'exit': 'leave',
    'arrive': 'come',
    'reach': 'get to',
    'approach': 'come near',
    'near': 'come near',
    'enter': 'go in',
    'access': 'get to',
    'employ': 'use',
    'exploit': 'use',
    'leverage': 'use',
    'capitalize': 'use',
    'harness': 'use',
    'apply': 'put on',
    'deploy': 'put in place',
    'install': 'put in',
    'upload': 'put up',
    'download': 'get down',
    'transfer': 'move',
    'transmit': 'send',
    'convey': 'send',
    'deliver': 'send',
    'dispatch': 'send',
    'ship': 'send',
    'transport': 'move',
    'relocate': 'move',
    'shift': 'move',
    'adjust': 'change',
    'adapt': 'change',
    'alter': 'change',
    'transform': 'change',
    'convert': 'change',
    'translate': 'change',
    'interpret': 'explain',
    'clarify': 'make clear',
    'elucidate': 'explain',
    'expound': 'explain',
    'describe': 'tell about',
    'depict': 'show',
    'portray': 'show',
    'characterize': 'describe',
    'define': 'explain',
    'specify': 'tell exactly',
    'detail': 'tell more',
    'elaborate': 'tell more',
    'enumerate': 'list',
    'itemize': 'list',
    'catalog': 'list',
    'register': 'list',
    'record': 'write down',
    'document': 'write down',
    'log': 'write down',
    'note': 'write down',
    'jot': 'write down',
    'scribble': 'write',
    'inscribe': 'write',
    'compose': 'write',
    'draft': 'write',
    'author': 'write',
    'develop': 'make',
    'devise': 'plan',
    'conceive': 'think of',
    'envision': 'see in mind',
    'imagine': 'see in mind',
    'visualize': 'see in mind',
    'picture': 'see in mind',
    'perceive': 'see',
    'observe': 'see',
    'notice': 'see',
    'recognize': 'know',
    'distinguish': 'tell apart',
    'differentiate': 'tell apart',
    'discriminate': 'tell apart',
    'discern': 'see',
    'detect': 'find',
    'discover': 'find',
    'uncover': 'find',
    'reveal': 'show',
    'expose': 'show',
    'disclose': 'tell',
    'divulge': 'tell',
    'confess': 'admit',
    'acknowledge': 'admit',
    'concede': 'admit',
    'accept': 'take',
    'receive': 'get',
    'gain': 'get',
    'earn': 'get',
    'achieve': 'get',
    'attain': 'get',
    'accomplish': 'do',
    'fulfill': 'do',
    'complete': 'finish',
    'finish': 'finish',
    'conclude': 'end',
    'close': 'end',
    'finalize': 'finish',
    'wrap up': 'finish',
    'end': 'end',
    'stop': 'stop',
    'suspend': 'stop for a while',
    'pause': 'stop for a moment',
    'interrupt': 'break in',
    'disrupt': 'break',
    'disturb': 'bother',
    'annoy': 'bother',
    'irritate': 'bother',
    'aggravate': 'make worse',
    'exacerbate': 'make worse',
    'worsen': 'make worse',
    'deteriorate': 'get worse',
    'decline': 'go down',
    'degrade': 'get worse',
    'degenerate': 'get worse',
    'decay': 'rot',
    'rot': 'rot',
    'corrupt': 'go bad',
    'spoil': 'go bad',
    'taint': 'make bad',
    'contaminate': 'make dirty',
    'pollute': 'make dirty',
    'infect': 'make sick',
    'poison': 'make sick',
    'harm': 'hurt',
    'damage': 'hurt',
    'injure': 'hurt',
    'wound': 'hurt',
    'hurt': 'hurt',
    'afflict': 'hurt',
    'torment': 'hurt',
    'torture': 'hurt',
    'suffer': 'feel pain',
    'endure': 'go through',
    'bear': 'carry',
    'withstand': 'stand',
    'resist': 'fight',
    'oppose': 'fight',
    'combat': 'fight',
    'battle': 'fight',
    'struggle': 'fight',
    'contend': 'fight',
    'compete': 'try to win',
    'rival': 'try to beat',
    'challenge': 'test',
    'test': 'test',
    'examine': 'look at',
    'inspect': 'look at',
    'scrutinize': 'look at closely',
    'investigate': 'look into',
    'explore': 'look into',
    'probe': 'look into',
    'research': 'study',
    'study': 'study',
    'learn': 'get knowledge',
    'understand': 'get',
    'comprehend': 'get',
    'grasp': 'get',
    'seize': 'take',
    'capture': 'take',
    'catch': 'take',
    'grab': 'take',
    'snatch': 'take',
    'pluck': 'take',
    'pick': 'take',
    'select': 'choose',
    'choose': 'choose',
    'elect': 'choose',
    'opt': 'choose',
    'prefer': 'like more',
    'favor': 'like',
    'fancy': 'like',
    'enjoy': 'like',
    'appreciate': 'like',
    'admire': 'look up to',
    'respect': 'look up to',
    'esteem': 'think highly of',
    'value': 'think highly of',
    'treasure': 'value',
    'cherish': 'value',
    'prize': 'value',
    'grant': 'give',
    'bestow': 'give',
    'confer': 'give',
    'award': 'give',
    'present': 'give',
    'donate': 'give',
    'contribute': 'give',
    'offer': 'give',
    'provide': 'give',
    'supply': 'give',
    'furnish': 'give',
    'equip': 'give tools',
    'arm': 'give weapons',
    'prepare': 'get ready',
    'ready': 'get ready',
    'arrange': 'put in order',
    'organize': 'put in order',
    'order': 'put in order',
    'systematize': 'put in order',
    'methodize': 'put in order',
    'structure': 'put in order',
    'format': 'put in order',
    'layout': 'put in order',
    'design': 'plan',
    'plan': 'plan',
    'scheme': 'plan',
    'plot': 'plan',
    'project': 'plan',
    'program': 'plan',
    'schedule': 'plan time',
    'timetable': 'plan time',
    'agenda': 'plan',
    'itinerary': 'plan',
    'route': 'way',
    'path': 'way',
    'course': 'way',
    'track': 'way',
    'trail': 'way',
    'lane': 'way',
    'passage': 'way',
    'channel': 'way',
    'conduit': 'way',
    'avenue': 'way',
    'street': 'way',
    'road': 'way',
    'highway': 'big road',
    'freeway': 'fast road',
    'expressway': 'fast road',
    'turnpike': 'toll road',
    'thoroughfare': 'main road',
    'boulevard': 'wide street',
    'drive': 'road',
    'terrace': 'flat area',
    'place': 'spot',
    'square': 'open area',
    'plaza': 'open area',
    'court': 'open area',
    'yard': 'open area',
    'garden': 'plant area',
    'park': 'green area',
    'field': 'open land',
    'meadow': 'grass land',
    'pasture': 'grass land',
    'prairie': 'grass land',
    'plain': 'flat land',
    'plateau': 'high flat land',
    'valley': 'low land',
    'canyon': 'deep valley',
    'ravine': 'small valley',
    'gorge': 'narrow valley',
    'cliff': 'steep rock',
    'bluff': 'steep hill',
    'precipice': 'steep drop',
    'escarpment': 'steep slope',
    'slope': 'slant',
    'incline': 'slant',
    'gradient': 'slant',
    'hill': 'small mountain',
    'mountain': 'big hill',
    'peak': 'top',
    'summit': 'top',
    'pinnacle': 'top',
    'apex': 'top',
    'zenith': 'top',
    'acme': 'top',
    'culmination': 'top',
    'climax': 'top',
    'height': 'top',
    'elevation': 'height',
    'altitude': 'height',
    'depth': 'deepness',
    'bottom': 'low part',
    'base': 'bottom',
    'foundation': 'bottom',
    'ground': 'earth',
    'floor': 'ground',
    'pavement': 'hard ground',
    'sidewalk': 'walk way',
    'pathway': 'walk way',
    'walkway': 'walk way',
    'corridor': 'hall',
    'hallway': 'hall',
    'lobby': 'entry area',
    'foyer': 'entry area',
    'vestibule': 'entry area',
    'entrance': 'way in',
    'entry': 'way in',
    'admission': 'way in',
    'ingress': 'way in',
    'egress': 'way out',
    'outlet': 'way out',
    'vent': 'way out',
    'opening': 'hole',
    'aperture': 'hole',
    'orifice': 'hole',
    'gap': 'space',
    'space': 'room',
    'room': 'area',
    'area': 'space',
    'region': 'area',
    'zone': 'area',
    'district': 'area',
    'quarter': 'area',
    'sector': 'area',
    'section': 'part',
    'segment': 'part',
    'portion': 'part',
    'part': 'piece',
    'piece': 'bit',
    'bit': 'small piece',
    'fragment': 'small piece',
    'shard': 'sharp piece',
    'splinter': 'small sharp piece',
    'chip': 'small piece',
    'crumb': 'tiny piece',
    'grain': 'tiny piece',
    'particle': 'tiny piece',
    'atom': 'tiny piece',
    'molecule': 'tiny piece',
    'speck': 'tiny spot',
    'spot': 'small mark',
    'dot': 'small spot',
    'point': 'small spot',
    'mark': 'sign',
    'sign': 'symbol',
    'symbol': 'mark',
    'token': 'sign',
    'emblem': 'symbol',
    'badge': 'sign',
    'label': 'tag',
    'tag': 'label',
    'sticker': 'label',
    'ticket': 'pass',
    'pass': 'allow',
    'license': 'allow',
    'certificate': 'paper',
    'diploma': 'paper',
    'degree': 'level',
    'grade': 'level',
    'rank': 'level',
    'class': 'group',
    'category': 'group',
    'type': 'kind',
    'kind': 'type',
    'sort': 'type',
    'variety': 'type',
    'species': 'type',
    'breed': 'type',
    'strain': 'type',
    'race': 'type',
    'stock': 'type',
    'line': 'row',
    'row': 'line',
    'column': 'up-down line',
    'file': 'line',
    'queue': 'line',
    'series': 'line',
    'sequence': 'order',
    'succession': 'order',
    'chain': 'link',
    'string': 'line',
    'thread': 'thin line',
    'strand': 'thin line',
    'fiber': 'thin thread',
    'filament': 'thin thread',
    'wire': 'thin metal',
    'cable': 'thick wire',
    'cord': 'thick string',
    'rope': 'thick cord'
  };

  /**
   * 构造函数
   */
  constructor() {
    this.config = {
      mode: 'full',
      enabled: false
    };
    this.stats = {
      originalTokens: 0,
      processedTokens: 0,
      savedTokens: 0,
      savingsPercentage: 0
    };
  }

  /**
   * 设置 Caveman 配置
   * @param config 配置对象
   */
  setConfig(config: Partial<CavemanConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取 Caveman 配置
   */
  getConfig(): CavemanConfig {
    return { ...this.config };
  }

  /**
   * 启用 Caveman 模式
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * 禁用 Caveman 模式
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * 切换 Caveman 模式
   */
  toggle(): void {
    this.config.enabled = !this.config.enabled;
  }

  /**
   * 设置 Caveman 模式强度
   * @param mode 模式类型
   */
  setMode(mode: CavemanMode | WenyanMode | ExtendedMode): void {
    this.config.mode = mode;
  }

  /**
   * 获取 Token 统计
   */
  getStats(): TokenStats {
    return { ...this.stats };
  }

  /**
   * 重置 Token 统计
   */
  resetStats(): void {
    this.stats = {
      originalTokens: 0,
      processedTokens: 0,
      savedTokens: 0,
      savingsPercentage: 0
    };
  }

  /**
   * 估算 token 数量（简化版，基于空格和标点）
   * @param text 文本
   * @returns token 数量
   */
  private estimateTokens(text: string): number {
    // 简单的 token 估算：单词数 + 标点符号数
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const punctuation = text.match(/[.,!?;:]/g) || [];
    return words.length + punctuation.length;
  }

  /**
   * 更新统计
   * @param originalText 原始文本
   * @param processedText 处理后文本
   */
  private updateStats(originalText: string, processedText: string): void {
    const originalTokens = this.estimateTokens(originalText);
    const processedTokens = this.estimateTokens(processedText);
    const savedTokens = originalTokens - processedTokens;
    const savingsPercentage = originalTokens > 0 ? (savedTokens / originalTokens) * 100 : 0;

    this.stats.originalTokens += originalTokens;
    this.stats.processedTokens += processedTokens;
    this.stats.savedTokens += savedTokens;
    this.stats.savingsPercentage = this.stats.originalTokens > 0
      ? (this.stats.savedTokens / this.stats.originalTokens) * 100
      : 0;
  }

  /**
   * 处理文本，应用 Caveman 模式
   * @param text 原始文本
   * @returns 处理后的文本
   */
  processText(text: string): string {
    if (!this.config.enabled) {
      return text;
    }

    // 保持代码块不变
    const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
    let processedText = text;

    // 替换代码块为占位符
    const codeBlockPlaceholders = codeBlocks.map((block, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`;
      processedText = processedText.replace(block, placeholder);
      return { placeholder, block };
    });

    // 应用 Caveman 处理
    const originalText = processedText;
    if (this.config.mode.startsWith('wenyan')) {
      processedText = this.processWenyan(processedText, this.config.mode as WenyanMode);
    } else if (this.config.mode === 'concise') {
      processedText = this.processConcise(processedText);
    } else if (this.config.mode === 'technical') {
      processedText = this.processTechnical(processedText);
    } else if (this.config.mode === 'code') {
      processedText = this.processCode(processedText);
    } else {
      processedText = this.processCaveman(processedText, this.config.mode as CavemanMode);
    }

    // 更新统计
    this.updateStats(originalText, processedText);

    // 恢复代码块
    codeBlockPlaceholders.forEach(({ placeholder, block }) => {
      processedText = processedText.replace(placeholder, block);
    });

    return processedText;
  }

  /**
   * 处理 Caveman 模式
   * @param text 原始文本
   * @param mode 模式类型
   * @returns 处理后的文本
   */
  private processCaveman(text: string, mode: CavemanMode): string {
    let processedText = text;

    // 合并填充词和冗余表达的替换
    processedText = processedText.replace(CavemanService.FILLER_WORDS_REGEX, '');

    // 合并缩略词替换
    processedText = processedText.replace(
      CavemanService.CONTRACTIONS_REGEX,
      (match) => CavemanService.CONTRACTIONS_MAP[match.toLowerCase()] || match
    );

    // 移除多余的空格
    processedText = processedText.replace(/\s+/g, ' ').trim();

    // 根据模式强度进一步处理
    switch (mode) {
      case 'lite':
        // 保持基本语法结构，移除填充词
        break;
      case 'full':
        // 移除冠词，使用更简短的表达
        processedText = processedText
          .replace(/\b(a|an|the)\b/g, '')
          .replace(/\s+/g, ' ').trim();
        break;
      case 'ultra':
        // 最大程度压缩，使用电报式表达
        processedText = processedText
          .replace(/\b(a|an|the)\b/g, '')
          .replace(/\b(and|or|but)\b/g, '')
          .replace(/\b(is|are|was|were|be|been|being)\b/g, '')
          .replace(/\b(have|has|had|having)\b/g, '')
          .replace(/\b(do|does|did|doing)\b/g, '')
          .replace(/\b(will|would|should|could|might|must|can|may|shall)\b/g, '')
          .replace(/\b(I|you|he|she|it|we|they)\b/g, '')
          .replace(/\b(my|your|his|her|its|our|their)\b/g, '')
          .replace(/\b(me|you|him|her|it|us|them)\b/g, '')
          .replace(/\s+/g, ' ').trim();
        break;
    }

    return processedText;
  }

  /**
   * 处理简洁模式
   * @param text 原始文本
   * @returns 处理后的文本
   */
  private processConcise(text: string): string {
    let processedText = text;

    // 应用简洁模式映射
    Object.entries(CavemanService.CONCISE_MAP).forEach(([word, replacement]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      processedText = processedText.replace(regex, replacement);
    });

    // 移除填充词
    processedText = processedText.replace(CavemanService.FILLER_WORDS_REGEX, '');

    // 使用缩略词
    processedText = processedText.replace(
      CavemanService.CONTRACTIONS_REGEX,
      (match) => CavemanService.CONTRACTIONS_MAP[match.toLowerCase()] || match
    );

    // 移除多余的空格
    processedText = processedText.replace(/\s+/g, ' ').trim();

    return processedText;
  }

  /**
   * 处理技术术语模式
   * @param text 原始文本
   * @returns 处理后的文本
   */
  private processTechnical(text: string): string {
    let processedText = text;

    // 应用技术术语映射
    Object.entries(CavemanService.TECHNICAL_MAP).forEach(([word, abbreviation]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      processedText = processedText.replace(regex, abbreviation);
    });

    // 移除填充词
    processedText = processedText.replace(CavemanService.FILLER_WORDS_REGEX, '');

    // 使用缩略词
    processedText = processedText.replace(
      CavemanService.CONTRACTIONS_REGEX,
      (match) => CavemanService.CONTRACTIONS_MAP[match.toLowerCase()] || match
    );

    // 移除多余的空格
    processedText = processedText.replace(/\s+/g, ' ').trim();

    return processedText;
  }

  private processCode(text: string): string {
    let processedText = text;

    processedText = processedText
      .replace(/\bfunction\b/gi, 'fn')
      .replace(/\bparameter\b/gi, 'param')
      .replace(/\bparameters\b/gi, 'params')
      .replace(/\bargument\b/gi, 'arg')
      .replace(/\barguments\b/gi, 'args')
      .replace(/\breturn value\b/gi, 'return')
      .replace(/\breturns\b/gi, 'return')
      .replace(/\bboolean\b/gi, 'bool')
      .replace(/\bnumber\b/gi, 'num')
      .replace(/\bstring\b/gi, 'str');

    processedText = processedText.replace(CavemanService.FILLER_WORDS_REGEX, '');
    processedText = processedText.replace(/\s+/g, ' ').trim();

    return processedText;
  }

  /**
   * 处理文言文模式
   * @param text 原始文本
   * @param mode 模式类型
   * @returns 处理后的文本
   */
  private processWenyan(text: string, mode: WenyanMode): string {
    let processedText = text;

    // 应用文言文转换
    Object.entries(CavemanService.WENYAN_MAP).forEach(([english, wenyan]) => {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      processedText = processedText.replace(regex, wenyan);
    });

    // 移除多余的空格
    processedText = processedText.replace(/\s+/g, ' ').trim();

    // 根据模式强度进一步处理
    switch (mode) {
      case 'wenyan-lite':
        // 保持基本语法结构，使用半文言文
        break;
      case 'wenyan':
        // 完全文言文
        processedText = processedText
          .replace(/\b(is|are|was|were)\b/g, '是')
          .replace(/\b(have|has|had)\b/g, '有')
          .replace(/\b(do|does|did)\b/g, '做')
          .replace(/\s+/g, ' ').trim();
        break;
      case 'wenyan-ultra':
        // 极端文言文，最大程度压缩
        processedText = processedText
          .replace(/\b(is|are|was|were)\b/g, '是')
          .replace(/\b(have|has|had)\b/g, '有')
          .replace(/\b(do|does|did)\b/g, '做')
          .replace(/\b(I|you|he|she|it|we|they)\b/g, '')
          .replace(/\b(my|your|his|her|its|our|their)\b/g, '')
          .replace(/\s+/g, ' ').trim();
        break;
    }

    return processedText;
  }

  /**
   * 生成简洁的提交信息
   * @param message 原始提交信息
   * @returns 简洁的提交信息
   */
  generateCommitMessage(message: string): string {
    // 移除填充词和冗余表达
    let processedMessage = this.processCaveman(message, 'full');

    // 确保提交信息不超过 50 个字符
    if (processedMessage.length > 50) {
      processedMessage = processedMessage.substring(0, 47) + '...';
    }

    // 添加 Conventional Commits 格式
    const commitTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'];
    let commitType = 'feat';

    // 根据提交信息内容选择合适的类型
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) {
      commitType = 'fix';
    } else if (lowerMessage.includes('doc') || lowerMessage.includes('readme')) {
      commitType = 'docs';
    } else if (lowerMessage.includes('style')) {
      commitType = 'style';
    } else if (lowerMessage.includes('refactor')) {
      commitType = 'refactor';
    } else if (lowerMessage.includes('test')) {
      commitType = 'test';
    } else if (lowerMessage.includes('chore')) {
      commitType = 'chore';
    }

    return `${commitType}: ${processedMessage}`;
  }

  /**
   * 生成单行代码审查
   * @param code 代码
   * @param line 行号
   * @param issue 问题描述
   * @returns 单行代码审查
   */
  generateCodeReview(code: string, line: number, issue: string): string {
    // 移除填充词和冗余表达
    let processedIssue = this.processCaveman(issue, 'full');

    // 确定问题类型标记
    let issueType = '🔴'; // 默认错误
    const lowerIssue = issue.toLowerCase();
    if (lowerIssue.includes('warning') || lowerIssue.includes('caution')) {
      issueType = '🟡'; // 警告
    } else if (lowerIssue.includes('suggestion') || lowerIssue.includes('improvement')) {
      issueType = '🟢'; // 建议
    }

    // 生成单行代码审查
    return `L${line}: ${issueType} ${processedIssue}`;
  }

  /**
   * 压缩文件内容以减少 token 使用
   * @param content 文件内容
   * @returns 压缩后的内容
   */
  compressContent(content: string): string {
    // 保持代码块不变
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    let processedContent = content;

    // 替换代码块为占位符
    const codeBlockPlaceholders = codeBlocks.map((block, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`;
      processedContent = processedContent.replace(block, placeholder);
      return { placeholder, block };
    });

    // 保持 URL 不变
    const urls = content.match(/https?:\/\/[^\s]+/g) || [];
    const urlPlaceholders = urls.map((url, index) => {
      const placeholder = `__URL_${index}__`;
      processedContent = processedContent.replace(url, placeholder);
      return { placeholder, url };
    });

    // 保持文件路径不变
    const filePaths = content.match(/\b([a-zA-Z]:\\|\/)[^\s]+/g) || [];
    const filePathPlaceholders = filePaths.map((filePath, index) => {
      const placeholder = `__FILE_PATH_${index}__`;
      processedContent = processedContent.replace(filePath, placeholder);
      return { placeholder, filePath };
    });

    // 保持命令不变
    const commands = content.match(/`[^`]+`/g) || [];
    const commandPlaceholders = commands.map((command, index) => {
      const placeholder = `__COMMAND_${index}__`;
      processedContent = processedContent.replace(command, placeholder);
      return { placeholder, command };
    });

    // 保持标题不变
    const headings = content.match(/^#+\s+.+$/gm) || [];
    const headingPlaceholders = headings.map((heading, index) => {
      const placeholder = `__HEADING_${index}__`;
      processedContent = processedContent.replace(heading, placeholder);
      return { placeholder, heading };
    });

    // 保持日期不变
    const dates = content.match(/\d{4}-\d{2}-\d{2}/g) || [];
    const datePlaceholders = dates.map((date, index) => {
      const placeholder = `__DATE_${index}__`;
      processedContent = processedContent.replace(date, placeholder);
      return { placeholder, date };
    });

    // 保持版本号不变
    const versions = content.match(/v\d+\.\d+\.\d+/g) || [];
    const versionPlaceholders = versions.map((version, index) => {
      const placeholder = `__VERSION_${index}__`;
      processedContent = processedContent.replace(version, placeholder);
      return { placeholder, version };
    });

    // 应用 Caveman 处理
    processedContent = this.processCaveman(processedContent, 'ultra');

    // 恢复代码块
    codeBlockPlaceholders.forEach(({ placeholder, block }) => {
      processedContent = processedContent.replace(placeholder, block);
    });

    // 恢复 URL
    urlPlaceholders.forEach(({ placeholder, url }) => {
      processedContent = processedContent.replace(placeholder, url);
    });

    // 恢复文件路径
    filePathPlaceholders.forEach(({ placeholder, filePath }) => {
      processedContent = processedContent.replace(placeholder, filePath);
    });

    // 恢复命令
    commandPlaceholders.forEach(({ placeholder, command }) => {
      processedContent = processedContent.replace(placeholder, command);
    });

    // 恢复标题
    headingPlaceholders.forEach(({ placeholder, heading }) => {
      processedContent = processedContent.replace(placeholder, heading);
    });

    // 恢复日期
    datePlaceholders.forEach(({ placeholder, date }) => {
      processedContent = processedContent.replace(placeholder, date);
    });

    // 恢复版本号
    versionPlaceholders.forEach(({ placeholder, version }) => {
      processedContent = processedContent.replace(placeholder, version);
    });

    return processedContent;
  }

  /**
   * 批量处理多个文本
   * @param texts 文本数组
   * @returns 处理后的文本数组
   */
  processBatch(texts: string[]): string[] {
    return texts.map(text => this.processText(text));
  }

  /**
   * 添加自定义规则
   * @param rule 自定义规则
   */
  addCustomRule(rule: CustomRule): void {
    if (!this.config.customRules) {
      this.config.customRules = [];
    }
    this.config.customRules.push(rule);
  }

  /**
   * 移除自定义规则
   * @param index 规则索引
   */
  removeCustomRule(index: number): void {
    if (this.config.customRules && index >= 0 && index < this.config.customRules.length) {
      this.config.customRules.splice(index, 1);
    }
  }

  /**
   * 应用自定义规则
   * @param text 文本
   * @returns 处理后的文本
   */
  private applyCustomRules(text: string): string {
    if (!this.config.customRules || this.config.customRules.length === 0) {
      return text;
    }

    let processedText = text;
    this.config.customRules.forEach(rule => {
      processedText = processedText.replace(rule.pattern, rule.replacement);
    });

    return processedText;
  }
}

// 导出单例
export const cavemanService = new CavemanService();
