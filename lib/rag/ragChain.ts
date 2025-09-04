import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { Document } from '@langchain/core/documents';
import { WorkoutVectorStore } from './vectorStore';
import { ScrapedContent } from './webScraper';

export interface RAGResponse {
  answer: string;
  sources: Array<{
    url: string;
    title: string;
    relevanceScore?: number;
  }>;
  context: string;
}

export class WorkoutRAGChain {
  private llm: ChatOpenAI;
  private vectorStore: WorkoutVectorStore;
  private promptTemplate: PromptTemplate;

  constructor(vectorStore: WorkoutVectorStore) {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini', // Cost-effective model
      temperature: 0.1, // Low temperature for more consistent responses
      maxTokens: 300, // Reduced for more concise answers
    });

    this.vectorStore = vectorStore;

    // Create a specialized prompt for workout-related questions
    this.promptTemplate = PromptTemplate.fromTemplate(`
You are "Root", a knowledgeable and encouraging AI fitness coach. Answer the user's question concisely and helpfully.

Context from fitness sources:
{context}

User Question: {question}

Instructions:
1. Keep your answer SHORT and to the point (2-3 sentences max)
2. Focus on the most important information from the context
3. Be encouraging and motivational
4. Prioritize safety and proper form when discussing exercises
5. If the context doesn't contain enough information, say so briefly

Answer: `);
  }

  /**
   * Process a question through the RAG chain
   */
  async processQuestion(question: string, k: number = 4): Promise<RAGResponse> {
    try {
      // Step 1: Retrieve relevant documents
      const relevantDocs = await this.vectorStore.similaritySearchWithScore(question, k);
      
      if (relevantDocs.length === 0) {
        return {
          answer: "I don't have enough specific information in my knowledge base to answer your question about workouts. However, I'd be happy to help you with general fitness guidance or connect you with other resources!",
          sources: [],
          context: "No relevant context found"
        };
      }

      // Step 2: Prepare context from retrieved documents
      const context = this.prepareContext(relevantDocs);
      
      // Step 3: Generate answer using LLM
      const chain = RunnableSequence.from([
        this.promptTemplate,
        this.llm
      ]);

      const response = await chain.invoke({
        question,
        context
      });

      // Step 4: Prepare sources
      const sources = relevantDocs.map(([doc, score]) => ({
        url: doc.metadata.url as string,
        title: doc.metadata.title as string,
        relevanceScore: score
      }));

      return {
        answer: response.content as string,
        sources,
        context
      };

    } catch (error) {
      console.error('Error processing question through RAG chain:', error);
      throw error;
    }
  }

  /**
   * Prepare context string from retrieved documents
   */
  private prepareContext(documents: [Document, number][]): string {
    return documents
      .map(([doc, score], index) => {
        const source = `Source ${index + 1} (Relevance: ${(score * 100).toFixed(1)}%):
Title: ${doc.metadata.title}
Content: ${doc.pageContent.substring(0, 400)}${doc.pageContent.length > 400 ? '...' : ''}

---`;
        return source;
      })
      .join('\n\n');
  }

  /**
   * Get workout-specific suggestions based on user query
   */
  async getWorkoutSuggestions(query: string): Promise<RAGResponse> {
    // Enhance the query for workout suggestions
    const enhancedQuery = `workout routine exercise plan ${query} training program`;
    return this.processQuestion(enhancedQuery, 6);
  }

  /**
   * Get exercise form and technique information
   */
  async getExerciseForm(exerciseName: string): Promise<RAGResponse> {
    const enhancedQuery = `${exerciseName} proper form technique how to do correctly safety tips`;
    return this.processQuestion(enhancedQuery, 4);
  }

  /**
   * Get nutrition and diet information related to workouts
   */
  async getWorkoutNutrition(query: string): Promise<RAGResponse> {
    const enhancedQuery = `nutrition diet ${query} workout recovery protein`;
    return this.processQuestion(enhancedQuery, 4);
  }

  /**
   * Get general fitness advice
   */
  async getFitnessAdvice(query: string): Promise<RAGResponse> {
    return this.processQuestion(query, 4);
  }

  /**
   * Check if the RAG system is ready
   */
  isReady(): boolean {
    return this.vectorStore.getVectorStoreInfo().isLoaded;
  }

  /**
   * Get system status
   */
  getStatus(): { isReady: boolean; vectorStoreInfo: any } {
    return {
      isReady: this.isReady(),
      vectorStoreInfo: this.vectorStore.getVectorStoreInfo()
    };
  }
}
