import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
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

interface DiagnosticsPanelProps {
  isMobile: boolean;
  visible?: boolean;
  onClose?: () => void;
}

export default function DiagnosticsPanel({
  isMobile,
  visible = false,
  onClose,
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

  useEffect(() => {
    if (sessionCase?.id) {
      fetchAvailableDiagnostics(sessionCase.id);
    }
  }, [sessionCase?.id, fetchAvailableDiagnostics]);

  const handleDiagnosticPress = (diagnosticName: string) => {
    if (sessionCase?.id && sessionId) {
      fetchDiagnosticResult(sessionCase.id, diagnosticName, sessionId);
    }
  };

  const renderDiagnosticValue = (val: DiagnosticValue) => {
    //--------------IMAGE----------------
    if (val.data_type.startsWith('image/') && val.data?.data) {
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

  const PanelContent = () => (
    <View style={styles.content}>
      {!isMobile && (
        <View>
          <Text variant="titleMedium" style={styles.title}>
            Diagnostik
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.secondary, marginBottom: 16 }}>
            Wählen Sie eine Diagnostik, um die Werte abzurufen.
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

            return (
              <View key={diag.name} style={styles.diagRow}>
                <Button
                  mode={isLoaded ? 'contained-tonal' : 'outlined'}
                  onPress={() => handleDiagnosticPress(diag.name)}
                  style={styles.diagButton}
                  disabled={isLoaded || isLoading}
                  loading={isLoading}
                  textColor={
                    theme.dark
                      ? '#FFFFFF'
                      : isLoaded
                        ? theme.colors.onPrimary
                        : theme.colors.primary
                  }
                >
                  {diag.display_name}
                </Button>
                {isLoaded && diagnosticResults[diag.name].data && (
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
          {availableDiagnostics.length === 0 && !loadingAvailable && (
            <View>
              <Text
                variant="bodyMedium"
                style={{ textAlign: 'center', marginTop: 20, opacity: 0.6 }}
              >
                Keine Diagnostik für diesen Fall verfügbar.
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
          <PanelContent />
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
      <PanelContent />
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
    maxHeight: '80%',
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
