import React, { useState } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { Surface, Text, useTheme, IconButton, Button, Snackbar, Portal } from 'react-native-paper';
import Svg, {
  Rect,
  G,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
} from 'react-native-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { mapEvaluationKeyToLabel } from '@/lib/evaluations';

interface ChartData {
  key: string;
  label: string;
  value: number;
}

interface EvaluationBarChartProps {
  scores: Record<string, number>;
  maxScore?: number;
}

export const EvaluationBarChart: React.FC<EvaluationBarChartProps> = ({ scores, maxScore = 5 }) => {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Build data
  const data: ChartData[] = [];
  for (let i = 1; i <= 8; i++) {
    const key = `criterion${i}`;
    const rawVal = scores[`avg_${key}_score`];
    const numericVal = typeof rawVal === 'number' ? rawVal : Number(rawVal);
    data.push({
      key,
      label: mapEvaluationKeyToLabel(key),
      value: isNaN(numericVal) ? 0 : numericVal,
    });
  }

  const validScores = data.filter((d) => d.value > 0).map((d) => d.value);
  const overallAverage =
    validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;

  // Dimensions
  const height = 300;
  const padding = { top: 40, right: 20, bottom: 40, left: 40 };
  const graphHeight = height - padding.top - padding.bottom;

  const generateSvgContent = (width: number) => {
    const graphWidth = width - padding.left - padding.right;
    const barSpace = graphWidth / data.length;
    const barWidth = Math.min(barSpace * 0.6, 60);

    let svgXml = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svgXml += `  <defs>\n`;
    svgXml += `    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">\n`;
    svgXml += `      <stop offset="0%" stop-color="${theme.colors.primary}" />\n`;
    svgXml += `      <stop offset="100%" stop-color="${theme.colors.primaryContainer}" />\n`;
    svgXml += `    </linearGradient>\n`;
    svgXml += `  </defs>\n`;

    // Background
    svgXml += `  <rect width="100%" height="100%" fill="${theme.colors.surface}" />\n`;

    // Grid lines
    [0, 1, 2, 3, 4, 5].forEach((val) => {
      const y = height - padding.bottom - (val / maxScore) * graphHeight;
      svgXml += `  <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${theme.colors.outlineVariant}" stroke-width="1" stroke-dasharray="4 4" />\n`;
      svgXml += `  <text x="${padding.left - 10}" y="${y + 4}" font-size="12" fill="${theme.colors.onSurfaceVariant}" text-anchor="end" font-family="sans-serif">${val}</text>\n`;
    });

    // Bars
    data.forEach((item, index) => {
      const barHeight = (item.value / maxScore) * graphHeight;
      const x = padding.left + index * barSpace + (barSpace - barWidth) / 2;
      const y = height - padding.bottom - barHeight;
      svgXml += `  <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="url(#barGrad)" rx="6" />\n`;
      svgXml += `  <text x="${x + barWidth / 2}" y="${height - padding.bottom + 20}" font-size="10" fill="${theme.colors.onSurfaceVariant}" text-anchor="middle" font-family="sans-serif">C${index + 1}</text>\n`;
      if (item.value > 0) {
        svgXml += `  <text x="${x + barWidth / 2}" y="${y - 8}" font-size="11" font-weight="bold" fill="${theme.colors.onSurface}" text-anchor="middle" font-family="sans-serif">${item.value.toFixed(2)}</text>\n`;
      }
    });

    svgXml += `</svg>`;
    return svgXml;
  };

  const handleExport = async () => {
    if (containerWidth === 0) return;
    try {
      const svgXml = generateSvgContent(containerWidth);
      if (Platform.OS === 'web') {
        const blob = new Blob([svgXml], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'evaluation_chart.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fileUri = FileSystem.documentDirectory + 'evaluation_chart.svg';
        await FileSystem.writeAsStringAsync(fileUri, svgXml, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri);
        }
      }
      setSnackbarVisible(true);
    } catch (e) {
      console.error(e);
    }
  };

  const renderSvg = (width: number) => {
    const graphWidth = width - padding.left - padding.right;
    const barSpace = graphWidth / data.length;
    const barWidth = Math.min(barSpace * 0.6, 60);

    return (
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="1" />
            <Stop offset="1" stopColor={theme.colors.primaryContainer} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {[0, 1, 2, 3, 4, 5].map((val) => {
          const y = height - padding.bottom - (val / maxScore) * graphHeight;
          return (
            <G key={`grid-${val}`}>
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

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.value / maxScore) * graphHeight;
          const x = padding.left + index * barSpace + (barSpace - barWidth) / 2;
          const y = height - padding.bottom - barHeight;
          const isHovered = hoveredBar === item.key;

          return (
            <G key={`bar-${item.key}`}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="url(#barGrad)"
                rx={6}
                ry={6}
                opacity={hoveredBar && !isHovered ? 0.6 : 1}
              />
              <SvgText
                x={x + barWidth / 2}
                y={height - padding.bottom + 20}
                fontSize="10"
                fill={theme.colors.onSurfaceVariant}
                textAnchor="middle"
              >
                {`C${index + 1}`}
              </SvgText>
            </G>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Overall Average Ring */}
          <View
            style={{
              position: 'relative',
              width: 44,
              height: 44,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Svg width={44} height={44} viewBox="0 0 48 48">
              {/* Background ring */}
              <G rotation="-90" origin="24, 24">
                <Circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke={theme.colors.surfaceVariant}
                  strokeWidth="6"
                  fill="none"
                />
                {/* Progress ring */}
                <Circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke={theme.colors.primary}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - overallAverage / maxScore)}`}
                  strokeLinecap="round"
                />
              </G>
            </Svg>
            <View
              style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}
            >
              <Text style={{ fontSize: 13, fontWeight: '900', color: theme.colors.onSurface }}>
                {overallAverage.toFixed(1)}
              </Text>
            </View>
          </View>
          <View>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
            >
              Evaluation Averages
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Overall Score
            </Text>
          </View>
        </View>
        <Button mode="text" icon="export" onPress={handleExport} compact>
          Export SVG
        </Button>
      </View>

      <View
        style={styles.chartWrapper}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {containerWidth > 0 && (
          <>
            {renderSvg(containerWidth)}

            {/* Hover overlays */}
            {data.map((item, index) => {
              const graphWidth = containerWidth - padding.left - padding.right;
              const barSpace = graphWidth / data.length;
              const barWidth = Math.min(barSpace * 0.6, 60);
              const barHeight = (item.value / maxScore) * graphHeight;
              const x = padding.left + index * barSpace + (barSpace - barWidth) / 2;
              const y = height - padding.bottom - barHeight;

              return (
                <Pressable
                  key={`pressable-${item.key}`}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: barWidth,
                    height: barHeight,
                    zIndex: 10,
                  }}
                  // @ts-ignore
                  onHoverIn={() => setHoveredBar(item.key)}
                  onHoverOut={() => setHoveredBar(null)}
                  onPressIn={() => setHoveredBar(item.key)}
                  onPressOut={() => setHoveredBar(null)}
                />
              );
            })}

            {/* Tooltip */}
            {hoveredBar && (
              <View
                style={[
                  styles.tooltip,
                  {
                    backgroundColor: theme.colors.elevation.level3,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
              >
                {(() => {
                  const item = data.find((d) => d.key === hoveredBar);
                  if (!item) return null;
                  return (
                    <>
                      <Text
                        style={{
                          fontWeight: 'bold',
                          color: theme.colors.onSurface,
                          marginBottom: 4,
                        }}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={{ color: theme.colors.primary, fontWeight: '900', fontSize: 18 }}
                      >
                        {item.value.toFixed(2)}{' '}
                        <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                          / {maxScore}
                        </Text>
                      </Text>
                    </>
                  );
                })()}
              </View>
            )}
          </>
        )}
      </View>

      <Portal>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
        >
          Chart exported successfully!
        </Snackbar>
      </Portal>
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
    height: 300,
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    top: 20,
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
