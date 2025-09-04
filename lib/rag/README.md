# RAG (Retrieval-Augmented Generation) System for Fitness Coaching

This RAG system provides intelligent workout and fitness advice by scraping content from reliable fitness websites and using vector search to answer user questions.

## Features

- **Web Scraping**: Automatically scrapes workout and fitness content from trusted websites
- **Vector Search**: Uses FAISS and OpenAI embeddings for semantic search
- **Intelligent Q&A**: Provides contextual answers based on scraped content
- **Multiple Query Types**: Supports general questions, workout suggestions, exercise form, and nutrition advice
- **Source Attribution**: Always provides sources for transparency

## Architecture

```
lib/rag/
├── webScraper.ts      # Web scraping with Beautiful Soup
├── vectorStore.ts     # FAISS vector store management
├── ragChain.ts        # LangChain RAG implementation
├── ragManager.ts      # Main orchestrator
├── index.ts          # Exports
├── testRAG.ts        # Test script
└── README.md         # This file
```

## Components

### 1. WebScraper
- Scrapes content from fitness websites
- Filters for fitness-related content
- Handles rate limiting and error recovery
- Extracts metadata (title, description, tags)

### 2. WorkoutVectorStore
- Manages FAISS vector store
- Handles OpenAI embeddings
- Provides similarity search functionality
- Persists vector store to disk

### 3. WorkoutRAGChain
- Implements LangChain RAG pipeline
- Specialized prompts for fitness coaching
- Multiple query types (workout, form, nutrition)
- Source attribution

### 4. RAGManager
- Main interface for the RAG system
- Orchestrates all components
- Manages knowledge base creation and updates
- Provides high-level API

## Usage

### Basic Usage

```typescript
import { RAGManager } from '@/lib/rag';

// Create and initialize RAG manager
const ragManager = new RAGManager();
await ragManager.initialize();

// Ask questions
const response = await ragManager.askQuestion("What are good beginner exercises?");
console.log(response.answer);
console.log(response.sources);
```

### API Endpoint

The system is integrated via `/api/rag-chat` endpoint:

```typescript
// POST /api/rag-chat
{
  "message": "How do I do a proper push-up?",
  "type": "form" // optional: "general", "workout", "form", "nutrition"
}

// Response
{
  "success": true,
  "answer": "To do a proper push-up...",
  "sources": [
    {
      "url": "https://example.com/push-up-guide",
      "title": "Push-up Form Guide",
      "relevanceScore": 0.95
    }
  ],
  "type": "form"
}
```

### Query Types

1. **General**: `askQuestion(question)` - General fitness questions
2. **Workout**: `getWorkoutSuggestions(query)` - Workout routine suggestions
3. **Form**: `getExerciseForm(exerciseName)` - Exercise form and technique
4. **Nutrition**: `getWorkoutNutrition(query)` - Nutrition and diet advice

## Configuration

```typescript
const config = {
  vectorStorePath: './data/vectorstore',  // Where to store vectors
  maxUrlsPerBatch: 5,                     // URLs to scrape simultaneously
  minContentLength: 500                   // Minimum content length
};

const ragManager = new RAGManager(config);
```

## Default URLs

The system comes with 15+ pre-configured fitness websites:
- Verywell Fit
- Healthline
- Mayo Clinic
- WebMD
- ACE Fitness
- Bodybuilding.com
- Men's Health
- Women's Health
- Self
- Shape
- Runner's World
- Yoga Journal
- CrossFit
- NASM
- And more...

## Adding Custom URLs

```typescript
// Add URLs to existing knowledge base
await ragManager.addUrlsToKnowledgeBase([
  'https://your-fitness-site.com/workout-guide',
  'https://another-site.com/exercise-tips'
]);

// Or rebuild with custom URLs
await ragManager.rebuildKnowledgeBase([
  'https://custom-site.com/fitness-content'
]);
```

## Testing

Run the test script to verify everything works:

```typescript
import { testRAGSystem } from '@/lib/rag/testRAG';
await testRAGSystem();
```

## Environment Variables

Make sure you have these environment variables set:

```env
OPENAI_API_KEY=your_openai_api_key
```

## File Structure

```
data/
└── vectorstore/          # FAISS vector store files
    ├── faiss.index
    └── faiss.pkl
```

## Error Handling

The system includes comprehensive error handling:
- Network timeouts and retries
- Content filtering for relevance
- Graceful degradation when sources are unavailable
- Clear error messages for debugging

## Performance Considerations

- Vector store is persisted to disk for fast loading
- Batch processing for web scraping
- Rate limiting to be respectful to websites
- Efficient similarity search with FAISS

## Future Enhancements

- Incremental vector store updates
- More sophisticated content filtering
- Support for additional file formats (PDFs, docs)
- Real-time content updates
- User feedback integration
- Advanced query routing
