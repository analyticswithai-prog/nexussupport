const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INDEX_NAME = 'nexussupport-kb';
const EMBED_MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;

// Initialise Pinecone index (run once on startup)
async function initIndex() {
  try {
    const existing = await pinecone.listIndexes();
    const names = existing.indexes?.map(i => i.name) || [];
    if (!names.includes(INDEX_NAME)) {
      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: DIMENSIONS,
        metric: 'cosine',
        spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
      });
      console.log(`✅ Pinecone index '${INDEX_NAME}' created`);
    } else {
      console.log(`✅ Pinecone index '${INDEX_NAME}' ready`);
    }
  } catch (err) {
    console.error('Pinecone init error:', err.message);
  }
}

// Embed a piece of text using OpenAI
async function embedText(text) {
  const resp = await openai.embeddings.create({ model: EMBED_MODEL, input: text.slice(0, 8000) });
  return resp.data[0].embedding;
}

// Upsert a document chunk into Pinecone for a specific tenant
async function upsertChunk({ tenantId, docId, chunkId, text, metadata = {} }) {
  const index = pinecone.index(INDEX_NAME);
  const embedding = await embedText(text);
  await index.upsert([{
    id: `${tenantId}__${docId}__${chunkId}`,
    values: embedding,
    metadata: { tenantId, docId, text, ...metadata },
  }]);
}

// Index a full document by splitting into chunks
async function indexDocument({ tenantId, docId, content, metadata = {} }) {
  const CHUNK_SIZE = 500;
  const OVERLAP = 50;
  const words = content.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += CHUNK_SIZE - OVERLAP) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(' '));
  }

  console.log(`Indexing ${chunks.length} chunks for doc ${docId} (tenant ${tenantId})`);
  await Promise.all(chunks.map((chunk, idx) =>
    upsertChunk({ tenantId, docId, chunkId: idx, text: chunk, metadata })
  ));
  return { chunksIndexed: chunks.length };
}

// Search the knowledge base for a tenant
async function searchKB({ tenantId, query, topK = 5 }) {
  const index = pinecone.index(INDEX_NAME);
  const queryEmbedding = await embedText(query);
  const results = await index.query({
    vector: queryEmbedding,
    topK,
    filter: { tenantId: { $eq: tenantId } },
    includeMetadata: true,
  });
  return results.matches.map(m => ({
    score: m.score,
    text: m.metadata.text,
    docId: m.metadata.docId,
  }));
}

// Delete all chunks for a document
async function deleteDocument({ tenantId, docId }) {
  const index = pinecone.index(INDEX_NAME);
  await index.deleteMany({ filter: { tenantId: { $eq: tenantId }, docId: { $eq: docId } } });
}

module.exports = { initIndex, indexDocument, searchKB, deleteDocument, embedText };
