import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';
import { API_BASE_URL, getAccessToken } from '@/lib/auth';
import { Platform } from 'react-native';

function buildWsUrl(sessionId: string) {
  const base = API_BASE_URL;
  if (base.startsWith('https://'))
    return base.replace('https://', 'wss://') + `/api/live/${encodeURIComponent(sessionId)}/ws`;
  if (base.startsWith('http://'))
    return base.replace('http://', 'ws://') + `/api/live/${encodeURIComponent(sessionId)}/ws`;
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playingSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playbackCursorRef = useRef(0);
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buffer to hold incoming chunks until they are large enough to play seamlessly
  const playbackBufferRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    if (Platform.OS === 'web') {
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
    } else {
      LiveAudioStream.stop();
      await stopAndUnloadCurrentSound();
      playbackBufferRef.current = [];
      isPlayingRef.current = false;
    }
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
      if (Platform.OS !== 'web') {
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
      } else {
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
        audioContextRef.current = audioContext;
        processorRef.current = processor;
        sourceRef.current = source;
        streamRef.current = stream;
      }

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
        if (Platform.OS !== 'web') {
          LiveAudioStream.start();
        }
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
            if (Platform.OS === 'web') {
              playPcm16Chunk(payload.data).catch(console.error);
            } else {
              playBufferedAudio(false);
            }
          }

          if (payload.type === 'turn_complete' || payload.type === 'model_turn_end') {
            isReceivingRef.current = false;
            // Force play whatever is left in the buffer, even if it's tiny
            if (Platform.OS !== 'web') {
              playBufferedAudio(true);
            }
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
      if (Platform.OS === 'web') {
        const processor = processorRef.current!;
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
            }),
          );
        };
      } else {
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
      }
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
