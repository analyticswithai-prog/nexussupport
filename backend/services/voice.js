const { createClient } = require('@deepgram/sdk');
const axios = require('axios');
const fs = require('fs');

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // default: Sarah

// Transcribe audio buffer using Deepgram
async function transcribeAudio(audioBuffer, mimeType = 'audio/wav') {
  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model: 'nova-2',
      smart_format: true,
      language: 'en',
      punctuate: true,
      diarize: false,
    }
  );

  if (error) throw new Error(`Deepgram error: ${error.message}`);

  const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  const confidence = result?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

  return { transcript, confidence };
}

// Transcribe audio from a URL
async function transcribeFromUrl(audioUrl) {
  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    {
      model: 'nova-2',
      smart_format: true,
      language: 'en',
      punctuate: true,
    }
  );

  if (error) throw new Error(`Deepgram error: ${error.message}`);
  return result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
}

// Live streaming transcription setup
function createLiveTranscription(onTranscript) {
  const connection = deepgram.listen.live({
    model: 'nova-2',
    smart_format: true,
    language: 'en',
    punctuate: true,
    interim_results: true,
  });

  connection.on('transcript', (data) => {
    const transcript = data?.channel?.alternatives?.[0]?.transcript;
    if (transcript) onTranscript(transcript, data.is_final);
  });

  return connection;
}

// Convert text to speech using ElevenLabs
async function textToSpeech(text, voiceId = ELEVENLABS_VOICE_ID) {
  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
    },
    {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      responseType: 'arraybuffer',
    }
  );
  return Buffer.from(response.data);
}

// Get available ElevenLabs voices
async function getVoices() {
  const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
  });
  return response.data.voices.map(v => ({ id: v.voice_id, name: v.name, category: v.category }));
}

// Full voice pipeline: audio → text → AI → speech
async function voicePipeline({ audioBuffer, tenant, conversationHistory, generateAIResponse }) {
  // Step 1: STT
  console.log('🎤 Deepgram: transcribing audio...');
  const { transcript, confidence } = await transcribeAudio(audioBuffer);
  if (!transcript) throw new Error('No speech detected');
  console.log(`🎤 Transcript (${(confidence * 100).toFixed(0)}%): "${transcript}"`);

  // Step 2: AI response
  console.log('🤖 Claude: generating response...');
  const aiResult = await generateAIResponse({ tenant, messages: conversationHistory, userMessage: transcript });
  console.log(`🤖 Response: "${aiResult.response}"`);

  // Step 3: TTS
  console.log('🔊 ElevenLabs: converting to speech...');
  const audioResponse = await textToSpeech(aiResult.response);
  console.log('🔊 Audio generated');

  return {
    transcript,
    confidence,
    aiResponse: aiResult.response,
    audioBuffer: audioResponse,
    shouldEscalate: aiResult.shouldEscalate,
    frustrationScore: aiResult.frustrationScore,
    sentiment: aiResult.sentiment,
  };
}

module.exports = { transcribeAudio, transcribeFromUrl, createLiveTranscription, textToSpeech, getVoices, voicePipeline };
