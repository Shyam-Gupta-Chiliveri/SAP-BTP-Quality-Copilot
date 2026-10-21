// BM25 retriever over the plant knowledge base (knowledge/*.md) and the long texts
// of quality notifications. Small corpus, so an in-memory index is enough; on BTP the
// next step is the SAP HANA Cloud vector engine.

const fs = require('fs')
const path = require('path')
const { INJECTION } = require('./router')

const STOP = new Set(('a an and are as at be by for from has have in is it of on or that the this to was were will with ' +
  'what why how which who when where do does did can could should we our i you me my per not no than then there these those').split(' '))

function tokens(text) {
  return String(text).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9.]+/).map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 4 ? t.replace(/(ing|ed|es|s)$/, '') : t))
}

function parseDoc(file) {
  const raw = fs.readFileSync(file, 'utf8')
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  const meta = {}
  if (m) for (const line of m[1].split('\n')) { const [k, ...v] = line.split(':'); meta[k.trim()] = v.join(':').trim() }
  const body = m ? m[2] : raw
  return { id: meta.id || path.basename(file, '.md'), title: meta.title || path.basename(file), category: meta.category || 'Document', body }
}

class Retriever {
  constructor({ k1 = 1.4, b = 0.75 } = {}) { this.k1 = k1; this.b = b; this.chunks = []; this.dropped = [] }

  add(chunk) {
    if (INJECTION.test(chunk.text)) { this.dropped.push(chunk.ref); return }
    this.chunks.push({ ...chunk, toks: tokens(`${chunk.title} ${chunk.text}`) })
  }

  loadKnowledge(dir) {
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
      const doc = parseDoc(path.join(dir, f))
      doc.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).forEach((p, i) =>
        this.add({ ref: `DOC ${doc.id}#${i + 1}`, title: doc.title, kind: doc.category, text: p }))
    }
    return this
  }

  loadNotifications(rows) {
    for (const n of rows) {
      this.add({ ref: `QM ${n.ID}`, title: `${n.type} ${n.ID} - ${n.shortText}`, kind: 'Quality notification',
        text: `${n.defectText}. Root cause: ${n.rootCause} ${n.longText}`, meta: { supplier: n.supplier_ID, material: n.material_ID } })
    }
    return this
  }

  build() {
    const N = this.chunks.length
    this.df = new Map()
    for (const c of this.chunks) for (const t of new Set(c.toks)) this.df.set(t, (this.df.get(t) || 0) + 1)
    this.avg = this.chunks.reduce((a, c) => a + c.toks.length, 0) / Math.max(N, 1)
    this.idf = (t) => { const n = this.df.get(t) || 0; return Math.log(1 + (N - n + 0.5) / (n + 0.5)) }
    return this
  }

  search(query, { k = 5, boost = [] } = {}) {
    const q = tokens(`${query} ${boost.join(' ')}`)
    const scored = this.chunks.map((c) => {
      const tf = new Map()
      for (const t of c.toks) tf.set(t, (tf.get(t) || 0) + 1)
      let s = 0
      for (const t of new Set(q)) {
        const f = tf.get(t)
        if (!f) continue
        s += this.idf(t) * ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * c.toks.length) / this.avg)))
      }
      return { c, s }
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s)
    const seen = new Set(), out = []
    for (const { c, s } of scored) {
      if (seen.has(c.ref)) continue
      seen.add(c.ref)
      out.push({ ref: c.ref, title: c.title, kind: c.kind, text: c.text, score: Number(s.toFixed(3)) })
      if (out.length === k) break
    }
    return out
  }
}

module.exports = { Retriever, tokens }
