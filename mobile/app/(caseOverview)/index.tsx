import { useEffect } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { useCasesStore } from '@/stores/useCasesStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { router } from 'expo-router';
import { getCaseImage } from '@/lib/cases/case';

export default function HomeScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cases = useCasesStore((state) => state.cases);
  const loadAndGetCases = useCasesStore((state) => state.loadAndGetCases);
  const startCase = useSessionStore((state) => state.startSession);

  useEffect(() => {
    loadAndGetCases();
  }, [loadAndGetCases]);

  const horizontalPadding = 16;
  const columnGap = 12;
  const columns = width >= 1100 ? 4 : width >= 780 ? 3 : width >= 520 ? 2 : 1;
  const cardWidth =
    columns === 1
      ? width - horizontalPadding * 2
      : (width - horizontalPadding * 2 - columnGap * (columns - 1)) / columns;

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={cases}
      key={columns}
      numColumns={columns}
      keyExtractor={(item) => item.id}
      columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
      renderItem={({ item }) => (
        <View
          style={[
            styles.cardShell,
            { width: cardWidth },
            columns === 1 ? styles.fullWidthCard : null,
          ]}
        >
          <Card
            mode="elevated"
            style={styles.card}
            onPress={async () => {
              const sessionId = await startCase(item.id, item);
              if (sessionId) {
                //Navigate to session screen with sessionId
                router.push(`/session/${sessionId}`);
              }
            }}
          >
            <Image
              source={getCaseImage(item.imageName)}
              style={styles.cardImage}
              contentFit="cover"
            />
            <Card.Content style={styles.contentPadding}>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {item.title}
              </Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.patientName}, {item.patientAge} Jahre, {item.patientOccupation}
              </Text>
            </Card.Content>
            <Card.Actions style={styles.fullWidthActions}>
              <Button
                mode="contained"
                onPress={async () => {
                  const sessionId = await startCase(item.id, item);
                  if (sessionId) {
                    //Navigate to session screen with sessionId
                    router.push(`/session/${sessionId}`);
                  }
                }}
                icon="play"
                style={styles.fullWidthButton}
                contentStyle={styles.buttonHeight}
                labelStyle={styles.buttonLabel}
              >
                Fall starten
              </Button>
            </Card.Actions>
          </Card>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  header: {
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontWeight: '700',
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  columnWrapper: {
    gap: 12,
  },
  cardShell: {
    flexGrow: 0,
    minWidth: 0,
  },
  fullWidthCard: {
    flexBasis: '100%',
  },
  card: {
    height: '100%',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1.1,
    backgroundColor: '#E8E8E8',
  },
  cardTitle: {
    marginTop: 6,
    marginBottom: 8,
    fontWeight: '700',
    fontSize: 22,
  },
  emptyCard: {
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 24,
  },
  contentPadding: {
    paddingBottom: 16,
  },
  fullWidthActions: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
    marginHorizontal: 0,
  },
  fullWidthButton: {
    width: '100%',
    borderRadius: 0,
    margin: 0,
  },
  buttonHeight: {
    height: 52,
    flexDirection: 'row-reverse',
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
});
