import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Typography, Paper, CircularProgress, Alert, Chip } from '@mui/material';
import { Send, Lightbulb, Mic, StopCircle, RecordVoiceOver, FiberManualRecord } from '@mui/icons-material';
import { apiClient } from '@/lib/api';

interface ChatInputProps {
  sessionId: string;
  onSendMessage: (message: string) => void;
  onLiveTranscript?: (role: 'user' | 'assistant', text: string) => void;
  disabled: boolean;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface LiveServerMessage {
  type?: string;
  text?: string;
  data?: string;
  mime_type?: string;
  error?: string;
  detail?: string;
}

export function ChatInput({ sessionId, onSendMessage, onLiveTranscript, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const liveSocketRef = useRef<WebSocket | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const liveAudioContextRef = useRef<AudioContext | null>(null);
  const liveSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const liveProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const liveSilentGainRef = useRef<GainNode | null>(null);
  const livePlayingSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const livePlaybackCursorRef = useRef(0);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
    const windowWithSpeech = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    return windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition || null;
  };

  const base64ToBytes = (base64Data: string): Uint8Array => {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const floatToPCM16Base64 = (floatData: Float32Array): string => {
    const pcm = new Int16Array(floatData.length);
    for (let i = 0; i < floatData.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, floatData[i]));
      pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    const pcmBytes = new Uint8Array(pcm.buffer);
    let binary = '';
    for (let i = 0; i < pcmBytes.length; i += 1) {
      binary += String.fromCharCode(pcmBytes[i]);
    }
    return btoa(binary);
  };

  const playPcm16Chunk = async (base64Data: string, sampleRate = 24000) => {
    const audioContext = liveAudioContextRef.current ?? new AudioContext();
    if (!liveAudioContextRef.current) {
      liveAudioContextRef.current = audioContext;
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const pcmBytes = base64ToBytes(base64Data);
    const sampleCount = Math.floor(pcmBytes.length / 2);
    const audioBuffer = audioContext.createBuffer(1, sampleCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < sampleCount; i += 1) {
      const low = pcmBytes[i * 2];
      const high = pcmBytes[i * 2 + 1];
      let sample = (high << 8) | low;
      if (sample >= 0x8000) {
        sample -= 0x10000;
      }
      channelData[i] = sample / 32768;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    livePlayingSourcesRef.current.push(source);

    source.onended = () => {
      livePlayingSourcesRef.current = livePlayingSourcesRef.current.filter(
        (candidate) => candidate !== source
      );
    };

    const now = audioContext.currentTime;
    if (livePlaybackCursorRef.current < now) {
      livePlaybackCursorRef.current = now;
    }

    source.start(livePlaybackCursorRef.current);
    livePlaybackCursorRef.current += audioBuffer.duration;
  };

  const interruptLivePlayback = () => {
    const sources = livePlayingSourcesRef.current;
    sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Ignore sources that already ended.
      }
      try {
        source.disconnect();
      } catch {
        // Ignore disconnect failures after stop.
      }
    });

    livePlayingSourcesRef.current = [];
    livePlaybackCursorRef.current = 0;
  };

  const sendLiveExitSequence = async () => {
    const liveSocket = liveSocketRef.current;
    if (!liveSocket || liveSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      liveSocket.send(
        JSON.stringify({
          type: 'end_turn',
        })
      );
      await Promise.resolve();
    } catch (error) {
      console.error('Failed to send Live exit sequence:', error);
    }
  };

  const cleanupLiveResources = async () => {
    const speechRecognition = speechRecognitionRef.current;
    if (speechRecognition) {
      speechRecognition.stop();
      speechRecognitionRef.current = null;
    }

    const liveSocket = liveSocketRef.current;
    if (liveSocket) {
      liveSocket.onopen = null;
      liveSocket.onmessage = null;
      liveSocket.onerror = null;
      liveSocket.onclose = null;
      if (liveSocket.readyState === WebSocket.OPEN || liveSocket.readyState === WebSocket.CONNECTING) {
        liveSocket.close();
      }
      liveSocketRef.current = null;
    }

    if (liveProcessorRef.current) {
      liveProcessorRef.current.onaudioprocess = null;
      liveProcessorRef.current.disconnect();
      liveProcessorRef.current = null;
    }

    if (liveSourceRef.current) {
      liveSourceRef.current.disconnect();
      liveSourceRef.current = null;
    }

    if (liveSilentGainRef.current) {
      liveSilentGainRef.current.disconnect();
      liveSilentGainRef.current = null;
    }

    interruptLivePlayback();

    const liveStream = liveStreamRef.current;
    if (liveStream) {
      liveStream.getTracks().forEach(track => track.stop());
      liveStreamRef.current = null;
    }

    const audioContext = liveAudioContextRef.current;
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close();
      liveAudioContextRef.current = null;
    }

    livePlaybackCursorRef.current = 0;
    setIsLiveActive(false);
    setIsLiveConnecting(false);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalTranscript = '';
      let hasAnyTranscript = false;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (transcript) {
          hasAnyTranscript = true;
        }
        if (result.isFinal) {
          finalTranscript += `${transcript} `;
        }
      }

      if (hasAnyTranscript) {
        interruptLivePlayback();
      }

      const spokenText = finalTranscript.trim();
      if (spokenText) {
        onLiveTranscript?.('user', spokenText);

        // Also forward live transcript text to the backend over the live websocket
        const liveSocket = liveSocketRef.current;
        if (liveSocket && liveSocket.readyState === WebSocket.OPEN) {
          try {
            liveSocket.send(
              JSON.stringify({ type: 'text', text: spokenText })
            );
          } catch (err) {
            // ignore send errors
          }
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error && event.error !== 'no-speech' && event.error !== 'aborted' && event.error !== 'network') {
        setLiveError(`Live-Transkription fehlgeschlagen: ${event.error}`);
      }
    };

    recognition.start();
    speechRecognitionRef.current = recognition;
  };

  const startLiveSession = async () => {
    if (isTranscribing || isRecording || isLiveActive || isLiveConnecting) {
      return;
    }

    setLiveError(null);
    setIsLiveConnecting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const audioContext = new AudioContext({ sampleRate: 16000 });
      await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioContext.destination);

      const ws = new WebSocket(apiClient.getLiveWebSocketUrl(sessionId));

      ws.onopen = () => {
        console.log('WebSocket connected to:', apiClient.getLiveWebSocketUrl(sessionId));
        setIsLiveActive(true);
        setIsLiveConnecting(false);
        startSpeechRecognition();
      };

      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const payload = JSON.parse(String(event.data)) as LiveServerMessage;
          console.log('Parsed payload:', payload);

          if (payload.type === 'model_text' && payload.text) {
            console.log('Received model_text:', payload.text);
            onLiveTranscript?.('assistant', payload.text);
          }

          if (payload.type === 'user_text' && payload.text) {
            console.log('Received user_text:', payload.text);
            onLiveTranscript?.('user', payload.text);
          }

          if (payload.type === 'model_audio' && payload.data) {
            console.log('Received model_audio, playing chunk:', payload.data.substring(0, 50));
            void playPcm16Chunk(payload.data);
          }

          if (payload.error) {
            console.log('Received error:', payload.error);
            setLiveError(payload.detail || payload.error);
          }
        } catch (err) {
          console.error('Error parsing websocket message:', err);
        }
      };

      ws.onerror = () => {
        console.error('WebSocket error occurred');
        setLiveError('Live-Verbindung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        void cleanupLiveResources();
      };

      processor.onaudioprocess = (event) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const channelData = event.inputBuffer.getChannelData(0);
        const base64Audio = floatToPCM16Base64(channelData);
        ws.send(
          JSON.stringify({
            type: 'audio',
            data: base64Audio,
            mime_type: 'audio/pcm',
          })
        );
      };

      liveSocketRef.current = ws;
      liveStreamRef.current = stream;
      liveAudioContextRef.current = audioContext;
      liveSourceRef.current = source;
      liveProcessorRef.current = processor;
      liveSilentGainRef.current = silentGain;
    } catch (error) {
      console.error('Error starting live session:', error);
      setLiveError('Live-Modus konnte nicht gestartet werden. Bitte prüfen Sie den Mikrofonzugriff.');
      setIsLiveConnecting(false);
      await cleanupLiveResources();
    }
  };

  const stopLiveSession = async () => {
    await sendLiveExitSequence();
    await cleanupLiveResources();
  };

  useEffect(() => {
    return () => {
      void cleanupLiveResources();
    };
  }, []);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    // If live session is active, send text over the live websocket instead of REST /api/chat
    const liveSocket = liveSocketRef.current;
    if (liveSocket && liveSocket.readyState === WebSocket.OPEN) {
      try {
        liveSocket.send(JSON.stringify({ type: 'text', text: trimmed }));
        onLiveTranscript?.('user', trimmed);
      } catch (err) {
        console.error('Failed to send live text message:', err);
      }
      setMessage('');
      return;
    }

    // Fallback: use regular REST send via parent handler
    onSendMessage(message);
    setMessage('');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startRecording = async () => {
    setRecordingError(null);
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Only transcribe if we have data
        if (audioBlob.size > 0) {
          setIsTranscribing(true);
          
          try {
            const transcribedText = await apiClient.transcribeAudio(audioBlob);
            
            // Set transcribed text in input field
            setMessage(transcribedText);

            // If live is active, forward transcribed text immediately via live websocket
            const liveSocket = liveSocketRef.current;
            if (liveSocket && liveSocket.readyState === WebSocket.OPEN) {
              try {
                liveSocket.send(JSON.stringify({ type: 'text', text: transcribedText }));
                onLiveTranscript?.('user', transcribedText);
                setMessage('');
              } catch (err) {
                console.error('Failed to send live transcription:', err);
                // Keep the transcribed text in the field if send fails
              }
            } else {
              // Live not active, just set the message field
              setMessage(transcribedText);
            }
          } catch (error) {
            console.error('Transcription error:', error);
            setRecordingError('Transkription fehlgeschlagen. Bitte versuchen Sie es erneut.');
          } finally {
            setIsTranscribing(false);
          }
        }
        
        audioChunksRef.current = [];
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingError('Mikrofon-Zugriff verweigert. Bitte erlauben Sie den Mikrofon-Zugriff in Ihren Browser-Einstellungen.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (!disabled && !isTranscribing && !isLiveActive && !isLiveConnecting) {
      startRecording();
    }
  };

  const handleLiveClick = () => {
    if (isLiveActive || isLiveConnecting) {
      void stopLiveSession();
    } else {
      void startLiveSession();
    }
  };

  return (
    <Paper 
      elevation={3}
      sx={{ 
        borderTop: 1,
        borderColor: 'divider',
        p: 2,
        backgroundColor: 'background.paper'
      }}
    >
      {recordingError && (
        <Alert severity="error" onClose={() => setRecordingError(null)} sx={{ mb: 2 }}>
          {recordingError}
        </Alert>
      )}

      {liveError && (
        <Alert severity="error" onClose={() => setLiveError(null)} sx={{ mb: 2 }}>
          {liveError}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Chip
          icon={isLiveActive ? <FiberManualRecord fontSize="small" /> : <RecordVoiceOver fontSize="small" />}
          label={
            isLiveConnecting
              ? 'Live verbindet...'
              : isLiveActive
                ? 'Live aktiv: Transcript wird mitgeschrieben'
                : 'Live aus'
          }
          color={isLiveActive ? 'success' : 'default'}
          variant={isLiveActive ? 'filled' : 'outlined'}
          size="small"
        />
      </Box>

      {isLiveActive && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Live-Modus aktiv: Sie können jederzeit dazwischen sprechen. Ihre neue Stimme unterbricht die aktuelle Gemini-Antwort lokal im Browser.
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          multiline
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            isRecording 
              ? "Aufnahme läuft... Erneut klicken zum Stoppen" 
              : isLiveActive
                ? "Live-Modus aktiv: sprechen Sie ins Mikrofon oder tippen Sie eine Nachricht..."
              : isTranscribing 
                ? "Transkribiere..." 
                : "Geben Sie Ihre Frage ein oder klicken Sie auf das Mikrofon..."
          }
          disabled={disabled || isRecording || isTranscribing || isLiveConnecting}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'background.default',
            }
          }}
        />

        {/* Live Mode Button */}
        <IconButton
          onClick={handleLiveClick}
          disabled={isTranscribing || isRecording}
          sx={{
            height: 56,
            width: 56,
            bgcolor: isLiveActive ? 'success.main' : 'grey.300',
            color: 'white',
            '&:hover': {
              bgcolor: isLiveActive ? 'success.dark' : 'grey.400',
            },
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled',
            },
          }}
        >
          {isLiveConnecting ? <CircularProgress size={24} color="inherit" /> : <RecordVoiceOver />}
        </IconButton>
        
        {/* Microphone Button */}
        <IconButton
          onClick={handleMicClick}
          disabled={disabled || isTranscribing || isLiveActive || isLiveConnecting}
          sx={{
            height: 56,
            width: 56,
            bgcolor: isRecording ? 'error.main' : 'grey.300',
            color: 'white',
            '&:hover': {
              bgcolor: isRecording ? 'error.dark' : 'grey.400',
            },
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled',
            },
            animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none',
            '@keyframes pulse': {
              '0%': {
                boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.7)',
              },
              '70%': {
                boxShadow: '0 0 0 10px rgba(244, 67, 54, 0)',
              },
              '100%': {
                boxShadow: '0 0 0 0 rgba(244, 67, 54, 0)',
              },
            },
          }}
        >
          {isTranscribing ? (
            <CircularProgress size={24} color="inherit" />
          ) : isRecording ? (
            <StopCircle />
          ) : (
            <Mic />
          )}
        </IconButton>
        
        {/* Send Button */}
        <IconButton
          color="primary"
          onClick={handleSubmit}
          disabled={!message.trim() || disabled || isRecording || isTranscribing}
          sx={{
            height: 56,
            width: 56,
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled',
            }
          }}
        >
          <Send />
        </IconButton>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
        <Lightbulb sx={{ fontSize: 16, color: 'warning.main' }} />
        <Typography variant="caption" color="text.secondary">
          {isLiveActive
            ? "Live aktiv: Gesprochenes und Gemini-Antworten werden als Transcript im Chat angezeigt"
            : isRecording 
            ? "🎤 Aufnahme läuft... Klicken Sie erneut auf das Mikrofon zum Stoppen"
            : "Tipp: Stellen Sie jeweils nur eine Frage und geben Sie dem Patienten Zeit zu antworten"}
        </Typography>
      </Box>
    </Paper>
  );
}

