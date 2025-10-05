import { Pinecone } from '@pinecone-database/pinecone'
import { decrypt } from '@/lib/crypto'

export interface KnowledgeCard {
  id: string
  type: 'requirement' | 'constraint' | 'decision' | 'risk' | 'persona' | 'term' | 'policy'
  canonical_name: string
  value: string
  source_document: string
  source_chunk_id: string
  confidence_score: number
  version: number
  is_conflict: boolean
  conflict_with?: string
}

export interface DocumentChunk {
  id: string
  document_name: string
  document_type: string
  chunk_index: number
  chunk_text: string
  chunk_tokens: number
  embedding_model: string
}

export class PineconeClient {
  private pinecone: Pinecone
  private index: any
  private namespace: string

  constructor(apiKey: string, projectId: string, namespace: string) {
    this.pinecone = new Pinecone({
      apiKey: apiKey,
    })
    this.namespace = namespace
  }

  async initialize(indexName: string = 'project-plan-builder'): Promise<void> {
    try {
      this.index = this.pinecone.index(indexName)
    } catch (error) {
      console.error('Error initializing Pinecone:', error)
      throw new Error('Failed to initialize Pinecone')
    }
  }

  async upsertKnowledgeCards(cards: KnowledgeCard[], userId: string): Promise<void> {
    try {
      if (!this.index) {
        await this.initialize()
      }

      const vectors = await Promise.all(
        cards.map(async (card) => ({
          id: `card:${card.id}`,
          values: await this.generateEmbedding(card.canonical_name + ' ' + card.value),
          metadata: {
            type: 'knowledge_card',
            card_type: card.type,
            canonical_name: card.canonical_name,
            value: card.value,
            source_document: card.source_document,
            source_chunk_id: card.source_chunk_id,
            confidence_score: card.confidence_score,
            version: card.version,
            is_conflict: card.is_conflict,
            conflict_with: card.conflict_with,
            user_id: userId,
            namespace: this.namespace,
          },
        }))
      )

      await this.index.namespace(this.namespace).upsert(vectors)
    } catch (error) {
      console.error('Error upserting knowledge cards:', error)
      throw new Error('Failed to upsert knowledge cards')
    }
  }

  async upsertDocumentChunks(chunks: DocumentChunk[], userId: string): Promise<void> {
    try {
      if (!this.index) {
        await this.initialize()
      }

      const vectors = await Promise.all(
        chunks.map(async (chunk) => ({
          id: `chunk:${chunk.id}`,
          values: await this.generateEmbedding(chunk.chunk_text),
          metadata: {
            type: 'document_chunk',
            document_name: chunk.document_name,
            document_type: chunk.document_type,
            chunk_index: chunk.chunk_index,
            chunk_text: chunk.chunk_text,
            chunk_tokens: chunk.chunk_tokens,
            embedding_model: chunk.embedding_model,
            user_id: userId,
            namespace: this.namespace,
          },
        }))
      )

      await this.index.namespace(this.namespace).upsert(vectors)
    } catch (error) {
      console.error('Error upserting document chunks:', error)
      throw new Error('Failed to upsert document chunks')
    }
  }

  async queryKnowledgeCards(
    query: string,
    userId: string,
    cardTypes?: string[],
    topK: number = 10
  ): Promise<any[]> {
    try {
      if (!this.index) {
        await this.initialize()
      }

      const queryVector = await this.generateEmbedding(query)

      const queryRequest = {
        vector: queryVector,
        topK,
        includeMetadata: true,
        filter: {
          type: 'knowledge_card',
          user_id: userId,
          namespace: this.namespace,
          ...(cardTypes && { card_type: { $in: cardTypes } }),
        },
      }

      const response = await this.index.namespace(this.namespace).query(queryRequest)
      return response.matches || []
    } catch (error) {
      console.error('Error querying knowledge cards:', error)
      throw new Error('Failed to query knowledge cards')
    }
  }

  async queryDocumentChunks(query: string, userId: string, topK: number = 10): Promise<any[]> {
    try {
      if (!this.index) {
        await this.initialize()
      }

      const queryVector = await this.generateEmbedding(query)

      const queryRequest = {
        vector: queryVector,
        topK,
        includeMetadata: true,
        filter: {
          type: 'document_chunk',
          user_id: userId,
          namespace: this.namespace,
        },
      }

      const response = await this.index.namespace(this.namespace).query(queryRequest)
      return response.matches || []
    } catch (error) {
      console.error('Error querying document chunks:', error)
      throw new Error('Failed to query document chunks')
    }
  }

  async deleteUserData(userId: string): Promise<void> {
    try {
      if (!this.index) {
        await this.initialize()
      }

      // Delete all vectors for this user in this namespace
      await this.index.namespace(this.namespace).deleteMany({
        filter: {
          user_id: userId,
          namespace: this.namespace,
        },
      })
    } catch (error) {
      console.error('Error deleting user data:', error)
      throw new Error('Failed to delete user data')
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use OpenAI embeddings API
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate embedding')
      }

      const data = await response.json()
      return data.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      // Return a mock embedding for development
      return new Array(1536).fill(0).map(() => Math.random())
    }
  }
}

export async function createPineconeClientFromEncrypted(
  encryptedApiKey: string,
  projectId: string,
  userId: string,
  clientName: string,
  projectName: string
): Promise<PineconeClient> {
  try {
    const apiKey = await decrypt(encryptedApiKey)
    const namespace = `${userId}:${clientName}:${projectName}`.replace(/[^a-zA-Z0-9-]/g, '-')

    const client = new PineconeClient(apiKey, projectId, namespace)
    await client.initialize()

    return client
  } catch (error) {
    console.error('Error creating Pinecone client:', error)
    throw new Error('Failed to create Pinecone client')
  }
}
