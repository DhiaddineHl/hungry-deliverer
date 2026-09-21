import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { translateFieldError } from '@/features/auth/field-error';
import { useLocale } from '@/contexts/locale-context';
import { ThemedStatusBar } from '@/components/ui/themed-status-bar';
import { makeStyles } from '@/hooks/use-themed-styles';
import { useColors } from '@/contexts/theme-context';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import {
  GoogleButton,
  IdentityRow,
  OrDivider,
  TermsFooter,
} from '@/components/auth/auth-common';
import { TextField } from '@/components/auth/text-field';
import { VehicleClassField } from '@/components/auth/vehicle-class-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth, wasCancelled } from '@/contexts/auth-context';
import { MOTORIZED_VEHICLES, registerSchema, type RegisterValues } from '@/features/auth/schemas';
import { useRegisterDriver } from '@/hooks/use-driver';
import { usePendingVerificationStore } from '@/store/pending-verification-store';

/** Fixed until multi-country support lands; prefixed onto the phone number. */
const COUNTRY_CODE = '+216';

/**
 * Account creation, reached only from the identification screen and only for
 * an address it found no account for. That address arrives as a route param
 * and is not asked for again — nor is there a link back to a separate login
 * screen, because there is no longer one to go to.
 */
export default function RegisterScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';
  const insets = useSafeAreaInsets();
  const { loginWithGoogle } = useAuth();
  const registerDriver = useRegisterDriver();
  const startVerification = usePendingVerificationStore((state) => state.start);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isSubmitting = registerDriver.isPending;

  const { control, handleSubmit } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      verifyPassword: '',
      vehicleType: undefined,
      licensePlate: '',
      licenseNumber: '',
    },
  });

  // A bicycle courier has neither a plate nor a driving licence, so those
  // fields only appear (and are only required) for motorized classes.
  const vehicleType = useWatch({ control, name: 'vehicleType' });
  const needsPlate = MOTORIZED_VEHICLES.includes(vehicleType);

  const onSubmit = async (values: RegisterValues) => {
    setAuthError(null);
    try {
      // One backend call creates the Keycloak login, the Driver record and
      // the vehicle for the chosen class, and grants DRIVER + VEHICLE_<CLASS>
      // on the account. It mails nothing: the verification screen asks for the
      // code itself, which is also what makes it work for a deliverer who
      // abandoned the step and came back later.
      await registerDriver.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email,
        password: values.password,
        phoneNumber: `${COUNTRY_CODE}${values.phone.replace(/\s/g, '')}`,
        vehicleType: values.vehicleType,
        licensePlate: needsPlate ? values.licensePlate?.trim() : undefined,
        licenseNumber: needsPlate ? values.licenseNumber?.trim() || undefined : undefined,
      });

      // No sign-in here any more: the account exists but its e-mail is
      // unproven, and the router guard would bounce the session straight back
      // to the code screen anyway. The verification screen signs in once the
      // code is accepted — which is why it needs the password, handed over in
      // memory rather than through route params.
      startVerification({ email, password: values.password, firstName: values.firstName });

      router.push('/verification');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : t('auth.errorUnexpected')
      );
    }
  };

  const onGoogleSignup = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      // Nothing to route on success: the Keycloak account exists but has no
      // driver record yet, the auth context creates one
      // (`ensureDriverForAccount`), and the root navigator moves the session
      // on once it is there.
      if (!result.success && !wasCancelled(result.error)) {
        setAuthError(result.error ?? t('auth.errorGoogleSignUp'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // back(), not push('/'), so the stack doesn't grow when the deliverer
  // ping-pongs between identification and this screen.
  const goBackToIdentification = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Reached without an address (a deep link, or a reload that lost the param):
  // only the identification step can supply one.
  if (!email) {
    return (
      <View style={styles.screen}>
        <ThemedStatusBar surface="navy" />
        <AuthBackdrop />
        <View style={styles.cardWrap}>
          <View style={styles.emptyState}>
            <Text weight="bold" size={22} style={styles.centered}>
              {t('auth.whichEmail')}
            </Text>
            <Text size={15} color={colors.textSecondary} style={styles.emptyBody}>
              We do not know which address to create the account for. Start again and we will pick
              it back up.
            </Text>
            <PrimaryButton
              label={t('common.continue')}
              onPress={() => router.replace('/')}
              style={styles.emptyButton}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ThemedStatusBar surface="navy" />
      <AuthBackdrop />

      <View style={styles.cardWrap}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={[
              styles.cardContent,
              { paddingBottom: insets.bottom + Spacing.five },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={styles.heading}>
              <Text weight="bold" size={24}>
                {t('auth.signUpTitle')}
              </Text>
              <Text size={15} color={colors.textSecondary} style={styles.subtitle}>
                Just a few details and you&apos;re in
              </Text>
            </View>

            <IdentityRow email={email} onChange={goBackToIdentification} />

            {authError ? (
              <View style={styles.errorBanner}>
                <Text size={14} color={colors.danger}>
                  {authError}
                </Text>
              </View>
            ) : null}

            <View style={styles.row}>
              <TextField
                control={control}
                name="firstName"
                label={t('auth.firstName')}
                placeholder={t('auth.firstName')}
                autoCapitalize="words"
                autoComplete="name-given"
                containerStyle={styles.rowField}
              />
              <TextField
                control={control}
                name="lastName"
                label={t('auth.lastName')}
                placeholder={t('auth.lastName')}
                autoCapitalize="words"
                autoComplete="name-family"
                containerStyle={styles.rowField}
              />
            </View>

            <PhoneField control={control} />

            <TextField
              control={control}
              name="password"
              label={t('auth.password')}
              placeholder={t('auth.password')}
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
              containerStyle={styles.field}
            />

            <TextField
              control={control}
              name="verifyPassword"
              label={t('auth.verifyPassword')}
              placeholder={t('auth.password')}
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
              containerStyle={styles.field}
            />

            <VehicleClassField control={control} name="vehicleType" containerStyle={styles.field} />

            {needsPlate ? (
              <>
                <TextField
                  control={control}
                  name="licensePlate"
                  label={t('auth.licensePlate')}
                  placeholder={t('auth.licensePlatePlaceholder')}
                  autoCapitalize="characters"
                  containerStyle={styles.field}
                />
                <TextField
                  control={control}
                  name="licenseNumber"
                  label={t('auth.licenseNumber')}
                  placeholder={t('auth.licenseNumberPlaceholder')}
                  autoCapitalize="characters"
                  containerStyle={styles.field}
                />
              </>
            ) : null}

            <PrimaryButton
              label={isSubmitting ? 'CREATING ACCOUNT…' : 'SIGN UP'}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting || isGoogleLoading}
              style={styles.submit}
            />

            <OrDivider />
            <GoogleButton onPress={onGoogleSignup} disabled={isGoogleLoading || isSubmitting} />
            <TermsFooter />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

/**
 * Phone input with a (static) country selector. Only the number is validated;
 * the +216 Tunisia code is fixed until multi-country support lands.
 */
function PhoneField({ control }: { control: ReturnType<typeof useForm<RegisterValues>>['control'] }) {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  return (
    <Controller
      control={control}
      name="phone"
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <View style={styles.field}>
          <Text weight="semibold" size={15} style={styles.phoneLabel}>
            {t('auth.phoneNumber')}
          </Text>
          <View style={styles.phoneRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('auth.selectCountryCode')}
              onPress={() => {}}
              style={styles.countryPill}>
              <View style={styles.flag}>
                <Text size={16}>🇹🇳</Text>
              </View>
              <Text weight="medium" size={15}>
                +216
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </Pressable>
            <View style={[styles.numberWrap, error && styles.inputError]}>
              <TextInput
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('auth.phonePlaceholder')}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                style={styles.numberInput}
              />
            </View>
          </View>
          {error ? (
            <Text size={13} color={colors.danger} style={styles.phoneError}>
              {translateFieldError(t, error.message)}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.navy,
  },
  flex: {
    flex: 1,
  },
  cardWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // A definite height (not maxHeight): an auto-height absolute card leaves the
    // ScrollView unbounded, so it sizes to its content and clips instead of
    // scrolling. See the login screen for the same note.
    height: '82%',
    backgroundColor: c.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...Shadow.card,
  },
  cardContent: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.six,
  },
  heading: {
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  subtitle: {
    marginTop: Spacing.one,
  },
  errorBanner: {
    padding: Spacing.three,
    marginBottom: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: c.dangerSoft,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginBottom: Spacing.four,
  },
  rowField: {
    flex: 1,
  },
  field: {
    marginBottom: Spacing.four,
  },
  phoneLabel: {
    marginBottom: Spacing.two,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 56,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  flag: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: c.pin,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  numberWrap: {
    flex: 1,
    justifyContent: 'center',
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    paddingHorizontal: Spacing.four,
  },
  numberInput: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: c.text,
    padding: 0,
  },
  inputError: {
    borderColor: c.danger,
  },
  submit: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  phoneError: {
    marginTop: Spacing.one,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  centered: {
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: Spacing.two,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: Spacing.five,
  },
}));
