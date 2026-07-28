import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import Svg, { Polygon, Line, G, Text as SvgText, Circle } from 'react-native-svg';
import { mapEvaluationKeyToLabel } from '@/lib/evaluations';

interface EvaluationRadarChartProps {
  scores: Record<string, number>;
  maxScore?: number;
}

export const EvaluationRadarChart: React.FC<EvaluationRadarChartProps> = ({ scores, maxScore = 5 }) => {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const criteriaCount = 8;
  const data = [];
  for (let i = 1; i <= criteriaCount; i++) {
    const key = `criterion${i}`;
    const rawVal = scores[`avg_${key}_score`];
    const numericVal = typeof rawVal === 'number' ? rawVal : Number(rawVal);
    data.push({
      key,
      label: mapEvaluationKeyToLabel(key),
      value: isNaN(numericVal) ? 0 : numericVal,
    });
  }

  const height = 320;
  
  const renderSvg = (width: number) => {
    const cx = width / 2;
    const cy = height / 2;
    // Allow space for labels
    const radius = Math.min(cx, cy) - 40; 
    
    // Web Grid Levels
    const levels = [1, 2, 3, 4, 5];
    
    // Calculate points for the data polygon
    const polygonPoints = data.map((d, i) => {
      const angle = (Math.PI * 2 * i) / criteriaCount - Math.PI / 2;
      const r = (d.value / maxScore) * radius;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');

    return (
      <Svg width={width} height={height}>
        {/* Background Concentric Webs */}
        {levels.map((level) => {
          const r = (level / maxScore) * radius;
          const points = Array.from({ length: criteriaCount }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / criteriaCount - Math.PI / 2;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
          }).join(' ');
          
          return (
            <Polygon
              key={`web-${level}`}
              points={points}
              fill="none"
              stroke={theme.colors.outlineVariant}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          );
        })}

        {/* Axes and Labels */}
        {data.map((d, i) => {
          const angle = (Math.PI * 2 * i) / criteriaCount - Math.PI / 2;
          const endX = cx + radius * Math.cos(angle);
          const endY = cy + radius * Math.sin(angle);
          
          const labelX = cx + (radius + 20) * Math.cos(angle);
          const labelY = cy + (radius + 20) * Math.sin(angle);
          
          return (
            <G key={`axis-${i}`}>
              <Line
                x1={cx}
                y1={cy}
                x2={endX}
                y2={endY}
                stroke={theme.colors.outlineVariant}
                strokeWidth="1"
              />
              <SvgText
                x={labelX}
                y={labelY + 4}
                fontSize="11"
                fontWeight="bold"
                fill={theme.colors.onSurfaceVariant}
                textAnchor="middle"
              >
                {`C${i + 1}`}
              </SvgText>
            </G>
          );
        })}

        {/* Data Polygon */}
        <Polygon
          points={polygonPoints}
          fill={theme.colors.primary}
          fillOpacity="0.15"
          stroke={theme.colors.primary}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Data Points */}
        {data.map((d, i) => {
          const angle = (Math.PI * 2 * i) / criteriaCount - Math.PI / 2;
          const r = (d.value / maxScore) * radius;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          
          const isHovered = hoveredIndex === i;

          return (
            <Circle
              key={`point-${i}`}
              cx={x}
              cy={y}
              r={isHovered ? 7 : 4}
              fill={theme.colors.primary}
              stroke={theme.colors.surface}
              strokeWidth="1.5"
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
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
          Skills Radar
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 18 }}>
          Comprehensive view of average performance across all 8 criteria. A larger surface area (filling outwards) indicates a stronger overall proficiency profile.
        </Text>
      </View>

      <View
        style={styles.chartWrapper}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {containerWidth > 0 && (
          <>
            {renderSvg(containerWidth)}
            
            {/* Tooltip Overlay Pressables */}
            {data.map((d, i) => {
              const cx = containerWidth / 2;
              const cy = height / 2;
              const radius = Math.min(cx, cy) - 40; 
              const angle = (Math.PI * 2 * i) / criteriaCount - Math.PI / 2;
              
              // Map hover targets to slightly past the center of each axis
              const rHover = radius * 0.75;
              const hoverX = cx + rHover * Math.cos(angle);
              const hoverY = cy + rHover * Math.sin(angle);

              return (
                <Pressable
                  key={`press-${i}`}
                  style={{
                    position: 'absolute',
                    left: hoverX - 35,
                    top: hoverY - 35,
                    width: 70,
                    height: 70,
                    zIndex: 10,
                  }}
                  // @ts-ignore
                  onHoverIn={() => setHoveredIndex(i)}
                  onHoverOut={() => setHoveredIndex(null)}
                  onPressIn={() => setHoveredIndex(i)}
                  onPressOut={() => setHoveredIndex(null)}
                />
              );
            })}

            {hoveredIndex !== null && (
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
                  {data[hoveredIndex].label}
                </Text>
                <Text style={{ color: theme.colors.primary, fontWeight: '900', fontSize: 16 }}>
                  {data[hoveredIndex].value.toFixed(2)} <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>/ {maxScore}</Text>
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
    minWidth: 300,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  chartWrapper: {
    width: '100%',
    height: 320,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
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
