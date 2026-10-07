import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useLocale } from '@/contexts/locale-context';
import { useColors } from '@/contexts/theme-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import type { LocalFile } from '@/services/api/driver-request-service';

/**
 * Phone cameras produce multi-megabyte JPEGs; this is plenty for a reviewer to
 * read an ID card and keeps the upload quick on mobile data.
 */
const QUALITY = 0.6;

type Props = {
  label: string;
  hint?: string;
  /** Shows an "Optional" tag; required documents show nothing. */
  optional?: boolean;
  /**
   * Camera only, front-facing — the live photo must be taken now, not picked
   * from the gallery, which is the whole point of asking for one.
   */
  liveOnly?: boolean;
  value: LocalFile | null;
  onChange: (file: LocalFile) => void;
  /** Already-translated validation message. */
  error?: string | null;
  disabled?: boolean;
  /** Prefix of the generated file name when the picker gives none. */
  fileNamePrefix: string;
  containerStyle?: ViewStyle;
};

/**
 * One verification document of the deliverer application: a thumbnail of the
 * picked image (or a placeholder) with the ways to provide it.
 */
export function DocumentField({
  label,
  hint,
  optional,
  liveOnly,
  value,
  onChange,
  error,
  disabled,
  fileNamePrefix,
  containerStyle,
}: Props) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const accept = (result: ImagePicker.ImagePickerResult) => {
    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset) return;
    setPermissionError(null);
    onChange({
      uri: asset.uri,
      name: asset.fileName ?? `${fileNamePrefix}-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPermissionError(t('application.cameraDenied'));
      return;
    }
    accept(
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: QUALITY,
        cameraType: liveOnly ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      })
    );
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPermissionError(t('application.libraryDenied'));
      return;
    }
    accept(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: QUALITY }));
  };

  const message = error ?? permissionError;

  return (
    <View style={containerStyle}>
      <View style={[styles.card, message && styles.cardError]}>
        {value ? (
          <Image source={{ uri: value.uri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.placeholder]}>
            <Ionicons
              name={liveOnly ? 'person-circle-outline' : 'document-text-outline'}
              size={26}
              color={colors.textSecondary}
            />
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text weight="semibold" size={14} style={styles.title} numberOfLines={1}>
              {label}
            </Text>
            {optional ? (
              <Text size={12} color={colors.textMuted}>
                {t('application.optional')}
              </Text>
            ) : null}
          </View>
          {hint ? (
            <Text size={12} color={colors.textSecondary} numberOfLines={2}>
              {hint}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <ActionLink
              icon="camera-outline"
              label={value ? t('application.replace') : t('application.takePhoto')}
              onPress={takePhoto}
              disabled={disabled}
            />
            {liveOnly ? null : (
              <ActionLink
                icon="images-outline"
                label={t('application.choosePhoto')}
                onPress={choosePhoto}
                disabled={disabled}
              />
            )}
          </View>
        </View>

        {value ? <Ionicons name="checkmark-circle" size={22} color={colors.teal} /> : null}
      </View>

      {message ? (
        <Text size={13} color={colors.danger} style={styles.error}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

function ActionLink({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.action, (pressed || disabled) && styles.pressed]}>
      <Ionicons name={icon} size={16} color={colors.teal} />
      <Text weight="semibold" size={13} color={colors.teal}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  cardError: {
    borderColor: c.danger,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
    marginTop: Spacing.one,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pressed: {
    opacity: 0.5,
  },
  error: {
    marginTop: Spacing.one,
  },
}));
