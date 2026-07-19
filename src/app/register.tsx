import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Controller, useForm } from 'react-hook-form';
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
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { registerSchema, type RegisterValues } from '@/features/auth/schemas';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { control, handleSubmit } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      verifyPassword: '',
    },
  });

  const onSubmit = (_values: RegisterValues) => {
    // Registration is stubbed for now — go straight to the delivery app.
    router.replace('/delivery');
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

            <PrimaryButton
              label="SIGN UP"
              onPress={handleSubmit(onSubmit)}
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
            <GoogleButton onPress={() => {}} />
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
