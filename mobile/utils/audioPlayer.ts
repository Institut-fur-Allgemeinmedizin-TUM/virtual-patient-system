import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

let currentSound: Audio.Sound | null = null;

export const playAudioFile = async (
  base64Data: string,
  mimeType: string = 'audio/mpeg',
  onFinished?: () => void,
) => {
  try {
    if (currentSound) {
      await currentSound.unloadAsync();
      currentSound = null;
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    let uri = '';

    if (Platform.OS === 'web') {
      uri = `data:${mimeType};base64,${base64Data}`;
    } else {
      // Buffer the audio file on disk for Android/iOS for better playback
      const filename = `temp_audio_${Date.now()}.mp3`; // Fallback to mp3 extension
      uri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(uri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
    currentSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        if (status.didJustFinish) {
          sound.unloadAsync();
          if (currentSound === sound) {
            currentSound = null;
          }
          if (onFinished) {
            onFinished();
          }
        }
      } else if (status.error) {
        console.error('Audio playback error:', status.error);
        if (onFinished) {
          onFinished();
        }
      }
    });

    return sound;
  } catch (error) {
    console.error('Error playing audio', error);
    throw error;
  }
};

export const stopAudioFile = async () => {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (e) {
      console.error('Error stopping audio', e);
    }
    currentSound = null;
  }
};
