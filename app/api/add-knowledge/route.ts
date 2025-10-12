import { NextRequest, NextResponse } from 'next/server';
import { RAGManager } from '@/lib/rag';
import { WebScraper } from '@/lib/rag/webScraper';

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
    const { type, content } = await request.json();

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Type and content are required' },
        { status: 400 }
      );
    }

    const manager = await getRAGManager();

    if (type === 'scrape_urls') {
      // Add content by scraping URLs
      const { urls } = content;
      
      if (!urls || !Array.isArray(urls)) {
        return NextResponse.json(
          { error: 'URLs array is required for scraping' },
          { status: 400 }
        );
      }

      const webScraper = new WebScraper();
      const scrapedContent = await webScraper.scrapeUrls(urls);
      const fitnessContent = scrapedContent.filter(content => 
        webScraper.isFitnessContent(content) && 
        content.content.length >= 100
      );

      if (fitnessContent.length === 0) {
        return NextResponse.json(
          { error: 'No fitness-related content found in the provided URLs' },
          { status: 400 }
        );
      }

      await manager.addContentToKnowledgeBase(fitnessContent);

      return NextResponse.json({
        success: true,
        message: `Successfully added ${fitnessContent.length} documents to knowledge base`,
        addedDocuments: fitnessContent.map(content => ({
          title: content.title,
          url: content.url
        }))
      });

    } else if (type === 'custom_content') {
      // Add custom content
      const { title, text, url, tags, author } = content;
      
      if (!title || !text) {
        return NextResponse.json(
          { error: 'Title and text are required for custom content' },
          { status: 400 }
        );
      }

      await manager.addCustomKnowledge(title, text, url, tags, author);

      return NextResponse.json({
        success: true,
        message: `Successfully added custom knowledge: ${title}`
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid type. Use "scrape_urls" or "custom_content"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error adding knowledge:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to add knowledge to the system',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check knowledge base status
export async function GET() {
  try {
    const manager = await getRAGManager();
    const status = manager.getStatus();
    
    return NextResponse.json({
      success: true,
      status,
      message: 'Knowledge base is ready for updates'
    });
  } catch (error) {
    console.error('Error checking knowledge base status:', error);
    
    return NextResponse.json(
      { 
        error: 'Knowledge base not available',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}













