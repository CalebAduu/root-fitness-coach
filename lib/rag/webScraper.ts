import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  metadata: {
    description?: string;
    author?: string;
    publishDate?: string;
    tags?: string[];
  };
}

export class WebScraper {
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  private readonly timeout = 10000; // 10 seconds

  /**
   * Scrape content from a single URL
   */
  async scrapeUrl(url: string): Promise<ScrapedContent | null> {
    try {
      console.log(`Scraping URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        timeout: this.timeout,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share, .comments').remove();
      
      // Extract title
      const title = $('title').text().trim() || 
                   $('h1').first().text().trim() || 
                   $('meta[property="og:title"]').attr('content') || 
                   'Untitled';

      // Extract main content
      let content = '';
      
      // Try to find main content areas
      const contentSelectors = [
        'main',
        'article',
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.workout-content',
        '.exercise-content',
        '#content',
        '.main-content'
      ];

      let mainContent = null;
      for (const selector of contentSelectors) {
        mainContent = $(selector);
        if (mainContent.length > 0) {
          break;
        }
      }

      if (mainContent && mainContent.length > 0) {
        content = mainContent.text().trim();
      } else {
        // Fallback: get all text from body
        content = $('body').text().trim();
      }

      // Clean up content
      content = this.cleanText(content);

      // Extract metadata
      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || 
                         $('p').first().text().trim().substring(0, 200);

      const author = $('meta[name="author"]').attr('content') || 
                    $('.author').text().trim() || 
                    $('[rel="author"]').text().trim();

      const publishDate = $('meta[property="article:published_time"]').attr('content') || 
                         $('.publish-date').text().trim() || 
                         $('.date').text().trim();

      // Extract tags/keywords
      const tags: string[] = [];
      $('meta[name="keywords"]').attr('content')?.split(',').forEach(tag => {
        if (tag.trim()) tags.push(tag.trim());
      });

      return {
        url,
        title,
        content,
        metadata: {
          description,
          author,
          publishDate,
          tags
        }
      };

    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    }
  }

  /**
   * Scrape multiple URLs
   */
  async scrapeUrls(urls: string[]): Promise<ScrapedContent[]> {
    const results: ScrapedContent[] = [];
    
    // Process URLs in batches to avoid overwhelming servers
    const batchSize = 3;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchPromises = batch.map(url => this.scrapeUrl(url));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          } else {
            console.warn(`Failed to scrape ${batch[index]}:`, result.status === 'rejected' ? result.reason : 'No content');
          }
        });
      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error);
      }

      // Add delay between batches to be respectful
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Clean and normalize text content
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }

  /**
   * Check if content is relevant for fitness/workout information
   */
  isFitnessContent(content: ScrapedContent): boolean {
    const fitnessKeywords = [
      'workout', 'exercise', 'fitness', 'training', 'gym', 'muscle', 'strength',
      'cardio', 'weight', 'lifting', 'squat', 'push-up', 'pull-up', 'deadlift',
      'bench press', 'running', 'yoga', 'pilates', 'crossfit', 'bodybuilding',
      'reps', 'sets', 'form', 'technique', 'routine', 'program', 'diet', 'nutrition'
    ];

    const text = (content.title + ' ' + content.content + ' ' + (content.metadata.description || '')).toLowerCase();
    
    const keywordCount = fitnessKeywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    ).length;

    return keywordCount >= 2; // At least 2 fitness-related keywords
  }
}
