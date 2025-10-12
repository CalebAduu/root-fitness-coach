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
   * Search for workout information using proper RAG (Vector Store + Web Scraping + AI Generation)
   */
  async searchWorkoutInfo(query: string, searchType: 'workout' | 'form' | 'nutrition' | 'general' = 'general'): Promise<RAGResponse> {
    try {
      console.log(`🔍 RAG Search for: ${query} (type: ${searchType})`);

      // Step 1: Retrieve from vector store (existing knowledge base)
      let vectorStoreResults: RAGResponse | null = null;
      try {
        if (this.ragChain.isReady()) {
          switch (searchType) {
            case 'workout':
              vectorStoreResults = await this.ragChain.getWorkoutSuggestions(query);
              break;
            case 'form':
              vectorStoreResults = await this.ragChain.getExerciseForm(query);
              break;
            case 'nutrition':
              vectorStoreResults = await this.ragChain.getWorkoutNutrition(query);
              break;
            default:
              vectorStoreResults = await this.ragChain.processQuestion(query);
              break;
          }
          console.log('✅ Retrieved from vector store');
        }
      } catch (error) {
        console.warn('⚠️ Vector store retrieval failed:', error);
      }

      // Step 2: Augment with real-time web scraping
      let webScrapingResults: any[] = [];
      try {
        const webScraper = new WebScraper();
        const urls = this.generateSearchUrls(query, searchType);
        
        const scrapedContent = await webScraper.scrapeUrls(urls);
        const fitnessContent = scrapedContent.filter(content => 
          webScraper.isFitnessContent(content) && 
          content.content.length >= 100
        );

        webScrapingResults = fitnessContent.slice(0, 3).map(content => ({
          title: content.title,
          url: content.url,
          content: content.content.substring(0, 500),
          source: 'Web Scraper'
        }));

        console.log(`✅ Retrieved ${webScrapingResults.length} results from web scraping`);
      } catch (error) {
        console.warn('⚠️ Web scraping failed:', error);
      }

      // Step 3: Generate AI-powered answer using both sources
      const answer = await this.generateRAGAnswer(query, vectorStoreResults, webScrapingResults, searchType);

      // Combine sources from both vector store and web scraping
      const sources = [
        ...(vectorStoreResults?.sources || []),
        ...webScrapingResults.map(result => ({
          url: result.url,
          title: result.title,
          relevanceScore: 0.7
        }))
      ];

      // Create context from both sources
      const context = [
        vectorStoreResults?.context || '',
        webScrapingResults.map(result => `${result.title}: ${result.content.substring(0, 200)}...`).join('\n\n')
      ].filter(Boolean).join('\n\n');

      return {
        answer,
        sources: sources.slice(0, 5), // Limit to 5 sources
        context
      };

    } catch (error) {
      console.error('Error in RAG search:', error);
      return {
        answer: "I encountered an error while searching for information. Please try again or ask a different question.",
        sources: [],
        context: "Error occurred during search"
      };
    }
  }

  /**
   * Generate search URLs based on query and search type
   */
  private generateSearchUrls(query: string, searchType: string): string[] {
    const baseUrls = [
      'https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/exercise/art-20048389',
      'https://www.acefitness.org/resources/everyone/exercise-library/',
      'https://www.bodybuilding.com/content/beginner-workout-routine.html',
      'https://www.menshealth.com/fitness/a19516867/beginner-workout-plan/',
      'https://www.womenshealthmag.com/fitness/a19965867/beginner-workout-plan/',
      'https://www.yogajournal.com/practice/beginners/',
      'https://www.crossfit.com/essentials/',
      'https://www.healthline.com/health/fitness-exercise',
      'https://www.verywellfit.com/',
      'https://blog.myfitnesspal.com/',
      'https://www.verywellfit.com/',
      'https://www.nutrition.gov/',
      'https://www.livestrong.com/article/266620-beginner-workout-plan/',
      'https://www.webmd.com/fitness-exercise/default.htm'
    ];

    // For now, return a subset of URLs
    // In a more sophisticated implementation, you could generate URLs based on the query
    return baseUrls.slice(0, 5);
  }

  /**
   * Generate AI-powered answer using both vector store and web scraping results
   */
  private async generateRAGAnswer(
    query: string, 
    vectorStoreResults: RAGResponse | null, 
    webScrapingResults: any[], 
    searchType: string
  ): Promise<string> {
    try {
      // Combine all context from both sources
      const vectorStoreContext = vectorStoreResults?.context || '';
      const webScrapingContext = webScrapingResults.map(result => 
        `${result.title}: ${result.content}`
      ).join('\n\n');

      const combinedContext = [vectorStoreContext, webScrapingContext]
        .filter(Boolean)
        .join('\n\n---\n\n');

      if (!combinedContext.trim()) {
        return "I couldn't find any relevant information for your query. Please try rephrasing your question or ask about a different topic.";
      }

      // Use the RAG chain to generate an AI-powered answer
      if (this.ragChain.isReady()) {
        // Create a temporary RAG response with the combined context
        const tempResponse: RAGResponse = {
          answer: '', // Will be generated by AI
          sources: [],
          context: combinedContext
        };

        // Use the RAG chain's AI to generate the answer
        const aiResponse = await this.ragChain.generateAnswerFromContext(query, combinedContext, searchType);
        return aiResponse;
      } else {
        // Fallback: simple text processing if RAG chain not ready
        return this.generateSimpleAnswer(query, combinedContext, searchType);
      }

    } catch (error) {
      console.error('Error generating RAG answer:', error);
      return "I found some information but had trouble processing it. Please try asking your question in a different way.";
    }
  }

  /**
   * Generate a simple answer as fallback
   */
  private generateSimpleAnswer(query: string, context: string, searchType: string): string {
    const sentences = context.split(/[.!?]+/).filter(s => s.trim().length > 30);
    
    if (sentences.length === 0) {
      return "I couldn't find any relevant information for your query.";
    }

    // Take the first few meaningful sentences
    const relevantSentences = sentences.slice(0, 2);
    let answer = `Based on my search, here's what I found about "${query}":\n\n`;
    answer += relevantSentences.join('. ').trim() + '.';
    
    return answer;
  }



  /**
   * Add new scraped content to the vector store
   */
  async addContentToKnowledgeBase(scrapedContent: ScrapedContent[]): Promise<void> {
    try {
      console.log(`Adding ${scrapedContent.length} documents to knowledge base...`);
      await this.vectorStore.addToVectorStore(scrapedContent);
      console.log('✅ Content added to knowledge base successfully');
    } catch (error) {
      console.error('Error adding content to knowledge base:', error);
      throw error;
    }
  }

  /**
   * Add custom content to the vector store
   */
  async addCustomKnowledge(
    title: string, 
    content: string, 
    url?: string, 
    tags?: string[], 
    author?: string
  ): Promise<void> {
    try {
      console.log(`Adding custom knowledge: ${title}`);
      await this.vectorStore.addCustomContent(title, content, url, tags, author);
      console.log('✅ Custom knowledge added successfully');
    } catch (error) {
      console.error('Error adding custom knowledge:', error);
      throw error;
    }
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
