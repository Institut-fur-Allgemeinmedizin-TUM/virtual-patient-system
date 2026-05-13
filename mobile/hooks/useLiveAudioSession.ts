import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';
import { API_BASE_URL, getAccessToken } from '@/lib/auth';

function buildWsUrl(sessionId: string) {
  const base = API_BASE_URL;
  if (base.startsWith('https://'))
    return base.replace('https://', 'wss://') + `/api/live/${encodeURIComponent(sessionId)}/ws`;
  if (base.startsWith('http://'))
    return base.replace('http://', 'ws://') + `/api/live/${encodeURIComponent(sessionId)}/ws`;
  return `${base}/api/live/${encodeURIComponent(sessionId)}/ws`;
}
// Utility to create a WAV header for raw PCM data so expo-av can play it
function createWavHeader(dataLength: number, sampleRate: number = 24000) {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  return new Uint8Array(buffer);
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
  onTranscript?: (role: 'user' | 'assistant', text: string) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buffer to hold incoming chunks until they are large enough to play seamlessly
  const playbackBufferRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const currentSoundRef = useRef<Audio.Sound | null>(null);

  const stopAndUnloadCurrentSound = async () => {
    const sound = currentSoundRef.current;
    if (!sound) return;

    currentSoundRef.current = null;
    sound.setOnPlaybackStatusUpdate(null);

    try {
      await sound.stopAsync();
    } catch {
      // Ignore stop errors for already-stopped/unloaded sounds.
    }

    try {
      await sound.unloadAsync();
    } catch {
      // Ignore unload errors; cleanup should be best-effort.
    }
  };

  const cleanup = async () => {
    Speech.stop();
    LiveAudioStream.stop();
    await stopAndUnloadCurrentSound();
    playbackBufferRef.current = [];
    isPlayingRef.current = false;
  };

  const MIN_CHUNKS_TO_PLAY = 20;
  const isReceivingRef = useRef(false);

  // Playback logic using expo-av Data URIs
  const playBufferedAudio = async (forcePlay = false) => {
    if (isPlayingRef.current || playbackBufferRef.current.length === 0) return;
    if (!forcePlay && playbackBufferRef.current.length < MIN_CHUNKS_TO_PLAY) {
      return;
    }
    isPlayingRef.current = true;

    try {
      // Grab ALL currently buffered chunks at once
      const chunksToPlay = [...playbackBufferRef.current];
      playbackBufferRef.current = []; // Clear buffer immediately for next incoming chunks

      const combinedBase64 = chunksToPlay.join('');
      const pcmBuffer = Buffer.from(combinedBase64, 'base64');

      const wavHeader = createWavHeader(pcmBuffer.length, 24000);
      const wavData = new Uint8Array(wavHeader.length + pcmBuffer.length);
      wavData.set(wavHeader);
      wavData.set(new Uint8Array(pcmBuffer), wavHeader.length);

      const wavBase64 = Buffer.from(wavData).toString('base64');
      const uri = `data:audio/wav;base64,${wavBase64}`;

      const { sound } = await Audio.Sound.createAsync({ uri });
      currentSoundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.setOnPlaybackStatusUpdate(null);
          sound
            .unloadAsync()
            .then(() => {
              if (currentSoundRef.current === sound) {
                currentSoundRef.current = null;
              }
              isPlayingRef.current = false;

              // As soon as this large chunk finishes, immediately check if more arrived
              // We use forcePlay = true here so it doesn't wait for MIN_CHUNKS if it's lagging behind
              playBufferedAudio(true);
            })
            .catch(() => {
              if (currentSoundRef.current === sound) {
                currentSoundRef.current = null;
              }
              setError('Fehler beim Abspielen des Audios');
              isPlayingRef.current = false;
            });
        }
      });

      await sound.playAsync();
    } catch (err) {
      console.error('Playback error:', err);
      isPlayingRef.current = false;
    }
  };

  const startLiveAudio = async () => {
    if (!sessionId || isActive || isConnecting) return;

    setError(null);
    setIsConnecting(true);

    try {
      // 1. Request Android Microphone Permissions via Expo
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      // 2. Configure Native Audio Stream (16kHz, 1 channel, 16-bit PCM)
      LiveAudioStream.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6, // 6 = VOICE_RECOGNITION (Optimized for speech on Android)
        bufferSize: 4096,
        wavFile: 'audio.wav',
      });

      // 3. Connect WebSocket
      const wsUrl = buildWsUrl(sessionId);
      const token = await getAccessToken();
      const url = token ? `${wsUrl}?access_token=${encodeURIComponent(token)}` : wsUrl;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsActive(true);
        setIsConnecting(false);
        // Start recording immediately when WS opens
        LiveAudioStream.start();
      };

      ws.onmessage = (event) => {
        try {
          const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

          if (payload.type === 'model_text' && payload.text) {
            onTranscript?.('assistant', payload.text);
          }

          if (payload.type === 'user_text' && payload.text) {
            onTranscript?.('user', payload.text);
          }

          if (payload.type === 'model_audio' && payload.data) {
            // Buffer the incoming base64 string
            isReceivingRef.current = true;
            playbackBufferRef.current.push(payload.data);
            playBufferedAudio(false);
          }

          if (payload.type === 'turn_complete' || payload.type === 'model_turn_end') {
            isReceivingRef.current = false;
            // Force play whatever is left in the buffer, even if it's tiny
            playBufferedAudio(true);
          }

          if (payload.error) {
            setError(payload.detail || payload.error);
          }
        } catch (err) {
          console.error('WS message parse error', err);
        }
      };

      ws.onerror = () => {
        setError('Live-Verbindung fehlgeschlagen');
        void stopLiveAudio();
      };

      ws.onclose = () => {
        void stopLiveAudio();
      };

      // 4. Send mic chunks to server
      LiveAudioStream.on('data', (base64Audio) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'audio',
              data: base64Audio,
              mime_type: 'audio/pcm',
            }),
          );
        }
      });
    } catch (err) {
      console.error('Failed to start live audio', err);
      setError('Live-Modus konnte nicht gestartet werden');
      setIsConnecting(false);
      await cleanup();
    }
  };

  const stopLiveAudio = async () => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'end_turn' }));
      }
      wsRef.current.close();
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

  return { isActive, isConnecting, error, start: startLiveAudio, stop: stopLiveAudio } as const;
}
