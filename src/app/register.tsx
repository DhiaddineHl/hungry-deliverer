import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { GoogleButton, OrDivider, TermsFooter } from '@/components/auth/auth-common';
import { TextField } from '@/components/auth/text-field';
import { VehicleClassField } from '@/components/auth/vehicle-class-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth, wasCancelled } from '@/contexts/auth-context';
import { MOTORIZED_VEHICLES, registerSchema, type RegisterValues } from '@/features/auth/schemas';
import { useRegisterDriver } from '@/hooks/use-driver';

/** Fixed until multi-country support lands; prefixed onto the phone number. */
const COUNTRY_CODE = '+216';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle } = useAuth();
  const registerDriver = useRegisterDriver();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isSubmitting = registerDriver.isPending;

  const { control, handleSubmit } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
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
      // the vehicle for the chosen class, and grants DRIVER +
      // VEHICLE_<CLASS> on the account.
      await registerDriver.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email.trim(),
        password: values.password,
        phoneNumber: `${COUNTRY_CODE}${values.phone.replace(/\s/g, '')}`,
        vehicleType: values.vehicleType,
        licensePlate: needsPlate ? values.licensePlate?.trim() : undefined,
        licenseNumber: needsPlate ? values.licenseNumber?.trim() || undefined : undefined,
      });

      // The account is usable immediately (permanent password), so log in
      // right away rather than leaving the new deliverer without a session.
      const result = await login(values.email.trim(), values.password);
      router.replace(result.success ? '/delivery' : '/');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      );
    }
  };

  const onGoogleSignup = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        // The Keycloak account exists but has no driver record yet — the
        // delivery screen resolves that through useDriver()'s 404-as-null.
        router.replace('/delivery');
      } else if (!wasCancelled(result.error)) {
        setAuthError(result.error ?? 'Google sign-up failed');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
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
                Sign Up to Hungry
              </Text>
              <Text size={15} color={Colors.textSecondary} style={styles.subtitle}>
                Hungry? We got you !
              </Text>
            </View>

            {authError ? (
              <View style={styles.errorBanner}>
                <Text size={14} color="#B3261E">
                  {authError}
                </Text>
              </View>
            ) : null}

            <View style={styles.row}>
              <TextField
                control={control}
                name="firstName"
                label="First Name"
                placeholder="First Name"
                autoCapitalize="words"
                autoComplete="name-given"
                containerStyle={styles.rowField}
              />
              <TextField
                control={control}
                name="lastName"
                label="Last Name"
                placeholder="Last Name"
                autoCapitalize="words"
                autoComplete="name-family"
                containerStyle={styles.rowField}
              />
            </View>

            <PhoneField control={control} />

            <TextField
              control={control}
              name="email"
              label="Email"
              placeholder="Email"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              containerStyle={styles.field}
            />

            <TextField
              control={control}
              name="password"
              label="Password"
              placeholder="Password"
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
              containerStyle={styles.field}
            />

            <TextField
              control={control}
              name="verifyPassword"
              label="Verify Password"
              placeholder="Password"
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
                  label="License Plate"
                  placeholder="123 TUN 4567"
                  autoCapitalize="characters"
                  containerStyle={styles.field}
                />
                <TextField
                  control={control}
                  name="licenseNumber"
                  label="Driving License Number (optional)"
                  placeholder="License number"
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

            <View style={styles.switchRow}>
              <Text size={14} color={Colors.textSecondary}>
                Already have an account ?{' '}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                hitSlop={8}>
                <Text weight="bold" size={14} color={Colors.orange}>
                  LOGIN
                </Text>
              </Pressable>
            </View>

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
  return (
    <Controller
      control={control}
      name="phone"
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <View style={styles.field}>
          <Text weight="semibold" size={15} style={styles.phoneLabel}>
            Phone Number
          </Text>
          <View style={styles.phoneRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select country code"
              onPress={() => {}}
              style={styles.countryPill}>
              <View style={styles.flag}>
                <Text size={16}>🇹🇳</Text>
              </View>
              <Text weight="medium" size={15}>
                +216
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
            </Pressable>
            <View style={[styles.numberWrap, error && styles.inputError]}>
              <TextInput
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="22 222 222"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                style={styles.numberInput}
              />
            </View>
          </View>
          {error ? (
            <Text size={13} color="#D64545" style={styles.phoneError}>
              {error.message}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  flex: {
    flex: 1,
  },
  cardWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '82%',
    backgroundColor: Colors.white,
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
    marginBottom: Spacing.five,
  },
  subtitle: {
    marginTop: Spacing.one,
  },
  errorBanner: {
    padding: Spacing.three,
    marginBottom: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: '#FDECEA',
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
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  flag: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: Colors.pin,
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
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.four,
  },
  numberInput: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.text,
    padding: 0,
  },
  inputError: {
    borderColor: '#D64545',
  },
  submit: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  phoneError: {
    marginTop: Spacing.one,
  },
});
