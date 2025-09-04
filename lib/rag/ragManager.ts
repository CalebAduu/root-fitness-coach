import { WebScraper, ScrapedContent } from './webScraper';
import { WorkoutVectorStore } from './vectorStore';
import { WorkoutRAGChain, RAGResponse } from './ragChain';

export interface RAGConfig {
  vectorStorePath?: string;
  maxUrlsPerBatch?: number;
  minContentLength?: number;
}

export class RAGManager {
  private webScraper: WebScraper;
  private vectorStore: WorkoutVectorStore;
  private ragChain: WorkoutRAGChain;
  private config: RAGConfig;

  // Default workout and fitness URLs to scrape (only working URLs)
  private readonly defaultUrls = [
    'https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/exercise/art-20048389',
    'https://www.acefitness.org/resources/everyone/exercise-library/',
    'https://www.bodybuilding.com/content/beginner-workout-routine.html',
    'https://www.menshealth.com/fitness/a19516867/beginner-workout-plan/',
    'https://www.womenshealthmag.com/fitness/a19965867/beginner-workout-plan/',
    'https://www.yogajournal.com/practice/beginners/',
    'https://www.crossfit.com/essentials/'
  ];

  constructor(config: RAGConfig = {}) {
    this.config = {
      vectorStorePath: './data/vectorstore',
      maxUrlsPerBatch: 5,
      minContentLength: 500,
      ...config
    };

    this.webScraper = new WebScraper();
    this.vectorStore = new WorkoutVectorStore(this.config.vectorStorePath);
    this.ragChain = new WorkoutRAGChain(this.vectorStore);
  }

  /**
   * Initialize the RAG system
   */
  async initialize(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Initializing RAG system...');

      // Try to load existing vector store
      const loaded = await this.vectorStore.loadVectorStore();
      
      if (loaded) {
        console.log('RAG system initialized with existing vector store');
        return { success: true, message: 'RAG system loaded from existing data' };
      }

      // If no existing store, create new one
      console.log('No existing vector store found. Creating new one...');
      await this.createKnowledgeBase();
      
      return { success: true, message: 'RAG system initialized with new knowledge base' };
    } catch (error) {
      console.error('Error initializing RAG system:', error);
      return { success: false, message: `Failed to initialize RAG system: ${error}` };
    }
  }

  /**
   * Create knowledge base by scraping URLs
   */
  async createKnowledgeBase(customUrls?: string[]): Promise<void> {
    try {
      const urlsToScrape = customUrls || this.defaultUrls;
      console.log(`Scraping ${urlsToScrape.length} URLs for workout information...`);

      // Scrape content from URLs
      const scrapedContent = await this.webScraper.scrapeUrls(urlsToScrape);
      
      // Filter for fitness-related content
      const fitnessContent = scrapedContent.filter(content => 
        this.webScraper.isFitnessContent(content) && 
        content.content.length >= (this.config.minContentLength || 500)
      );

      console.log(`Found ${fitnessContent.length} relevant fitness articles out of ${scrapedContent.length} scraped`);

      if (fitnessContent.length === 0) {
        throw new Error('No relevant fitness content found. Please check the URLs or try different sources.');
      }

      // Create vector store
      await this.vectorStore.createVectorStore(fitnessContent);
      
      console.log('Knowledge base created successfully');
    } catch (error) {
      console.error('Error creating knowledge base:', error);
      throw error;
    }
  }

  /**
   * Add new URLs to the knowledge base
   */
  async addUrlsToKnowledgeBase(urls: string[]): Promise<void> {
    try {
      console.log(`Adding ${urls.length} new URLs to knowledge base...`);

      // Scrape new content
      const newContent = await this.webScraper.scrapeUrls(urls);
      const fitnessContent = newContent.filter(content => 
        this.webScraper.isFitnessContent(content) && 
        content.content.length >= (this.config.minContentLength || 500)
      );

      if (fitnessContent.length === 0) {
        console.log('No new relevant fitness content found');
        return;
      }

      // Load existing vector store
      const loaded = await this.vectorStore.loadVectorStore();
      if (!loaded) {
        throw new Error('No existing vector store found. Please initialize the system first.');
      }

      // Create new vector store with combined content
      // Note: This is a simplified approach. In production, you might want to implement incremental updates
      console.log('Recreating vector store with new content...');
      await this.createKnowledgeBase([...this.defaultUrls, ...urls]);
      
      console.log(`Successfully added ${fitnessContent.length} new articles to knowledge base`);
    } catch (error) {
      console.error('Error adding URLs to knowledge base:', error);
      throw error;
    }
  }

  /**
   * Ask a question using the RAG system
   */
  async askQuestion(question: string): Promise<RAGResponse> {
    if (!this.ragChain.isReady()) {
      throw new Error('RAG system not initialized. Please call initialize() first.');
    }

    return this.ragChain.processQuestion(question);
  }

  /**
   * Get workout suggestions
   */
  async getWorkoutSuggestions(query: string): Promise<RAGResponse> {
    if (!this.ragChain.isReady()) {
      throw new Error('RAG system not initialized. Please call initialize() first.');
    }

    return this.ragChain.getWorkoutSuggestions(query);
  }

  /**
   * Get exercise form information
   */
  async getExerciseForm(exerciseName: string): Promise<RAGResponse> {
    if (!this.ragChain.isReady()) {
      throw new Error('RAG system not initialized. Please call initialize() first.');
    }

    return this.ragChain.getExerciseForm(exerciseName);
  }

  /**
   * Get nutrition advice
   */
  async getWorkoutNutrition(query: string): Promise<RAGResponse> {
    if (!this.ragChain.isReady()) {
      throw new Error('RAG system not initialized. Please call initialize() first.');
    }

    return this.ragChain.getWorkoutNutrition(query);
  }

  /**
   * Get system status
   */
  getStatus(): { isReady: boolean; vectorStoreInfo: any; config: RAGConfig } {
    return {
      isReady: this.ragChain.isReady(),
      vectorStoreInfo: this.vectorStore.getVectorStoreInfo(),
      config: this.config
    };
  }

  /**
   * Rebuild the knowledge base
   */
  async rebuildKnowledgeBase(customUrls?: string[]): Promise<void> {
    try {
      console.log('Rebuilding knowledge base...');
      
      // Delete existing vector store
      this.vectorStore.deleteVectorStore();
      
      // Create new knowledge base
      await this.createKnowledgeBase(customUrls);
      
      console.log('Knowledge base rebuilt successfully');
    } catch (error) {
      console.error('Error rebuilding knowledge base:', error);
      throw error;
    }
  }

  /**
   * Get available URLs for scraping
   */
  getDefaultUrls(): string[] {
    return [...this.defaultUrls];
  }

  /**
   * Add custom URLs to the default list
   */
  addCustomUrls(urls: string[]): void {
    this.defaultUrls.push(...urls);
  }
}
