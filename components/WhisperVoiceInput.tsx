"use client";

import { useState, useRef } from 'react';

interface WhisperVoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  /** 'default' is the original compact pill button. 'orb' renders a large
   * glowing circular mic button with status text, for a voice-first screen. */
  variant?: 'default' | 'orb';
}

export default function WhisperVoiceInput({
  onTranscript,
  onError,
  disabled = false,
  className = "",
  variant = 'default'
}: WhisperVoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      // Mono speech with noise suppression gives the transcriber a much cleaner signal
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
        (type) => MediaRecorder.isTypeSupported(type)
      );
      const mediaRecorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        if (audioBlob.size < 1000) {
          onError?.("I didn't catch that - please try speaking again.");
          return;
        }
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (error) {
      console.error('Error starting recording:', error);
      onError?.('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onTranscript(result.transcript);
      } else {
        onError?.(result.error || 'Transcription failed');
      }

    } catch (error) {
      console.error('Transcription error:', error);
      onError?.('Failed to transcribe audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (variant === 'orb') {
    const statusText = isProcessing ? 'Transcribing...' : isRecording ? 'Listening...' : 'Tap to speak';

    return (
      <div className={`flex flex-col items-center space-y-4 ${className}`}>
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Expanding rings while recording */}
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-red-500/20 animate-ping" style={{ animationDelay: '0.3s' }} />
            </>
          )}

          {/* Idle glow */}
          {!isRecording && !isProcessing && (
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400 via-blue-500 to-purple-500 blur-xl opacity-40 animate-pulse-glow" />
          )}

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isProcessing}
            className={`
              relative w-28 h-28 rounded-full flex items-center justify-center
              transition-all duration-200 shadow-xl
              ${isRecording
                ? 'bg-gradient-to-br from-red-500 to-orange-500'
                : 'bg-gradient-to-br from-teal-400 via-blue-500 to-purple-600'
              }
              ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
              focus:outline-none focus:ring-4 focus:ring-teal-500/40
            `}
            title={isRecording ? 'Stop recording' : isProcessing ? 'Processing...' : 'Start voice input'}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            ) : isRecording ? (
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <rect x="6" y="6" width="8" height="8" rx="1.5" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        <span className={`text-sm font-medium ${isRecording ? 'text-red-400' : isProcessing ? 'text-teal-400' : 'text-gray-400'}`}>
          {statusText}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Voice Button */}
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        className={`
          p-4 rounded-full transition-all duration-200
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : 'bg-teal-500 hover:bg-teal-600 text-white'
          }
          ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
        `}
        title={
          isRecording 
            ? 'Stop recording' 
            : isProcessing 
            ? 'Processing...' 
            : 'Start voice input'
        }
      >
        {isProcessing ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span className="text-sm">Processing...</span>
          </div>
        ) : isRecording ? (
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">Stop</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">Speak</span>
          </div>
        )}
      </button>

      {/* Status Messages */}
      {isRecording && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 bg-red-900 rounded-lg border border-red-700">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm text-red-200 font-medium">Recording...</span>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 bg-teal-900 rounded-lg border border-teal-700">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-400"></div>
            <span className="text-sm text-teal-200 font-medium">Processing audio...</span>
          </div>
        </div>
      )}
    </div>
  );
}







