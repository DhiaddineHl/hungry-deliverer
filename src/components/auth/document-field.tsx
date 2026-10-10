import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { Badge, IconWell } from '@/components/ui/content';
import { Text } from '@/components/ui/text';
import { FieldMessage } from '@/components/ui/text-field';
import { useLocale } from '@/contexts/locale-context';
import type { LocalFile } from '@/services/api/driver-request-service';
import { Icon, makeStyles, type IconName } from '@/theme';

/**
 * Phone cameras produce multi-megabyte JPEGs; this is plenty for a reviewer to
 * read an ID card and keeps the upload quick on mobile data.
 */
const QUALITY = 0.6;

type Props = {
  label: string;
  hint?: string;
  /** Shows an "Optional" badge; required documents show nothing. */
  optional?: boolean;
  /** Camera only, front-facing — the live photo must be taken now. */
  liveOnly?: boolean;
  value: LocalFile | null;
  onChange: (file: LocalFile) => void;
  /** Already-translated validation message. */
  error?: string | null;
  disabled?: boolean;
  /** Prefix of the generated file name when the picker gives none. */
  fileNamePrefix: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * One verification document of the rider application: a thumbnail of the
 * picked image (or a neutral well) with the ways to provide it.
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
  style,
}: Props) {
  const { t } = useLocale();
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
    <View style={[styles.container, style]}>
      <View style={[styles.card, message ? styles.cardError : null]}>
        {value ? (
          <Image source={{ uri: value.uri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <IconWell icon={liveOnly ? 'user' : 'terms'} size={56} radius={14} iconSize="field" />
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="itemLabel" numberOfLines={1} style={styles.title}>
              {label}
            </Text>
            {optional ? <Badge label={t('application.optional')} tone="neutral" /> : null}
          </View>
          {hint ? (
            <Text variant="caption" color="inkMuted" numberOfLines={2}>
              {hint}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Action
              icon="camera"
              label={value ? t('application.replace') : t('application.takePhoto')}
              onPress={takePhoto}
              disabled={disabled}
            />
            {liveOnly ? null : (
              <Action icon="gallery" label={t('application.choosePhoto')} onPress={choosePhoto} disabled={disabled} />
            )}
          </View>
        </View>

        {value ? <Icon name="success" color="success" /> : null}
      </View>
      {message ? <FieldMessage message={message} /> : null}
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.action, (pressed || disabled) && styles.pressed]}>
      <Icon name={icon} size="small" />
      <Text variant="link">{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c, t) => ({
  container: {
    gap: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: t.radius.thumb,
    borderWidth: 1,
    borderColor: c.divider,
  },
  cardError: {
    borderColor: c.danger,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: t.radius.field,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 6,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pressed: {
    opacity: 0.5,
  },
}));
