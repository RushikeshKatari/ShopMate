/**
 * ShopMate Local TF-IDF Vector Store
 * 100% on-device similarity search — zero external embedding API.
 * Used by ShopRAGEngine to find semantically similar past transactions.
 */

export interface VectorDocument {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  vector?: Map<string, number>;
}

export interface SimilarityResult {
  document: VectorDocument;
  score: number;
}

export class VectorStore {
  private documents: VectorDocument[] = [];
  private idfCache: Map<string, number> = new Map();
  private dirty = true;

  /** Add or replace a document in the store */
  upsert(doc: VectorDocument): void {
    const existing = this.documents.findIndex(d => d.id === doc.id);
    const withVector = { ...doc, vector: this.termFrequency(doc.text) };
    if (existing >= 0) {
      this.documents[existing] = withVector;
    } else {
      this.documents.push(withVector);
    }
    this.dirty = true;
  }

  /** Bulk load documents */
  load(docs: VectorDocument[]): void {
    this.documents = docs.map(d => ({ ...d, vector: this.termFrequency(d.text) }));
    this.dirty = true;
  }

  /** Find top-k most similar documents to the query text */
  search(query: string, topK = 5, filter?: (doc: VectorDocument) => boolean): SimilarityResult[] {
    if (this.dirty) this.buildIDF();
    const queryVec = this.tfidfVector(query);
    const results: SimilarityResult[] = [];

    for (const doc of this.documents) {
      if (filter && !filter(doc)) continue;
      const docVec = doc.vector ? this.applyIDF(doc.vector) : new Map<string, number>();
      const score = this.cosine(queryVec, docVec);
      if (score > 0) results.push({ document: doc, score });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  get size(): number {
    return this.documents.length;
  }

  clear(): void {
    this.documents = [];
    this.idfCache.clear();
    this.dirty = true;
  }

  // ---------------------------------------------------------------------------
  // TF-IDF internals
  // ---------------------------------------------------------------------------
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      // Keep Indic scripts (including Telugu) as searchable tokens. `\p{L}`
      // and `\p{N}` are supported by the Android/modern-browser JS engines
      // targeted by this project.
      .replace(/[^\p{L}\p{N}₹\s]/gu, " ")
      .split(/\s+/)
      .filter(t => t.length > 1 && !STOP_WORDS.has(t));
  }

  private termFrequency(text: string): Map<string, number> {
    const tokens = this.tokenize(text);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    // Normalize by doc length
    if (tokens.length === 0) return tf;
    for (const [t, count] of tf) tf.set(t, count / tokens.length);
    return tf;
  }

  private buildIDF(): void {
    const N = this.documents.length;
    if (N === 0) return;
    const df = new Map<string, number>();
    for (const doc of this.documents) {
      for (const term of (doc.vector ?? new Map()).keys()) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }
    this.idfCache.clear();
    for (const [term, count] of df) {
      this.idfCache.set(term, Math.log((N + 1) / (count + 1)) + 1);
    }
    this.dirty = false;
  }

  private applyIDF(tf: Map<string, number>): Map<string, number> {
    const tfidf = new Map<string, number>();
    for (const [term, tfVal] of tf) {
      tfidf.set(term, tfVal * (this.idfCache.get(term) ?? 1));
    }
    return tfidf;
  }

  private tfidfVector(text: string): Map<string, number> {
    return this.applyIDF(this.termFrequency(text));
  }

  private cosine(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (const [term, aVal] of a) {
      dot += aVal * (b.get(term) ?? 0);
      normA += aVal * aVal;
    }
    for (const bVal of b.values()) normB += bVal * bVal;
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

const STOP_WORDS = new Set([
  "a","an","the","and","or","of","to","in","for","on","at","by","is","it",
  "was","are","with","as","be","this","that","from","have","has","had",
  "not","but","they","their","my","we","our","you","your","he","she","his",
  "her","its","been","i","s","rs","inr"
]);
