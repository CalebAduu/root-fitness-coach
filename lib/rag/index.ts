// Export all RAG components
export { WebScraper, type ScrapedContent } from './webScraper';
export { WorkoutVectorStore } from './vectorStore';
export { WorkoutRAGChain, type RAGResponse } from './ragChain';
export { RAGManager, type RAGConfig } from './ragManager';

// Export a convenience function to create a ready-to-use RAG manager
export async function createRAGManager(config?: RAGConfig): Promise<RAGManager> {
  const manager = new RAGManager(config);
  await manager.initialize();
  return manager;
}
