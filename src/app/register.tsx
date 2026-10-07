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
import { IdentityRow, TermsFooter } from '@/components/auth/auth-common';
import { DocumentField } from '@/components/auth/document-field';
import { TextField } from '@/components/auth/text-field';
import { VehicleClassField } from '@/components/auth/vehicle-class-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text } from '@/components/ui/text';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import {
  MOTORIZED_VEHICLES,
  applicationSchema,
  type ApplicationValues,
} from '@/features/auth/schemas';
import type { TranslationKey } from '@/i18n';
import {
  createDriverRequest,
  uploadApplicationDocument,
  type LocalFile,
} from '@/services/api/driver-request-service';
import {
  APPLICATION_DOCUMENTS,
  REQUIRED_APPLICATION_DOCUMENTS,
  type ApplicationDocument,
} from '@/services/api/types';

/** Fixed until multi-country support lands; prefixed onto the phone number. */
const COUNTRY_CODE = '+216';

type DocumentCopy = { label: TranslationKey; hint?: TranslationKey; liveOnly?: boolean };

const DOCUMENT_COPY: Record<ApplicationDocument, DocumentCopy> = {
  'live-photo': {
    label: 'application.livePhoto',
    hint: 'application.livePhotoHint',
    liveOnly: true,
  },
  'id-card-front': { label: 'application.idCardFront' },
  'id-card-back': { label: 'application.idCardBack' },
  'vehicle-registration-card': { label: 'application.vehicleRegistration' },
};

const NO_DOCUMENTS: Record<ApplicationDocument, LocalFile | null> = {
  'live-photo': null,
  'id-card-front': null,
  'id-card-back': null,
  'vehicle-registration-card': null,
};

/**
 * The deliverer application, reached only from the identification screen for
 * an address with no account and no application under review (or whose last
 * application was declined — the reason then arrives as a route param).
 *
 * Nothing here creates an account. Submitting files a `DriverRequest` and then
 * uploads its documents one by one; staff review it in the back-office, and
 * approving it is what creates the Driver and its Keycloak login. The
 * deliverer then comes back through identification and sets a password.
 *
 * Creation and the uploads are separate calls, so a failed upload leaves a
 * real application behind. The screen remembers its id and a retry only
 * re-sends what has not gone through yet, rather than filing a duplicate.
 */
export default function ApplicationScreen() {
  const { t } = useLocale();
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    rejectionReason?: string;
    reapply?: string;
  }>();
  const email = params.email ?? '';
  const isReapplying = params.reapply === '1';
  const rejectionReason = params.rejectionReason?.trim() || null;
  const insets = useSafeAreaInsets();

  const [documents, setDocuments] = useState(NO_DOCUMENTS);
  const [showDocumentErrors, setShowDocumentErrors] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<ReadonlySet<ApplicationDocument>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set once the application and all its documents have gone through.
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { control, handleSubmit } = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      vehicleType: undefined,
      licensePlate: '',
      licenseNumber: '',
    },
  });

  // A bicycle courier has neither a plate nor a driving licence, so those
  // fields only appear (and are only required) for motorized classes.
  const vehicleType = useWatch({ control, name: 'vehicleType' });
  const needsPlate = MOTORIZED_VEHICLES.includes(vehicleType);

  const setDocument = (doc: ApplicationDocument, file: LocalFile) => {
    setDocuments((prev) => ({ ...prev, [doc]: file }));
    // A replaced document has to go up again, even if the old one already did.
    setUploaded((prev) => {
      if (!prev.has(doc)) return prev;
      const next = new Set(prev);
      next.delete(doc);
      return next;
    });
  };

  const onSubmit = async (values: ApplicationValues) => {
    setShowDocumentErrors(true);
    setSubmitError(null);
    if (REQUIRED_APPLICATION_DOCUMENTS.some((doc) => !documents[doc])) return;

    setIsSubmitting(true);
    let id = requestId;
    try {
      // Only the first attempt files the application. Once it exists, a retry
      // is about its documents alone — the fields are not re-sent (updating an
      // application needs a staff token).
      if (!id) {
        const created = await createDriverRequest({
          fullname: { firstName: values.firstName.trim(), lastName: values.lastName.trim() },
          contact: {
            email,
            phones: [`${COUNTRY_CODE}${values.phone.replace(/\s/g, '')}`],
          },
          vehicleType: values.vehicleType,
          // Required by the backend; every class offered here is motorized.
          licensePlate: values.licensePlate?.trim() ?? '',
          licenseNumber: values.licenseNumber?.trim() || undefined,
        });
        id = created.id;
        setRequestId(id);
      }

      const pending = APPLICATION_DOCUMENTS.filter((doc) => documents[doc] && !uploaded.has(doc));
      const done = new Set(uploaded);
      for (const [index, doc] of pending.entries()) {
        setProgress({ done: index, total: pending.length });
        await uploadApplicationDocument(id, doc, documents[doc]!);
        done.add(doc);
        setUploaded(new Set(done));
      }

      // Confirmed in place rather than on the status screen: the applicant has
      // just applied, so a "check status" button has nothing to tell them yet.
      setIsSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.errorUnexpected');
      setSubmitError(id ? t('application.uploadFailed', { error: message }) : message);
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  };

  // back(), not push('/'), so the stack doesn't grow when the deliverer
  // ping-pongs between identification and this screen.
  const goBackToIdentification = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (isSubmitted) {
    return (
      <View style={styles.screen}>
        <ThemedStatusBar surface="navy" />
        <AuthBackdrop />
        <View style={styles.cardWrap}>
          <View style={styles.emptyState}>
            <View style={styles.receivedBadge}>
              <Ionicons name="checkmark-circle" size={40} color={colors.teal} />
            </View>
            <Text weight="bold" size={22} style={styles.centered}>
              {t('application.receivedTitle')}
            </Text>
            <Text size={15} color={colors.textSecondary} style={styles.emptyBody}>
              {t('application.receivedBody', { email })}
            </Text>
            <PrimaryButton
              label={t('application.backToStart')}
              // replace: the filed application is behind us and must not be
              // reachable with the back gesture.
              onPress={() => router.replace('/')}
              style={styles.emptyButton}
            />
          </View>
        </View>
      </View>
    );
  }

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
              {t('auth.whichEmailBody')}
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

  const submitLabel = progress
    ? t('application.uploading', { done: progress.done + 1, total: progress.total })
    : isSubmitting
      ? t('application.submitting')
      : t('application.submit');

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
                {isReapplying ? t('application.reapplyTitle') : t('application.title')}
              </Text>
              <Text size={15} color={colors.textSecondary} style={styles.subtitle}>
                {t('application.subtitle')}
              </Text>
            </View>

            <IdentityRow email={email} onChange={goBackToIdentification} />

            {isReapplying ? (
              <View style={styles.noticeBanner}>
                <Text weight="semibold" size={14}>
                  {t('application.previousRejected')}
                </Text>
                {rejectionReason ? (
                  <Text size={14} color={colors.textSecondary} style={styles.noticeBody}>
                    {t('application.rejectionReason', { reason: rejectionReason })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {submitError ? (
              <View style={styles.errorBanner}>
                <Text size={14} color={colors.danger}>
                  {submitError}
                </Text>
              </View>
            ) : null}

            <Text weight="bold" size={17} style={styles.sectionTitle}>
              {t('application.aboutYou')}
            </Text>

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

            <Text weight="bold" size={17} style={styles.sectionTitle}>
              {t('application.vehicle')}
            </Text>

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

            <Text weight="bold" size={17} style={styles.sectionTitle}>
              {t('application.documents')}
            </Text>
            <Text size={13} color={colors.textSecondary} style={styles.sectionHint}>
              {t('application.documentsHint')}
            </Text>

            {APPLICATION_DOCUMENTS.map((doc) => {
              const copy = DOCUMENT_COPY[doc];
              const required = REQUIRED_APPLICATION_DOCUMENTS.includes(doc);
              return (
                <DocumentField
                  key={doc}
                  label={t(copy.label)}
                  hint={copy.hint ? t(copy.hint) : undefined}
                  optional={!required}
                  liveOnly={copy.liveOnly}
                  value={documents[doc]}
                  onChange={(file) => setDocument(doc, file)}
                  error={
                    showDocumentErrors && required && !documents[doc]
                      ? t('validation.documentRequired')
                      : null
                  }
                  disabled={isSubmitting}
                  fileNamePrefix={doc}
                  containerStyle={styles.field}
                />
              );
            })}

            <PrimaryButton
              label={submitLabel}
              // The second callback runs when the schema refuses the form, so
              // missing documents are flagged in the same pass as bad fields.
              onPress={handleSubmit(onSubmit, () => setShowDocumentErrors(true))}
              disabled={isSubmitting}
              style={styles.submit}
            />

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
function PhoneField({ control }: { control: ReturnType<typeof useForm<ApplicationValues>>['control'] }) {
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
  receivedBadge: {
    alignSelf: 'center',
    marginBottom: Spacing.four,
  },
  noticeBanner: {
    padding: Spacing.three,
    marginBottom: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: c.orangeSoft,
  },
  noticeBody: {
    marginTop: Spacing.one,
  },
  sectionTitle: {
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  sectionHint: {
    marginTop: -Spacing.two,
    marginBottom: Spacing.three,
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
