import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { Surface, Text, useTheme, IconButton } from 'react-native-paper';
import Svg, { Circle, G, Text as SvgText, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

interface SessionData {
  id: string;
  duration: number;
  wordCount: number;
  score: number;
}

interface CorrelationScatterPlotProps {
  records: any[];
}

export const CorrelationScatterPlot: React.FC<CorrelationScatterPlotProps> = ({ records }) => {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<SessionData | null>(null);
  
  // 0 = Duration, 1 = Word Count
  const [xAxisMetric, setXAxisMetric] = useState<0 | 1>(0);

  // Process data
  const data: SessionData[] = useMemo(() => {
    return records
      .map((record) => {
        let totalScore = 0;
        let validCriteria = 0;
        for (let i = 1; i <= 8; i++) {
          const score = Number(record[`criterion${i}_score`]);
          if (!isNaN(score) && score > 0) {
            totalScore += score;
            validCriteria += 1;
          }
        }
        
        const avgScore = validCriteria > 0 ? totalScore / validCriteria : 0;
        const duration = Number(record.duration_minutes) || (Number(record.live_time_used) ? Number(record.live_time_used) / 60 : 0);
        const wordCount = Number(record.user_word_count) || 0;

        return {
          id: String(record.id || Math.random()),
          duration,
          wordCount,
          score: avgScore,
        };
      })
      .filter((d) => d.score > 0 && (xAxisMetric === 0 ? d.duration > 0 : d.wordCount > 0));
  }, [records, xAxisMetric]);

  const height = 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };
  const graphHeight = height - padding.top - padding.bottom;

  const maxX = Math.max(...data.map((d) => (xAxisMetric === 0 ? d.duration : d.wordCount)), 10);
  const maxY = 5; // Max score is 5

  const renderSvg = (width: number) => {
    const graphWidth = width - padding.left - padding.right;

    return (
      <Svg width={width} height={height}>
        {/* Y Axis Grid Lines (Scores 0 to 5) */}
        {[0, 1, 2, 3, 4, 5].map((val) => {
          const y = height - padding.bottom - (val / maxY) * graphHeight;
          return (
            <G key={`grid-y-${val}`}>
              <Line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={theme.colors.outlineVariant}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <SvgText
                x={padding.left - 10}
                y={y + 4}
                fontSize="12"
                fill={theme.colors.onSurfaceVariant}
                textAnchor="end"
              >
                {val}
              </SvgText>
            </G>
          );
        })}

        {/* X Axis Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const val = maxX * ratio;
          const x = padding.left + ratio * graphWidth;
          return (
            <G key={`grid-x-${ratio}`}>
              <SvgText
                x={x}
                y={height - padding.bottom + 20}
                fontSize="10"
                fill={theme.colors.onSurfaceVariant}
                textAnchor="middle"
              >
                {xAxisMetric === 0 ? val.toFixed(1) + 'm' : Math.round(val)}
              </SvgText>
            </G>
          );
        })}

        {/* Data Points */}
        {data.map((item) => {
          const xVal = xAxisMetric === 0 ? item.duration : item.wordCount;
          const x = padding.left + (xVal / maxX) * graphWidth;
          const y = height - padding.bottom - (item.score / maxY) * graphHeight;
          const isHovered = hoveredPoint?.id === item.id;

          return (
            <Circle
              key={item.id}
              cx={x}
              cy={y}
              r={isHovered ? 8 : 5}
              fill={isHovered ? theme.colors.error : theme.colors.primary}
              opacity={isHovered ? 1 : 0.65}
            />
          );
        })}
      </Svg>
    );
  };

  return (
    <Surface
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
      ]}
      elevation={2}
    >
      <View style={styles.header}>
        <View>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            Performance Correlation
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Score vs. {xAxisMetric === 0 ? 'Session Duration' : 'Word Count'}
          </Text>
        </View>
        <IconButton
          icon="swap-horizontal"
          mode="contained-tonal"
          size={20}
          onPress={() => setXAxisMetric(xAxisMetric === 0 ? 1 : 0)}
          tooltip="Toggle X-Axis Metric"
        />
      </View>

      <View
        style={styles.chartWrapper}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {containerWidth > 0 && (
          <>
            {renderSvg(containerWidth)}

            {/* Hover overlays */}
            {data.map((item) => {
              const graphWidth = containerWidth - padding.left - padding.right;
              const xVal = xAxisMetric === 0 ? item.duration : item.wordCount;
              const x = padding.left + (xVal / maxX) * graphWidth;
              const y = height - padding.bottom - (item.score / maxY) * graphHeight;

              return (
                <Pressable
                  key={`pressable-${item.id}`}
                  style={{
                    position: 'absolute',
                    left: x - 15,
                    top: y - 15,
                    width: 30,
                    height: 30,
                    zIndex: 10,
                  }}
                  // @ts-ignore
                  onHoverIn={() => setHoveredPoint(item)}
                  onHoverOut={() => setHoveredPoint(null)}
                  onPressIn={() => setHoveredPoint(item)}
                  onPressOut={() => setHoveredPoint(null)}
                />
              );
            })}

            {/* Tooltip */}
            {hoveredPoint && (
              <View
                style={[
                  styles.tooltip,
                  {
                    backgroundColor: theme.colors.elevation.level3,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
              >
                <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface, marginBottom: 4 }}>
                  Session Detail
                </Text>
                <Text style={{ color: theme.colors.primary, fontWeight: '900', fontSize: 16 }}>
                  Score: {hoveredPoint.score.toFixed(2)}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                  {xAxisMetric === 0
                    ? `Duration: ${hoveredPoint.duration.toFixed(1)} mins`
                    : `Words: ${hoveredPoint.wordCount}`}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 24,
    paddingVertical: 16,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  chartWrapper: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    top: 10,
    right: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    zIndex: 20,
    pointerEvents: 'none',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    minWidth: 140,
  },
});
