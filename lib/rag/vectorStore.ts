import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { ScrapedContent } from './webScraper';
import * as fs from 'fs';
import * as path from 'path';

export class WorkoutVectorStore {
  private embeddings: OpenAIEmbeddings;
  private vectorStore: FaissStore | null = null;
  private readonly storePath: string;

  constructor(storePath: string = './data/vectorstore') {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small', // More cost-effective
    });
    this.storePath = storePath;
  }

  /**
   * Convert scraped content to LangChain documents
   */
  private contentToDocuments(scrapedContent: ScrapedContent[]): Document[] {
    return scrapedContent.map(content => {
      // Create a comprehensive text representation
      const fullText = `
Title: ${content.title}
URL: ${content.url}
Description: ${content.metadata.description || ''}
Content: ${content.content}
Tags: ${content.metadata.tags?.join(', ') || ''}
Author: ${content.metadata.author || ''}
Published: ${content.metadata.publishDate || ''}
      `.trim();

      return new Document({
        pageContent: fullText,
        metadata: {
          url: content.url,
          title: content.title,
          description: content.metadata.description,
          author: content.metadata.author,
          publishDate: content.metadata.publishDate,
          tags: content.metadata.tags,
          source: 'web_scraping'
        }
      });
    });
  }

  /**
   * Create and populate the vector store
   */
  async createVectorStore(scrapedContent: ScrapedContent[]): Promise<void> {
    try {
      console.log(`Creating vector store with ${scrapedContent.length} documents...`);
      
      const documents = this.contentToDocuments(scrapedContent);
      
      // Create the vector store
      this.vectorStore = await FaissStore.fromDocuments(
        documents,
        this.embeddings
      );

      // Save the vector store to disk
      await this.saveVectorStore();
      
      console.log('Vector store created and saved successfully');
    } catch (error) {
      console.error('Error creating vector store:', error);
      throw error;
    }
  }

  /**
   * Load existing vector store from disk
   */
  async loadVectorStore(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.storePath)) {
        console.log('Vector store directory does not exist');
        return false;
      }

      const indexPath = path.join(this.storePath, 'faiss.index');
      const pklPath = path.join(this.storePath, 'faiss.pkl');

      if (!fs.existsSync(indexPath) || !fs.existsSync(pklPath)) {
        console.log('Vector store files not found');
        return false;
      }

      this.vectorStore = await FaissStore.load(this.storePath, this.embeddings);
      console.log('Vector store loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading vector store:', error);
      return false;
    }
  }

  /**
   * Save vector store to disk
   */
  async saveVectorStore(): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('No vector store to save');
    }

    try {
      // Ensure directory exists
      if (!fs.existsSync(this.storePath)) {
        fs.mkdirSync(this.storePath, { recursive: true });
      }

      await this.vectorStore.save(this.storePath);
      console.log(`Vector store saved to ${this.storePath}`);
    } catch (error) {
      console.error('Error saving vector store:', error);
      throw error;
    }
  }

  /**
   * Search for similar documents
   */
  async similaritySearch(query: string, k: number = 4): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Please load or create a vector store first.');
    }

    try {
      const results = await this.vectorStore.similaritySearch(query, k);
      return results;
    } catch (error) {
      console.error('Error performing similarity search:', error);
      throw error;
    }
  }

  /**
   * Search with scores
   */
  async similaritySearchWithScore(query: string, k: number = 4): Promise<[Document, number][]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Please load or create a vector store first.');
    }

    try {
      const results = await this.vectorStore.similaritySearchWithScore(query, k);
      return results;
    } catch (error) {
      console.error('Error performing similarity search with scores:', error);
      throw error;
    }
  }

  /**
   * Get vector store info
   */
  getVectorStoreInfo(): { isLoaded: boolean; storePath: string } {
    return {
      isLoaded: this.vectorStore !== null,
      storePath: this.storePath
    };
  }

  /**
   * Check if vector store exists on disk
   */
  vectorStoreExists(): boolean {
    const indexPath = path.join(this.storePath, 'faiss.index');
    const pklPath = path.join(this.storePath, 'faiss.pkl');
    return fs.existsSync(indexPath) && fs.existsSync(pklPath);
  }

  /**
   * Delete vector store from disk
   */
  deleteVectorStore(): void {
    try {
      if (fs.existsSync(this.storePath)) {
        fs.rmSync(this.storePath, { recursive: true, force: true });
        console.log(`Vector store deleted from ${this.storePath}`);
      }
      this.vectorStore = null;
    } catch (error) {
      console.error('Error deleting vector store:', error);
      throw error;
    }
  }
}
