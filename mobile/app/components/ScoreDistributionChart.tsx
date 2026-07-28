import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import Svg, { Rect, G, Text as SvgText, Line, Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';

interface ScoreDistributionChartProps {
  records: any[];
}

export const ScoreDistributionChart: React.FC<ScoreDistributionChartProps> = ({ records }) => {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);

  // Process data into 5 buckets
  const buckets = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // 0-1, 1-2, 2-3, 3-4, 4-5
    
    records.forEach((record) => {
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
      if (avgScore > 0) {
        if (avgScore <= 1) counts[0]++;
        else if (avgScore <= 2) counts[1]++;
        else if (avgScore <= 3) counts[2]++;
        else if (avgScore <= 4) counts[3]++;
        else counts[4]++;
      }
    });

    return [
      { label: '0 - 1', count: counts[0], index: 0 },
      { label: '1 - 2', count: counts[1], index: 1 },
      { label: '2 - 3', count: counts[2], index: 2 },
      { label: '3 - 4', count: counts[3], index: 3 },
      { label: '4 - 5', count: counts[4], index: 4 },
    ];
  }, [records]);

  const height = 240;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const graphHeight = height - padding.top - padding.bottom;
  
  // Ensure the scale handles at least 5 so the chart doesn't look weird when empty or low counts
  const maxCount = Math.max(...buckets.map(b => b.count), 5); 

  const renderSvg = (width: number) => {
    const graphWidth = width - padding.left - padding.right;
    const barSpace = graphWidth / buckets.length;
    const barWidth = Math.min(barSpace * 0.7, 60);

    return (
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.colors.secondary} stopOpacity="0.85" />
            <Stop offset="100%" stopColor={theme.colors.secondary} stopOpacity="0.15" />
          </LinearGradient>
        </Defs>

        {/* Y Axis Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const val = Math.round(maxCount * ratio);
          const y = height - padding.bottom - ratio * graphHeight;
          return (
            <G key={`grid-y-${ratio}`}>
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

        {/* Bell Curve Area */}
        {(() => {
          const points = buckets.map((bucket, index) => {
            const x = padding.left + index * barSpace + barSpace / 2;
            const y = height - padding.bottom - (bucket.count / maxCount) * graphHeight;
            return { x, y, count: bucket.count };
          });
          
          const fullPoints = [
            { x: padding.left, y: height - padding.bottom },
            ...points,
            { x: width - padding.right, y: height - padding.bottom }
          ];

          let pathD = `M ${fullPoints[0].x} ${fullPoints[0].y} `;
          for (let i = 1; i < fullPoints.length; i++) {
            const p0 = fullPoints[i-1];
            const p1 = fullPoints[i];
            const cpX = p0.x + (p1.x - p0.x) / 2;
            pathD += `C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y} `;
          }
          
          // To close the path and fill the area:
          const fillPath = pathD + `L ${fullPoints[fullPoints.length - 1].x} ${height - padding.bottom} Z`;

          return (
            <G>
              <Path d={fillPath} fill="url(#distGrad)" />
              <Path d={pathD} fill="none" stroke={theme.colors.secondary} strokeWidth="3" />
              
              {/* X-Axis Labels and Data Points */}
              {points.map((p, index) => {
                const isHovered = hoveredBucket === index;
                return (
                  <G key={`point-${index}`}>
                    {/* X-axis Label */}
                    <SvgText
                      x={p.x}
                      y={height - padding.bottom + 20}
                      fontSize="11"
                      fill={theme.colors.onSurfaceVariant}
                      textAnchor="middle"
                    >
                      {buckets[index].label}
                    </SvgText>

                    {/* Peak Point */}
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 6 : 4}
                      fill={theme.colors.surface}
                      stroke={theme.colors.secondary}
                      strokeWidth="2"
                    />

                    {/* Peak Value (only if count > 0) */}
                    {p.count > 0 && (
                      <SvgText
                        x={p.x}
                        y={p.y - 12}
                        fontSize="12"
                        fontWeight="bold"
                        fill={theme.colors.onSurface}
                        textAnchor="middle"
                      >
                        {p.count}
                      </SvgText>
                    )}
                  </G>
                );
              })}
            </G>
          );
        })()}
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
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
          Score Distribution
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6, lineHeight: 18 }}>
          Visualizes the frequency of overall average scores across all recorded sessions. A left-skewed curve indicates harder cases, while a right-skewed curve indicates higher overall proficiency.
        </Text>
      </View>

      <View
        style={styles.chartWrapper}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {containerWidth > 0 && (
          <>
            {renderSvg(containerWidth)}

            {/* Hover overlays */}
            {buckets.map((bucket, index) => {
              const graphWidth = containerWidth - padding.left - padding.right;
              const barSpace = graphWidth / buckets.length;
              const barWidth = Math.min(barSpace * 0.7, 60);
              const barHeight = (bucket.count / maxCount) * graphHeight;
              const x = padding.left + index * barSpace + (barSpace - barWidth) / 2;
              const y = height - padding.bottom - barHeight;

              return (
                <Pressable
                  key={`pressable-${index}`}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: barWidth,
                    height: barHeight,
                    zIndex: 10,
                  }}
                  // @ts-ignore
                  onHoverIn={() => setHoveredBucket(index)}
                  onHoverOut={() => setHoveredBucket(null)}
                  onPressIn={() => setHoveredBucket(index)}
                  onPressOut={() => setHoveredBucket(null)}
                />
              );
            })}

            {/* Tooltip */}
            {hoveredBucket !== null && (
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
                  Score: {buckets[hoveredBucket].label}
                </Text>
                <Text style={{ color: theme.colors.secondary, fontWeight: '900', fontSize: 16 }}>
                  {buckets[hoveredBucket].count} Sessions
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
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  chartWrapper: {
    width: '100%',
    height: 240,
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
