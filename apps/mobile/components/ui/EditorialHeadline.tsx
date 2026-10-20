import React from 'react';
import { Text, StyleSheet, TextProps, Platform } from 'react-native';

export interface EditorialHeadlineProps extends TextProps {
  plainText: string;
  italicText?: string;
  suffixText?: string;
  size?: 'display-xl' | 'display-lg' | 'title-md';
  align?: 'left' | 'center' | 'right';
  color?: string;
}

export const EditorialHeadline: React.FC<EditorialHeadlineProps> = ({
  plainText,
  italicText,
  suffixText = '',
  size = 'display-lg',
  align = 'left',
  color = '#111312',
  style,
  ...props
}) => {
  const getFontSize = () => {
    switch (size) {
      case 'display-xl':
        return { fontSize: 34, lineHeight: 40 };
      case 'title-md':
        return { fontSize: 18, lineHeight: 24 };
      case 'display-lg':
      default:
        return { fontSize: 30, lineHeight: 36 };
    }
  };

  const serifFontFamily = Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
  });

  return (
    <Text
      style={[
        styles.base,
        getFontSize(),
        { textAlign: align, color },
        style,
      ]}
      {...props}
    >
      <Text style={styles.plain}>{plainText} </Text>
      {italicText ? (
        <Text
          style={[
            styles.italic,
            { fontFamily: serifFontFamily },
          ]}
        >
          {italicText}
        </Text>
      ) : null}
      {suffixText ? <Text style={styles.plain}> {suffixText}</Text> : null}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    letterSpacing: -0.5,
  },
  plain: {
    fontWeight: '400',
  },
  italic: {
    fontStyle: 'italic',
    fontWeight: '400',
  },
});
