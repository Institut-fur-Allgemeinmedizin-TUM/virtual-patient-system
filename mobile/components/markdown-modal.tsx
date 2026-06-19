import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Divider, Modal, Portal, useTheme } from 'react-native-paper';
import Markdown from 'react-native-markdown-display';

interface MarkdownModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  content: string;
}

export function MarkdownModal({ visible, onDismiss, title, content }: MarkdownModalProps) {
  const { colors } = useTheme();

  // Markdown styling using react-native-markdown-display
  const markdownStyles = {
    heading1: {
      fontSize: 24,
      color: colors.onSurface,
      fontWeight: 'bold' as const,

      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant,
      paddingBottom: 6,
      marginTop: 18,
      marginBottom: 12,
    },
    heading2: {
      color: colors.onSurfaceVariant,
      fontSize: 20,
      fontWeight: 'bold' as const,
      marginTop: 14,
      marginBottom: 10,

      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant,
    },
    heading3: {
      color: colors.onSurfaceVariant,
      fontSize: 18,
      fontWeight: 'bold' as const,
      marginTop: 12,
      marginBottom: 8,
    },
    paragraph: {
      marginBottom: 12,
      color: colors.onSurface,
      fontSize: 14,
    },
    link: {
      color: '#0e396e',
      textDecorationLine: 'underline',
    },
    body: {
      color: colors.onSurface,
      fontSize: 14,
    },

    table: {
      borderWidth: 0, // Removes the outer box outline
      marginVertical: 16,
      width: '100%',
    },
    tr: {
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant, // Light divider line
      paddingVertical: 5,
      flexDirection: 'row' as const,
    },
    th: {
      padding: 8,
      fontWeight: 'bold' as const,
      color: colors.onSurface,
      backgroundColor: 'transparent', // Removes dark header backgrounds
      flex: 1,
    },
    td: {
      padding: 8,
      color: colors.onSurfaceVariant, // Slightly lighter text for descriptions
      flex: 2, // Gives descriptions more horizontal breathing room than the label
    },
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        dismissable
        dismissableBackButton
        contentContainerStyle={[styles.modalContainer, { backgroundColor: colors.surface }]}
      >
        <View style={styles.modalContent}>
          <Appbar.Header elevated={false}>
            <Appbar.Content title={title} />
            <Appbar.Action icon="close" onPress={onDismiss} accessibilityLabel={`Close ${title}`} />
          </Appbar.Header>

          <Divider />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Markdown style={markdownStyles as any}>{content}</Markdown>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 16,
    borderRadius: 8,
    maxHeight: '90%',
    maxWidth: '95%',
    alignSelf: 'center',
  },
  modalContent: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 12,
  },
});
