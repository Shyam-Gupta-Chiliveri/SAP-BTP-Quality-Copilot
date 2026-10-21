// Rule-based router: reads the question, extracts SAP entities and decides which
// specialist tools run. Deterministic so the plan is explainable in the trace.

const SUPPLIER_ALIASES = [
  ['V100', /\bv100\b|nordstahl|steel mill/i],
  ['V200', /\bv200\b|h(ä|ae|a)rterei|weser|heat[- ]?treat(er|ment)? supplier/i],
  ['V300', /\bv300\b|aluguss|die ?cast(er|ing)? supplier|foundry/i],
  ['V400', /\bv400\b|lippe|pr(ä|ae|a)zision/i],
]

const MATERIAL_ALIASES = [
  ['AX-4CR13-080', /ax-4cr13-080|(?<![\d.,])8(?:[.,]0{1,2})? ?mm/i],
  ['AX-4CR13-078', /ax-4cr13-078|(?<![\d.,])7[.,]80? ?mm|(?<![\d.,])7[.,]8\b/i],
  ['HSG-AC44300', /hsg-ac44300|housing|44300|hpdc|die[- ]?cast/i],
  ['BAR-4CR13-10', /bar-4cr13-10|round bar|bar stock|raw material/i],
]

const CHARACTERISTICS = [
  ['HV10', /hv ?10|hardness|vickers|brittle|temper/i],
  ['BEND_F', /bend|bending|break(ing)? force|toughness/i],
  ['DIAM', /diameter|bearing seat|\bdiam\b/i],
  ['POROSITY', /poros|x-?ray|pores?\b/i],
  ['SI_PCT', /silicon|\bsi\b/i],
  ['CR_PCT', /chrom|\bcr\b/i],
  ['C_PCT', /carbon/i],
  ['WALL_MM', /wall thickness|wall/i],
]

const INJECTION = /ignore (all|any|the)? ?(previous|prior|above) (instructions|rules)|system prompt|you are now|disregard .*instructions|reveal .*(key|secret|prompt)|api[_ ]?key/i

function route(question) {
  const q = String(question || '').slice(0, 1000)
  const suppliers = SUPPLIER_ALIASES.filter(([, re]) => re.test(q)).map(([id]) => id)
  const materials = MATERIAL_ALIASES.filter(([, re]) => re.test(q)).map(([id]) => id)
  const characteristics = CHARACTERISTICS.filter(([, re]) => re.test(q)).map(([id]) => id)
  const notificationIds = [...new Set(q.match(/\b2000\d{5}\b/g) || [])]
  const lotIds = [...new Set(q.match(/\b0?10{4,}\d{4,}\b/g) || [])].map((id) => id.padStart(12, '0'))
  const batches = [...new Set((q.match(/\bB\d{4}-\d{3}\b/gi) || []).map((b) => b.toUpperCase()))]

  const intent = {
    release: /releas|sign[- ]?off|ship|use (it|this|the batch|the lot|lot|batch)|ok to use|go ahead|approve|block/i.test(q),
    trend: /trend|drift|month|over time|since|history|getting worse|change/i.test(q),
    rootCause: /why|root cause|cause|reason|8d|what happened|explain/i.test(q),
    scorecard: /supplier|vendor|scorecard|rating|ppm|reject rate|worst|best|rank/i.test(q),
    notifications: /notification|complaint|q1|q2|q3|open (issues|actions)|8d/i.test(q) || notificationIds.length > 0,
    capability: /cpk|capab|process capability|stable/i.test(q),
    recent: /now|current|today|latest|this month|recent|september|last (30|thirty) days/i.test(q),
    solved: /solved|fixed|resolved|under control|back (in|to) (spec|normal)|effective|recurr/i.test(q),
  }

  // Implied entities: hardness questions without a material mean the 4Cr13 axles.
  if (!materials.length && characteristics.some((c) => ['HV10', 'BEND_F', 'DIAM'].includes(c))) {
    if (suppliers.includes('V400')) materials.push('AX-4CR13-078')
    else materials.push('AX-4CR13-080')
  }
  if (!materials.length && characteristics.includes('POROSITY')) materials.push('HSG-AC44300')
  if (!materials.length && suppliers.length === 1) {
    materials.push({ V100: 'BAR-4CR13-10', V200: 'AX-4CR13-080', V300: 'HSG-AC44300', V400: 'AX-4CR13-078' }[suppliers[0]])
  }

  const plan = []
  if (lotIds.length || batches.length) plan.push('lookup')
  const lotScoped = (lotIds.length || batches.length) && !materials.length
  if (!lotScoped && (materials.length || characteristics.length || intent.capability || intent.release)) plan.push('inspection')
  if ((intent.trend || intent.rootCause || intent.solved) && (materials.length || characteristics.length)) plan.push('trend')
  if (suppliers.length || intent.scorecard || (intent.release && !lotScoped)) plan.push('scorecard')
  if (intent.notifications || intent.rootCause || intent.release || intent.solved || suppliers.length || materials.length) plan.push('notifications')
  plan.push('knowledge', 'critic')
  if (plan.length === 2) plan.unshift('scorecard', 'notifications')

  return {
    question: q,
    entities: { suppliers, materials, characteristics, notificationIds, lotIds, batches },
    intent,
    plan,
    injection: INJECTION.test(q),
  }
}

module.exports = { route, INJECTION }
