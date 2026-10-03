import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type });

    // Create a File object for OpenAI, with an extension matching the real format
    const extension = audioFile.type.includes('mp4') ? 'mp4'
      : audioFile.type.includes('ogg') ? 'ogg'
      : audioFile.type.includes('mpeg') ? 'mp3'
      : 'webm';
    const audioFileForOpenAI = new File([audioBlob], `audio.${extension}`, {
      type: audioFile.type,
    });

    // gpt-4o-transcribe is noticeably more accurate than whisper-1, especially with
    // accents and background noise. The prompt primes it with the vocabulary this app expects.
    const transcription = await openai.audio.transcriptions.create({
      file: audioFileForOpenAI,
      model: 'gpt-4o-transcribe',
      language: 'en',
      response_format: 'text',
      prompt:
        'A person talking to an AI fitness coach about their name, age, height (e.g. 5 feet 10 inches), weight (lbs or kg), fitness goals, gym equipment, injuries, and workouts per week. May include food, nutrition, and exercise terms like squats, deadlifts, macros, protein.',
    });

    return NextResponse.json({
      success: true,
      transcript: transcription,
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}







