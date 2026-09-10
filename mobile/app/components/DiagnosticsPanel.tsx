import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import {
  Surface,
  Text,
  Button,
  useTheme,
  IconButton,
  Modal,
  Portal,
  ActivityIndicator,
} from 'react-native-paper';
import ImageModal from 'react-native-image-modal';
import { useDiagnosticStore } from '@/stores/useDiagnosticStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { DiagnosticValue } from '@/services/api';
import { playAudioFile, stopAudioFile } from '@/utils/audioPlayer';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system';
import { Video, ResizeMode } from 'expo-av';

const VideoPlayerComponent = ({
  base64Data,
  mimeType,
}: {
  base64Data: string;
  mimeType: string;
}) => {
  const [uri, setUri] = useState<string | null>(null);
  const videoRef = React.useRef<Video>(null);

  useEffect(() => {
    const prepareVideo = async () => {
      try {
        if (Platform.OS === 'web') {
          setUri(`data:${mimeType};base64,${base64Data}`);
        } else {
          const filename = `temp_video_${Date.now()}.mp4`;
          const localUri = cacheDirectory + filename;
          await writeAsStringAsync(localUri, base64Data, {
            encoding: EncodingType.Base64,
          });
          setUri(localUri);
        }
      } catch (err) {
        console.error('Error preparing video', err);
      }
    };
    prepareVideo();
  }, [base64Data, mimeType]);

  if (!uri) {
    return <ActivityIndicator animating={true} style={{ marginTop: 8, alignSelf: 'flex-start' }} />;
  }

  return (
    <View style={{ width: '100%' }}>
      <Video
        ref={videoRef}
        source={{ uri }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        style={{
          width: '100%',
          height: 200,
          marginTop: 8,
          borderRadius: 8,
          backgroundColor: '#000',
        }}
      />
      <Button
        icon="fullscreen"
        mode="contained-tonal"
        onPress={() => {
          if (videoRef.current) {
            videoRef.current.presentFullscreenPlayer();
          }
        }}
        style={{ marginTop: 8, alignSelf: 'flex-start' }}
      >
        Im Vollbild öffnen
      </Button>
    </View>
  );
};

const AudioPlayerButton = ({ base64Data, mimeType }: { base64Data: string; mimeType: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePress = async () => {
    if (isPlaying) {
      await stopAudioFile();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      await playAudioFile(base64Data, mimeType, () => {
        setIsPlaying(false);
      });
    }
  };

  return (
    <Button
      icon={isPlaying ? 'stop' : 'play'}
      mode="contained-tonal"
      onPress={handlePress}
      style={{ alignSelf: 'flex-start', marginTop: 8 }}
    >
      {isPlaying ? 'Audio stoppen' : 'Audio abspielen'}
    </Button>
  );
};

interface DiagnosticsPanelProps {
  isMobile: boolean;
  visible?: boolean;
  onClose?: () => void;
  readOnly?: boolean;
}

export default function DiagnosticsPanel({
  isMobile,
  visible = false,
  onClose,
  readOnly = false,
}: DiagnosticsPanelProps) {
  const theme = useTheme();
  const { case: sessionCase, sessionId } = useSessionStore();
  const {
    availableDiagnostics,
    diagnosticResults,
    loadingAvailable,
    loadingResults,
    fetchAvailableDiagnostics,
    fetchDiagnosticResult,
  } = useDiagnosticStore();

  const [hiddenDiagnostics, setHiddenDiagnostics] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (sessionCase?.id) {
      fetchAvailableDiagnostics(sessionCase.id);
    }
  }, [sessionCase?.id, fetchAvailableDiagnostics]);

  const handleDiagnosticPress = (diagnosticName: string) => {
    const isLoaded = !!diagnosticResults[diagnosticName];
    if (isLoaded) {
      setHiddenDiagnostics((prev) => ({
        ...prev,
        [diagnosticName]: !prev[diagnosticName],
      }));
    } else if (sessionCase?.id && sessionId) {
      fetchDiagnosticResult(sessionCase.id, diagnosticName, sessionId);
      setHiddenDiagnostics((prev) => ({
        ...prev,
        [diagnosticName]: false,
      }));
    }
  };

  const renderDiagnosticValue = (val: DiagnosticValue) => {
    //--------------AUDIO----------------
    if (val.data_type === 'audio' && val.data?.data) {
      return (
        <View key={val.name} style={styles.valueRow}>
          <Text variant="labelMedium" style={styles.valueLabel}>
            {val.display_name}
          </Text>
          <AudioPlayerButton base64Data={val.data.data} mimeType={val.data.mime || 'audio/mpeg'} />
        </View>
      );
    }
    //--------------VIDEO----------------
    else if (val.data_type === 'video' && val.data?.data) {
      return (
        <View key={val.name} style={styles.valueRow}>
          <Text variant="labelMedium" style={styles.valueLabel}>
            {val.display_name}
          </Text>
          <VideoPlayerComponent
            base64Data={val.data.data}
            mimeType={val.data.mime || 'video/mp4'}
          />
        </View>
      );
    }
    //--------------IMAGE----------------
    else if (val.data_type.startsWith('image/') && val.data?.data) {
      const uri = `data:${val.data.mime || val.data_type};base64,${val.data.data}`;
      return (
        <View key={val.name} style={styles.valueRow}>
          <Text variant="labelMedium" style={styles.valueLabel}>
            {val.display_name}
          </Text>
          <ImageModal source={{ uri: uri }} style={styles.diagnosticImage} resizeMode="contain" />
        </View>
      );
    } else if (
      val.data_type === 'string' ||
      val.data_type === 'integer' ||
      val.data_type === 'float'
    ) {
      return (
        <View key={val.name} style={styles.valueRow}>
          <Text variant="labelMedium" style={styles.valueLabel}>
            {val.display_name}:
          </Text>
          <Text variant="bodyMedium">
            {val.data} {val.unit}
          </Text>
        </View>
      );
    } else {
      return (
        <View key={val.name} style={styles.valueRow}>
          <Text variant="labelMedium" style={styles.valueLabel}>
            {val.display_name}:
          </Text>
          <Text variant="bodyMedium" style={{ fontStyle: 'italic', opacity: 0.7 }}>
            (Nicht darstellbarer Datentyp: {val.data_type})
          </Text>
        </View>
      );
    }
  };

  const renderPanelContent = () => (
      <View style={[styles.content, isMobile && { flex: 0, flexShrink: 1 }]}>
      {!isMobile && (
        <View>
          <Text variant="titleMedium" style={styles.title}>
            Diagnostik
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.secondary, marginBottom: 16 }}>
            Bevor du Laborwerte oder Untersuchungsschritte anforderst: Überlege, welche
            Verdachtsdiagnose oder welche Red Flag du damit prüfst. Wahllos angeforderte Parameter
            kosten in der echten Praxis Zeit, Geld und belasten Patient:innen unnötig (z. B. durch
            falsch-positive Zufallsbefunde) – dies fließt auch hier in die Evaluation mit ein.
          </Text>
        </View>
      )}

      {loadingAvailable ? (
        <ActivityIndicator
          animating={true}
          color={theme.colors.primary}
          style={{ marginTop: 20 }}
        />
      ) : (
        <ScrollView>
          {availableDiagnostics.map((diag) => {
            const isLoaded = !!diagnosticResults[diag.name];
            const isLoading = !!loadingResults[diag.name];

            if (readOnly && !isLoaded) return null;

            return (
              <View key={diag.name} style={styles.diagRow}>
                <Button
                  mode={isLoaded ? 'contained-tonal' : 'outlined'}
                  onPress={() => handleDiagnosticPress(diag.name)}
                  style={styles.diagButton}
                  disabled={isLoading || (!isLoaded && readOnly)}
                  loading={isLoading}
                  icon={
                    isLoaded
                      ? hiddenDiagnostics[diag.name]
                        ? 'chevron-down'
                        : 'chevron-up'
                      : undefined
                  }
                  contentStyle={
                    isLoaded
                      ? { flexDirection: 'row-reverse', justifyContent: 'space-between' }
                      : undefined
                  }
                  textColor={theme.dark ? '#FFFFFF' : isLoaded ? undefined : theme.colors.primary}
                >
                  {diag.display_name}
                </Button>
                {isLoaded && !hiddenDiagnostics[diag.name] && diagnosticResults[diag.name].data && (
                  <View>
                    <Surface
                      style={[
                        styles.resultSurface,
                        { backgroundColor: theme.colors.surfaceVariant },
                      ]}
                      elevation={0}
                    >
                      {diagnosticResults[diag.name].data?.map(renderDiagnosticValue)}
                    </Surface>
                  </View>
                )}
              </View>
            );
          })}
          {availableDiagnostics.filter((diag) => !readOnly || diagnosticResults[diag.name])
            .length === 0 &&
            !loadingAvailable && (
              <View>
                <Text
                  variant="bodyMedium"
                  style={{ textAlign: 'center', marginTop: 20, opacity: 0.6 }}
                >
                  {readOnly
                    ? 'Keine Diagnostik in dieser Sitzung verwendet.'
                    : 'Keine Diagnostik für diesen Fall verfügbar.'}
                </Text>
              </View>
            )}
        </ScrollView>
      )}
    </View>
  );

  if (isMobile) {
    return (
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onClose}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.modalHeader}>
            <Text variant="titleLarge">Diagnostik</Text>
            <IconButton icon="close" onPress={onClose} />
          </View>
          {renderPanelContent()}
        </Modal>
      </Portal>
    );
  }

  return (
    <Surface
      elevation={1}
      style={[
        styles.desktopPanel,
        {
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      {renderPanelContent()}
    </Surface>
  );
}

const styles = StyleSheet.create({
  desktopPanel: {
    width: 300,
    height: '100%',
    borderRadius: 12,
    padding: 16,
    flexShrink: 0,
  },
  modalContainer: {
    margin: 20,
    borderRadius: 12,
    padding: 16,
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
    fontWeight: 'bold',
  },
  diagRow: {
    marginBottom: 16,
  },
  diagButton: {
    marginBottom: 8,
  },
  resultSurface: {
    padding: 12,
    borderRadius: 8,
  },
  valueRow: {
    marginBottom: 8,
  },
  valueLabel: {
    opacity: 0.7,
    marginBottom: 2,
  },
  diagnosticImage: {
    width: 200,
    height: 200,
    borderRadius: 4,
    marginTop: 4,
  },
});
