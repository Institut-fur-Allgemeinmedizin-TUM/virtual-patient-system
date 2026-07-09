import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Modal, Portal, useTheme, Text } from 'react-native-paper';
import { useLeaderboardStore } from '@/stores/useLeaderboardStore';
import { useAuthStore } from '@/stores/useAuthStore';

interface LeaderboardModalProps {
  visible: boolean;
  caseId: string | null;
  onClose: () => void;
}

export default function LeaderboardModal({ visible, caseId, onClose }: LeaderboardModalProps) {
  const theme = useTheme();
  const { leaderboardData, isLeaderboardLoading, fetchLeaderboard, clearLeaderboard } =
    useLeaderboardStore();
  const preferredUsername = useAuthStore((state) => state.user?.display_name);

  // Fetch data inside the modal when visibility changes or caseId changes
  useEffect(() => {
    if (visible && caseId) {
      fetchLeaderboard(caseId);
    } else if (!visible) {
      clearLeaderboard();
    }
  }, [visible, caseId, fetchLeaderboard, clearLeaderboard]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[
          styles.leaderboardModalContent,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text variant="headlineSmall" style={{ marginBottom: 16 }}>
          Leaderboard
        </Text>
        {isLeaderboardLoading ? (
          <ActivityIndicator animating={true} color={theme.colors.primary} />
        ) : (
          leaderboardData.map((leaderboardEntry) => {
            const isCurrentUser = leaderboardEntry.username === preferredUsername;
            return (
              <View
                key={leaderboardEntry.username}
                style={[
                  styles.leaderboardRow,
                  { borderBottomColor: theme.colors.outlineVariant },
                  isCurrentUser && {
                    backgroundColor: theme.colors.primaryContainer,
                    borderRadius: 8,
                  },
                ]}
              >
                <Text style={{ width: 40, fontWeight: '700' }}>#{leaderboardEntry.rank}</Text>
                <Text style={{ flex: 1 }}>{leaderboardEntry.username}</Text>
                <Text style={{ fontWeight: '600' }}>{leaderboardEntry.average_points} / 5 Pts</Text>
              </View>
            );
          })
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  leaderboardModalContent: {
    paddingHorizontal: 12,
    paddingVertical: 24,
    margin: 20,
    borderRadius: 12,
    maxWidth: 500,
    width: '90%',
    alignSelf: 'center',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
});
