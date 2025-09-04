import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

interface FeedbackData {
  planId: string;
  profileId: string;
  rating: number;
  category: string;
  feedback: string;
  timestamp: string;
}

export async function POST(req: Request) {
  try {
    const feedbackData: FeedbackData = await req.json();

    // Validate required fields
    if (!feedbackData.planId || !feedbackData.profileId || !feedbackData.feedback || !feedbackData.rating) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: planId, profileId, feedback, and rating are required.' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate rating range
    if (feedbackData.rating < 1 || feedbackData.rating > 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Rating must be between 1 and 5.' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Update the plan with feedback
    const { data: updatedPlan, error: updateError } = await supabase
      .from('plans')
      .update({
        feedback: feedbackData.feedback,
        rating: feedbackData.rating,
        feedback_category: feedbackData.category,
        feedback_timestamp: feedbackData.timestamp
      })
      .eq('id', feedbackData.planId)
      .eq('profile_id', feedbackData.profileId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating plan with feedback:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save feedback to database.' 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Feedback submitted successfully!',
        planId: feedbackData.planId,
        rating: feedbackData.rating
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in submit-feedback API:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to submit feedback. Please try again.' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
