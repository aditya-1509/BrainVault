import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

const EMBEDDING_DIMENSION = 768;


export const getIndex = () => {
  return pinecone.index(process.env.PINECONE_INDEX_NAME || 'rashtram-bills');
};


export const checkBillExists = async (billId) => {
  try {
    console.log(`Checking if bill ${billId} already exists in Pinecone...`);
    const index = getIndex();
    
    const queryResults = await index.query({
      vector: new Array(EMBEDDING_DIMENSION).fill(0),
      topK: 1,
      filter: { billId: { "$eq": billId.toString() } },
      includeMetadata: true,
    });
    
    const exists = queryResults.matches && queryResults.matches.length > 0;
    console.log(`Bill ${billId} exists in database: ${exists}`);
    
    if (exists) {
      const allChunksQuery = await index.query({
        vector: new Array(EMBEDDING_DIMENSION).fill(0),
        topK: 10000,
        filter: { billId: { "$eq": billId.toString() } },
        includeMetadata: true,
      });
      
      const metadata = queryResults.matches[0].metadata;
      return {
        exists: true,
        chunksCount: allChunksQuery.matches.length,
        lastProcessed: metadata.timestamp,
        billTitle: metadata.billTitle || metadata.title
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error(error);
    return { exists: false };
  }
};

export const generateHuggingFaceEmbedding = async (text) => {
  try {
    console.log('Generating Hugging Face embedding...');
    const result = await hf.featureExtraction({
      model: 'sentence-transformers/all-mpnet-base-v2',
      inputs: text,
    });
    
    return Array.isArray(result) ? result : Array.from(result);
  } catch (error) {
    console.error('Hugging Face embedding failed:', error);
    throw error;
  }
};

export const generateEmbedding = async (text) => {
  try {
    return await generateHuggingFaceEmbedding(text);
  } catch (hfError) {
    console.log('Hugging Face failed, trying Gemini as fallback...');
    try {
      const model = genAI.getGenerativeModel({ model: "embedding-001" });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (geminiError) {
      console.error('Both Hugging Face and Gemini embedding services failed');
      throw new Error(`Embedding generation failed - HF: ${hfError.message}, Gemini: ${geminiError.message}`);
    }
  }
};

export const generateResponse = async (prompt, context = '') => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const fullPrompt = `
Context from bill documents:
${context}

User question: ${prompt}

Please provide a comprehensive answer based on the context provided above. If the context doesn't contain enough information to answer the question, please mention that and provide what information you can based on the available context.
`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
};

export const generateBillSummary = async (billContent) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
Please provide a comprehensive summary of this parliamentary bill. Include:
1. Main purpose and objectives
2. Key provisions
3. Potential impact
4. Important dates or timelines mentioned
5. Any notable changes or amendments

Bill content:
${billContent}

Provide a well-structured summary that's informative yet accessible.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating bill summary:', error);
    throw error;
  }
};

export const searchSimilarContent = async (query, billId, topK = 5) => {
  try {
    const index = getIndex();
    const queryEmbedding = await generateEmbedding(query);
    
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK,
      filter: { billId: { "$eq": billId } },
      includeMetadata: true,
    });

    const matches = searchResults.matches || [];
    const enhancedResults = matches.map(match => ({
      ...match,
      relevanceScore: match.score,
      content: match.metadata?.content || '',
      chunkInfo: {
        index: match.metadata?.chunkIndex || 0,
        total: match.metadata?.totalChunks || 1,
        source: match.metadata?.source || 'pdf'
      }
    }));

    return enhancedResults;
  } catch (error) {
    console.error('Error searching similar content:', error);
    throw error;
  }
};

export const storeBillContentInChunks = async (chunks) => {
  try {
    console.log(`Storing ${chunks.length} pre-processed chunks in Pinecone...`);
    
    const index = getIndex();
    const vectors = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Generating embedding for chunk ${i + 1}/${chunks.length} (${chunk.content.length} chars)...`);
      
      const embedding = await generateEmbedding(chunk.content);
      vectors.push({
        id: chunk.id,
        values: embedding,
        metadata: {
          billId: chunk.billId.toString(),
          billTitle: chunk.title,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks,
          timestamp: new Date().toISOString(),
          ...chunk.metadata,
        },
      });
    }

    console.log(`Upserting ${vectors.length} vectors to Pinecone...`);
    await index.upsert(vectors);
    
    console.log(`Successfully stored ${vectors.length} chunks in Pinecone with advanced chunking!`);
    return { chunksStored: vectors.length, success: true };
    
  } catch (error) {
    console.error('Error storing chunked bill content in Pinecone:', error);
    throw error;
  }
};

export const storeBillContent = async (billId, title, content, metadata = {}) => {
  try {
    console.log(`Storing content for bill ${billId} in Pinecone...`);
    
    const index = getIndex();
    
    const chunks = splitIntoChunks(content, 1000);
    console.log(`Content split into ${chunks.length} chunks`);
    
    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Generating embedding for chunk ${i + 1}/${chunks.length}...`);
      const embedding = await generateEmbedding(chunks[i]);
      vectors.push({
        id: `bill-${billId}-chunk-${i}`,
        values: embedding,
        metadata: {
          billId: billId.toString(),
          billTitle: title,
          content: chunks[i],
          chunkIndex: i,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      });
    }

    console.log(`Upserting ${vectors.length} vectors to Pinecone...`);
    await index.upsert(vectors);
    
    console.log(`Successfully stored ${vectors.length} chunks for bill ${billId} in Pinecone!`);
    return { chunksStored: vectors.length, success: true };
    
  } catch (error) {
    console.error('Error storing bill content in Pinecone:', error);
    throw error;
  }
};

const splitIntoChunks = (text, chunkSize = 1000) => {
  const chunks = [];
  const words = text.split(' ');
  
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }
  
  return chunks;
};
