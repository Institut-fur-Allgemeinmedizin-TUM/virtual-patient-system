import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { API_BASE_URL, getAccessToken } from '@/lib/auth';

function buildWsUrl(sessionId: string) {
  const base = API_BASE_URL;
  if (base.startsWith('https://')) return base.replace('https://', 'wss://') + `/api/live/${encodeURIComponent(sessionId)}/ws`;
  if (base.startsWith('http://')) return base.replace('http://', 'ws://') + `/api/live/${encodeURIComponent(sessionId)}/ws`;
  return `${base}/api/live/${encodeURIComponent(sessionId)}/ws`;
}

function base64ToBytes(base64Data: string): Uint8Array {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function floatToPCM16Base64(floatData: Float32Array): string {
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
}

export function useLiveAudioSession(
  sessionId?: string,
  onTranscript?: (role: 'user' | 'assistant', text: string) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playingSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playbackCursorRef = useRef(0);

  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  //AI Generated
  const playPcm16Chunk = async (base64Data: string, sampleRate = 24000) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

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
    playingSourcesRef.current.push(source);

    source.onended = () => {
      playingSourcesRef.current = playingSourcesRef.current.filter((s) => s !== source);
    };

    const now = audioContext.currentTime;
    if (playbackCursorRef.current < now) {
      playbackCursorRef.current = now;
    }

    source.start(playbackCursorRef.current);
    playbackCursorRef.current += audioBuffer.duration;
  };

  const cleanup = async () => {
    Speech.stop();

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    playingSourcesRef.current = [];
    playbackCursorRef.current = 0;
  };

  const startLiveAudio = async () => {
    if (!sessionId || isActive || isConnecting) return;

    setError(null);
    setIsConnecting(true);

    try {
      // Request microphone (works on web and iOS/Android with Expo)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
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

      // Connect WebSocket
      const wsUrl = buildWsUrl(sessionId);
      const token = await getAccessToken();
      const url = token ? `${wsUrl}?access_token=${encodeURIComponent(token)}` : wsUrl;

      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsActive(true);
        setIsConnecting(false);
      };

      ws.onmessage = (event) => {
        try {
          const payload = typeof event.data === 'string' ? JSON.parse(event.data) : (event.data as any);

          if (payload.type === 'model_text' && payload.text) {
            onTranscript?.('assistant', payload.text);
          }

          if (payload.type === 'user_text' && payload.text) {
            onTranscript?.('user', payload.text);
          }

          if (payload.type === 'model_audio' && payload.data) {
            
            playPcm16Chunk(payload.data).catch(console.error);
          }

          if (payload.error) {
            setError(payload.detail || payload.error);
          }
        } catch (err) {
          console.error('WS message parse error', err);
        }
      };

      ws.onerror = () => {
        console.error('WebSocket error');
        setError('Live-Verbindung fehlgeschlagen');
        void stopLiveAudio();
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        void stopLiveAudio();
      };

      // Stream audio chunks in real-time
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

      wsRef.current = ws;
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;
    } catch (err) {
      console.error('Failed to start live audio', err);
      setError('Live-Modus konnte nicht gestartet werden');
      setIsConnecting(false);
      await cleanup();
    }
  };

  const stopLiveAudio = async () => {
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'end_turn' }));
        }
      } catch {}
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    await cleanup();
    setIsActive(false);
    setIsConnecting(false);
  };

  useEffect(() => {
    return () => {
      void stopLiveAudio();
    };
  }, []);

  return {
    isActive,
    isConnecting,
    error,
    start: startLiveAudio,
    stop: stopLiveAudio,
  } as const;
}
