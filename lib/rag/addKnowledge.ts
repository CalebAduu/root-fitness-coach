import { RAGManager } from './ragManager';
import { WebScraper } from './webScraper';

/**
 * Helper script to add knowledge to your RAG system
 */
export class KnowledgeAdder {
  private ragManager: RAGManager;

  constructor() {
    this.ragManager = new RAGManager({
      vectorStorePath: './data/vectorstore',
      maxUrlsPerBatch: 3,
      minContentLength: 300
    });
  }

  /**
   * Initialize the RAG system
   */
  async initialize(): Promise<void> {
    const result = await this.ragManager.initialize();
    if (!result.success) {
      throw new Error(`Failed to initialize RAG system: ${result.message}`);
    }
    console.log('✅ RAG system initialized');
  }

  /**
   * Add content by scraping URLs
   */
  async addFromUrls(urls: string[]): Promise<void> {
    console.log(`🔍 Scraping ${urls.length} URLs...`);
    
    const webScraper = new WebScraper();
    const scrapedContent = await webScraper.scrapeUrls(urls);
    const fitnessContent = scrapedContent.filter(content => 
      webScraper.isFitnessContent(content) && 
      content.content.length >= 100
    );

    if (fitnessContent.length === 0) {
      throw new Error('No fitness-related content found in the provided URLs');
    }

    await this.ragManager.addContentToKnowledgeBase(fitnessContent);
    console.log(`✅ Added ${fitnessContent.length} documents to knowledge base`);
  }

  /**
   * Add custom content
   */
  async addCustomContent(
    title: string, 
    content: string, 
    url?: string, 
    tags?: string[], 
    author?: string
  ): Promise<void> {
    console.log(`📝 Adding custom content: ${title}`);
    await this.ragManager.addCustomKnowledge(title, content, url, tags, author);
    console.log('✅ Custom content added successfully');
  }

  /**
   * Add multiple custom content items
   */
  async addMultipleCustomContent(items: Array<{
    title: string;
    content: string;
    url?: string;
    tags?: string[];
    author?: string;
  }>): Promise<void> {
    console.log(`📝 Adding ${items.length} custom content items...`);
    
    for (const item of items) {
      await this.addCustomContent(
        item.title, 
        item.content, 
        item.url, 
        item.tags, 
        item.author
      );
    }
    
    console.log('✅ All custom content added successfully');
  }
}

// Example usage functions
export async function addFitnessWebsites(): Promise<void> {
  const adder = new KnowledgeAdder();
  await adder.initialize();

  const fitnessUrls = [
    'https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/exercise/art-20048389',
    'https://www.acefitness.org/resources/everyone/exercise-library/',
    'https://www.bodybuilding.com/content/beginner-workout-routine.html',
    'https://www.healthline.com/health/fitness-exercise',
    'https://www.verywellfit.com/'
  ];

  await adder.addFromUrls(fitnessUrls);
}

export async function addCustomFitnessKnowledge(): Promise<void> {
  const adder = new KnowledgeAdder();
  await adder.initialize();

  const customKnowledge = [
    {
      title: "Proper Squat Form",
      content: "To perform a proper squat: 1) Stand with feet shoulder-width apart, 2) Keep your chest up and core engaged, 3) Lower your body by pushing your hips back and bending your knees, 4) Go down until your thighs are parallel to the floor, 5) Push through your heels to return to starting position. Keep your knees tracking over your toes and maintain a neutral spine throughout the movement.",
      tags: ["form", "squat", "technique", "beginner"],
      author: "Root Fitness Coach"
    },
    {
      title: "Post-Workout Nutrition",
      content: "After a workout, your body needs protein to repair muscles and carbohydrates to replenish glycogen stores. Aim to eat within 30-60 minutes post-workout. Good options include: Greek yogurt with berries, chicken with sweet potato, or a protein shake with banana. The ideal ratio is 3:1 or 4:1 carbs to protein for optimal recovery.",
      tags: ["nutrition", "recovery", "post-workout", "protein"],
      author: "Root Fitness Coach"
    },
    {
      title: "Beginner Workout Schedule",
      content: "For beginners, start with 3 workouts per week with at least one rest day between sessions. Focus on full-body workouts that include: squats, push-ups, lunges, planks, and rows. Start with 2-3 sets of 8-12 repetitions for each exercise. Gradually increase intensity and volume as you get stronger. Always warm up for 5-10 minutes and cool down with stretching.",
      tags: ["beginner", "workout", "schedule", "programming"],
      author: "Root Fitness Coach"
    }
  ];

  await adder.addMultipleCustomContent(customKnowledge);
}














