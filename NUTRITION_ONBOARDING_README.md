# Nutrition Onboarding System

## Overview
The nutrition onboarding system provides personalized nutrition planning through a conversational chat interface. Users can select from 5 different nutrition goal categories and answer goal-specific questions to receive customized nutrition plans.

## Features

### 5 Nutrition Goal Categories
1. **General Information** - Basic nutrition preferences and dietary information
2. **Weight Loss** - Personalized nutrition for weight loss goals  
3. **Sports Performance** - Nutrition optimization for athletic performance
4. **Health Maintenance** - Nutrition for managing health conditions and wellness
5. **Get Active** - Nutrition guidance for starting an active lifestyle

### Question Sets
Each goal category has 3-6 specific questions tailored to that nutrition focus area.

### Chat Interface
- Conversational AI-powered chat experience
- Voice input support (Whisper integration)
- Real-time streaming responses
- Goal-specific question progression

## File Structure

```
app/
├── nutrition-onboarding/
│   └── page.tsx                    # Main nutrition onboarding page
├── api/
│   ├── nutrition-chat/
│   │   └── route.ts               # Chat API for nutrition questions
│   └── generate-nutrition-plan/
│       └── route.ts               # Nutrition plan generation API
└── workout-plan/
    └── page.tsx                   # Updated to show nutrition button/plan

components/
└── NutritionPlanDisplay.tsx       # Component to display nutrition plans

database-setup.sql                 # Database schema for nutrition profiles
```

## User Flow

1. **Workout Plan Page**: User sees nutrition button if no plan exists
2. **Goal Selection**: User chooses from 5 nutrition goal categories
3. **Chat Onboarding**: AI asks goal-specific questions conversationally
4. **Plan Generation**: System generates personalized nutrition plan
5. **Plan Display**: User sees comprehensive nutrition plan on workout page

## Database Schema

```sql
CREATE TABLE nutrition_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  goal VARCHAR(50) NOT NULL,
  nutrition_data JSONB NOT NULL,
  plan_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### POST /api/nutrition-chat
Handles the conversational nutrition onboarding chat.

**Request Body:**
```json
{
  "messages": [{"role": "user", "content": "..."}],
  "goal": "weight_loss",
  "currentQuestionIndex": 0
}
```

### POST /api/generate-nutrition-plan
Generates personalized nutrition plans based on collected data.

**Request Body:**
```json
{
  "goal": "weight_loss",
  "allergies": "dairy, gluten",
  "dietaryPattern": "ketogenic",
  // ... other nutrition data
}
```

## Integration with Existing System

- **Separate from Fitness Onboarding**: Nutrition is completely optional and separate
- **Session Storage**: Nutrition plans stored in sessionStorage for immediate access
- **Database Storage**: Nutrition profiles saved to Supabase for persistence
- **Conditional Display**: Workout plan page shows nutrition plan if available, button if not

## Safety Features

- Medical disclaimers included in all nutrition plans
- Allergy and medical condition considerations
- Professional consultation recommendations
- Evidence-based nutrition recommendations

## Usage

1. Run the database setup script in Supabase
2. Users access nutrition onboarding from workout plan page
3. Complete goal-specific questionnaire
4. Receive personalized nutrition plan
5. View comprehensive nutrition guidance

## Future Enhancements

- Integration with fitness goals for combined recommendations
- Meal tracking and logging features
- Recipe suggestions based on nutrition plan
- Progress tracking for nutrition goals
- Integration with external nutrition databases


