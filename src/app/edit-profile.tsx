import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { ActivityIndicator, View } from 'react-native';

import { useLocale } from '@/contexts/locale-context';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { TextField } from '@/components/auth/text-field';
import { PageShell } from '@/components/ui/page-shell';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import {
  isProfileField,
  profileEmailSchema,
  profileNameSchema,
  profilePhoneSchema,
  type ProfileEmailValues,
  type ProfileNameValues,
  type ProfileField,
  type ProfilePhoneValues,
} from '@/features/profile/schemas';
import { useUpdateProfile } from '@/features/profile/use-update-profile';
import { useDriver } from '@/hooks/use-driver';
import type { TranslationKey } from '@/i18n';
import type { Driver } from '@/services/api/types';

const TITLES: Record<ProfileField, TranslationKey> = {
  name: 'editProfile.nameTitle',
  email: 'editProfile.emailTitle',
  phone: 'editProfile.phoneTitle',
};

/**
 * Edits one field of the deliverer's profile and writes it through
 * `PUT /drivers`, which mirrors the change onto the Keycloak account.
 *
 * One field per visit, on purpose: the backend replaces `contact` and
 * `fullname` wholesale, so every save has to rebuild them from the current
 * record (see `features/profile/profile-input.ts`). Editing one thing at a time
 * keeps that rebuild honest — there is never a second edited field in flight
 * whose value would have to be guessed.
 */
export default function EditProfileScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ field?: string }>();
  const { user } = useAuth();
  const { data: driver, isLoading } = useDriver(user?.sub);

  const field = isProfileField(params.field) ? params.field : 'name';

  if (isLoading || driver === undefined) {
    return (
      <PageShell title={t(TITLES[field])}>
        <ActivityIndicator color={colors.orange} style={styles.loader} />
      </PageShell>
    );
  }

  // No driver record behind the account (a brokered sign-in whose
  // `POST /drivers/me` never completed). There is nothing to update by code,
  // so the editor says so rather than failing on save.
  if (!driver) {
    return (
      <PageShell title={t(TITLES[field])}>
        <Text weight="bold" size={20}>
          {t('editProfile.unavailableTitle')}
        </Text>
        <Text size={15} color={colors.textSecondary} style={styles.emptyBody}>
          {t('editProfile.unavailableBody')}
        </Text>
      </PageShell>
    );
  }

  return (
    <PageShell title={t(TITLES[field])}>
      {field === 'name' ? <NameForm driver={driver} onDone={router.back} /> : null}
      {field === 'email' ? <EmailForm driver={driver} onDone={router.back} /> : null}
      {field === 'phone' ? <PhoneForm driver={driver} onDone={router.back} /> : null}
    </PageShell>
  );
}

type FormProps = {
  driver: Driver;
  onDone: () => void;
};

function NameForm({ driver, onDone }: FormProps) {
  const { t } = useLocale();
  const styles = useStyles();
  const { save, isSaving, error } = useUpdateProfile();
  const { control, handleSubmit } = useForm<ProfileNameValues>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: {
      firstName: driver.fullname?.firstName ?? '',
      lastName: driver.fullname?.lastName ?? '',
    },
  });

  const onSubmit = async (values: ProfileNameValues) => {
    if (await save(driver, values)) onDone();
  };

  return (
    <View>
      <Hint>{t('editProfile.nameHint')}</Hint>
      <ErrorBanner message={error} />
      <TextField
        control={control}
        name="firstName"
        label={t('auth.firstName')}
        placeholder={t('auth.firstName')}
        autoCapitalize="words"
        autoComplete="given-name"
        containerStyle={styles.field}
      />
      <TextField
        control={control}
        name="lastName"
        label={t('auth.lastName')}
        placeholder={t('auth.lastName')}
        autoCapitalize="words"
        autoComplete="family-name"
        containerStyle={styles.field}
      />
      <SaveButton onPress={handleSubmit(onSubmit)} isSaving={isSaving} />
    </View>
  );
}

function EmailForm({ driver, onDone }: FormProps) {
  const { t } = useLocale();
  const styles = useStyles();
  const { save, isSaving, error } = useUpdateProfile();
  const { control, handleSubmit } = useForm<ProfileEmailValues>({
    resolver: zodResolver(profileEmailSchema),
    defaultValues: { email: driver.contact?.email ?? '' },
  });

  const onSubmit = async (values: ProfileEmailValues) => {
    if (await save(driver, values)) onDone();
  };

  return (
    <View>
      <Hint>{t('editProfile.emailHint')}</Hint>
      <ErrorBanner message={error} />
      <TextField
        control={control}
        name="email"
        label={t('auth.email')}
        placeholder={t('auth.email')}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        containerStyle={styles.field}
      />
      <SaveButton onPress={handleSubmit(onSubmit)} isSaving={isSaving} />
    </View>
  );
}

function PhoneForm({ driver, onDone }: FormProps) {
  const { t } = useLocale();
  const styles = useStyles();
  const { save, isSaving, error } = useUpdateProfile();
  const { control, handleSubmit } = useForm<ProfilePhoneValues>({
    resolver: zodResolver(profilePhoneSchema),
    defaultValues: { phone: driver.contact?.phones?.[0] ?? '' },
  });

  const onSubmit = async (values: ProfilePhoneValues) => {
    if (await save(driver, values)) onDone();
  };

  return (
    <View>
      <Hint>{t('editProfile.phoneHint')}</Hint>
      <ErrorBanner message={error} />
      <TextField
        control={control}
        name="phone"
        label={t('settings.phoneNumber')}
        placeholder={t('settings.phoneNumber')}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        containerStyle={styles.field}
      />
      <SaveButton onPress={handleSubmit(onSubmit)} isSaving={isSaving} />
    </View>
  );
}

function Hint({ children }: { children: string }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Text size={15} color={colors.textSecondary} style={styles.hint}>
      {children}
    </Text>
  );
}

function ErrorBanner({ message }: { message: string | null }) {
  const colors = useColors();
  const styles = useStyles();
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text size={14} color={colors.danger}>
        {message}
      </Text>
    </View>
  );
}

function SaveButton({ onPress, isSaving }: { onPress: () => void; isSaving: boolean }) {
  const { t } = useLocale();
  const styles = useStyles();
  return (
    <PrimaryButton
      label={isSaving ? t('common.saving') : t('common.save')}
      onPress={onPress}
      disabled={isSaving}
      style={styles.save}
    />
  );
}

const useStyles = makeStyles((c) => ({
  loader: {
    marginTop: Spacing.six,
  },
  hint: {
    marginBottom: Spacing.five,
    lineHeight: 21,
  },
  field: {
    marginBottom: Spacing.five,
  },
  save: {
    marginTop: Spacing.two,
  },
  errorBanner: {
    padding: Spacing.three,
    marginBottom: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: c.dangerSoft,
  },
  emptyBody: {
    marginTop: Spacing.two,
    lineHeight: 21,
  },
}));
