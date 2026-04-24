import { useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Card, Text, useTheme } from 'react-native-paper';
import { useCasesStore } from '@/stores/useCasesStore';

const caseImages: Record<string, number> = {
  'emin_yilmaz.png': require('@/assets/images/patients/emin_yilmaz.png'),
  'johann_huber.png': require('@/assets/images/patients/johann_huber.png'),
  'karin_seidel.png': require('@/assets/images/patients/karin_seidel.png'),
  'michael_bauer.png': require('@/assets/images/patients/michael_bauer.png'),
  'peter_lenz.png': require('@/assets/images/patients/peter_lenz.png'),
  'sandra_mueller.png': require('@/assets/images/patients/sandra_mueller.png'),
  'thomas_friedrich.png': require('@/assets/images/patients/thomas_friedrich.png'),
};

const getCaseImage = (imageName: string) => caseImages[imageName] ?? require('@/assets/images/react-logo.png');

export default function HomeScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cases = useCasesStore((state) => state.cases);
  const loaded = useCasesStore((state) => state.loaded);
  const loadAndGetCases = useCasesStore((state) => state.loadAndGetCases);

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
        <View style={[styles.cardShell, { width: cardWidth }, columns === 1 ? styles.fullWidthCard : null]}>
          <Card mode="elevated" style={styles.card}>
            <Image
              source={getCaseImage(item.imageName)}
              style={styles.cardImage}
              contentFit="contain"
            />
            <Card.Content>
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                Case {item.id} {item.patientName} {item.imageName}
              </Text>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Placeholder title
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Placeholder text describing the case content and next action.
              </Text>
            </Card.Content>
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
    aspectRatio: 1,
    backgroundColor: '#E8E8E8',
  },
  cardTitle: {
    marginTop: 6,
    marginBottom: 8,
  },
  emptyCard: {
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 24,
  },
});
