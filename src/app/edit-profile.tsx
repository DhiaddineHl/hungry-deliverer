import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, type FieldValues } from 'react-hook-form';
import { View } from 'react-native';

import { PrimaryButton } from '@/components/ui/button';
import { ErrorBanner, Skeleton, StateView } from '@/components/ui/feedback';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { FormTextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/contexts/auth-context';
import { useLocale } from '@/contexts/locale-context';
import {
  isProfileField,
  profileEmailSchema,
  profileNameSchema,
  profilePhoneSchema,
  type ProfileEmailValues,
  type ProfileField,
  type ProfileNameValues,
  type ProfilePhoneValues,
} from '@/features/profile/schemas';
import { useUpdateProfile } from '@/features/profile/use-update-profile';
import { useDriver } from '@/hooks/use-driver';
import type { TranslationKey } from '@/i18n';
import type { Driver } from '@/services/api/types';
import { makeStyles } from '@/theme';

const TITLES: Record<ProfileField, TranslationKey> = {
  name: 'editProfile.nameTitle',
  email: 'editProfile.emailTitle',
  phone: 'editProfile.phoneTitle',
};

/**
 * Edits one field of the rider's profile and writes it through `PUT /drivers`,
 * which mirrors the change onto the Keycloak account.
 *
 * One field per visit, on purpose: the backend replaces `contact` and
 * `fullname` wholesale, so every save rebuilds them from the current record
 * (see `features/profile/profile-input.ts`). Editing one thing at a time keeps
 * that rebuild honest.
 */
export default function EditProfileScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ field?: string }>();
  const { user } = useAuth();
  const { data: driver, isLoading } = useDriver(user?.sub);
  const field = isProfileField(params.field) ? params.field : 'name';
  const title = t(TITLES[field]);

  if (isLoading || driver === undefined) {
    return (
      <Page title={title}>
        <View style={styles.skeleton}>
          <Skeleton width="80%" height={14} />
          <Skeleton width={80} height={12} style={styles.skeletonLabel} />
          <Skeleton height={52} radius={14} />
        </View>
      </Page>
    );
  }

  // No driver record behind the account (a brokered sign-in whose
  // `POST /drivers/me` never completed): nothing to update by code.
  if (!driver) {
    return (
      <Page title={title}>
        <StateView
          icon="user"
          title={t('editProfile.unavailableTitle')}
          body={t('editProfile.unavailableBody')}
          style={styles.unavailable}
        />
      </Page>
    );
  }

  return <ProfileForm field={field} title={title} driver={driver} onDone={router.back} />;
}

type FormSpec = {
  hint: TranslationKey;
  defaults: (driver: Driver) => FieldValues;
  schema: typeof profileNameSchema | typeof profileEmailSchema | typeof profilePhoneSchema;
};

const FORMS: Record<ProfileField, FormSpec> = {
  name: {
    hint: 'editProfile.nameHint',
    schema: profileNameSchema,
    defaults: (driver) => ({
      firstName: driver.fullname?.firstName ?? '',
      lastName: driver.fullname?.lastName ?? '',
    }),
  },
  email: {
    hint: 'editProfile.emailHint',
    schema: profileEmailSchema,
    defaults: (driver) => ({ email: driver.contact?.email ?? '' }),
  },
  phone: {
    hint: 'editProfile.phoneHint',
    schema: profilePhoneSchema,
    defaults: (driver) => ({ phone: driver.contact?.phones?.[0] ?? '' }),
  },
};

function ProfileForm({
  field,
  title,
  driver,
  onDone,
}: {
  field: ProfileField;
  title: string;
  driver: Driver;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const styles = useStyles();
  const showToast = useToast((state) => state.show);
  const { save, isSaving, error } = useUpdateProfile();
  const spec = FORMS[field];
  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = useForm<FieldValues>({
    // The three schemas share nothing but their resolver shape.
    resolver: zodResolver(spec.schema as typeof profileNameSchema),
    defaultValues: spec.defaults(driver),
  });

  const onSubmit = async (values: FieldValues) => {
    const saved = await save(
      driver,
      values as ProfileNameValues | ProfileEmailValues | ProfilePhoneValues
    );
    if (saved) {
      showToast(t('editProfile.saved'));
      onDone();
    }
  };

  return (
    <Page
      title={title}
      bottomBar={
        <PrimaryButton
          label={isSaving ? t('common.saving') : t('common.save')}
          loading={isSaving}
          // Nothing to save until something changed.
          disabled={!isDirty}
          onPress={handleSubmit(onSubmit)}
          style={styles.flex}
        />
      }>
      <Text variant="description" color="inkMuted" style={styles.hint}>
        {t(spec.hint)}
      </Text>
      {error ? <ErrorBanner message={error} style={styles.banner} /> : null}

      {field === 'name' ? (
        <View style={styles.columns}>
          <FormTextField
            control={control}
            name="firstName"
            label={t('auth.firstName')}
            placeholder={t('auth.firstName')}
            autoCapitalize="words"
            autoComplete="given-name"
            disabled={isSaving}
            containerStyle={styles.flex}
          />
          <FormTextField
            control={control}
            name="lastName"
            label={t('auth.lastName')}
            placeholder={t('auth.lastName')}
            autoCapitalize="words"
            autoComplete="family-name"
            disabled={isSaving}
            containerStyle={styles.flex}
          />
        </View>
      ) : null}

      {field === 'email' ? (
        <FormTextField
          control={control}
          name="email"
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          disabled={isSaving}
        />
      ) : null}

      {field === 'phone' ? (
        <FormTextField
          control={control}
          name="phone"
          label={t('settings.phoneNumber')}
          placeholder="+216 22 222 222"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          disabled={isSaving}
        />
      ) : null}
    </Page>
  );
}

const useStyles = makeStyles(() => ({
  flex: {
    flex: 1,
  },
  hint: {
    marginTop: 12,
    marginBottom: 24,
  },
  banner: {
    marginBottom: 20,
  },
  columns: {
    flexDirection: 'row',
    gap: 12,
  },
  skeleton: {
    marginTop: 12,
    gap: 10,
  },
  skeletonLabel: {
    marginTop: 14,
  },
  unavailable: {
    marginTop: 48,
  },
}));
