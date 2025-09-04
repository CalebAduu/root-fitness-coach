import { NextRequest, NextResponse } from 'next/server';
import { RAGManager } from '@/lib/rag';

// Create a singleton RAG manager instance
let ragManager: RAGManager | null = null;

async function getRAGManager(): Promise<RAGManager> {
  if (!ragManager) {
    ragManager = new RAGManager({
      vectorStorePath: './data/vectorstore',
      maxUrlsPerBatch: 3,
      minContentLength: 300
    });
    
    // Initialize the RAG system
    const initResult = await ragManager.initialize();
    if (!initResult.success) {
      throw new Error(`Failed to initialize RAG system: ${initResult.message}`);
    }
  }
  
  return ragManager;
}

export async function POST(request: NextRequest) {
  try {
    const { message, type = 'general' } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    const manager = await getRAGManager();

    let response;
    
    // Route to different RAG methods based on type
    switch (type) {
      case 'workout':
        response = await manager.getWorkoutSuggestions(message);
        break;
      case 'form':
        response = await manager.getExerciseForm(message);
        break;
      case 'nutrition':
        response = await manager.getWorkoutNutrition(message);
        break;
      case 'general':
      default:
        response = await manager.askQuestion(message);
        break;
    }

    return NextResponse.json({
      success: true,
      answer: response.answer,
      sources: response.sources,
      type
    });

  } catch (error) {
    console.error('Error in RAG chat API:', error);
    
    return NextResponse.json(
      { 
        error: 'Sorry, I encountered an error while processing your question. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check RAG system status
export async function GET() {
  try {
    const manager = await getRAGManager();
    const status = manager.getStatus();
    
    return NextResponse.json({
      success: true,
      status,
      message: 'RAG system is ready'
    });
  } catch (error) {
    console.error('Error checking RAG status:', error);
    
    return NextResponse.json(
      { 
        error: 'RAG system not available',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
