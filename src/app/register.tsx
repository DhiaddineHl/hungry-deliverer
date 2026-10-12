import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { BackHandler, View } from 'react-native';

import { AuthHeading, EmailChip, TermsFooter } from '@/components/auth/auth-common';
import { AuthLayout } from '@/components/auth/auth-layout';
import { DocumentField } from '@/components/auth/document-field';
import { VehicleClassField } from '@/components/auth/vehicle-class-field';
import { PrimaryButton } from '@/components/ui/button';
import { ErrorBanner, InfoNote, StateView } from '@/components/ui/feedback';
import { COUNTRY_CODE, PhoneField } from '@/components/ui/phone-field';
import { Text } from '@/components/ui/text';
import { FormTextField } from '@/components/ui/text-field';
import { useLocale } from '@/contexts/locale-context';
import { MOTORIZED_VEHICLES, applicationSchema, type ApplicationValues } from '@/features/auth/schemas';
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
import { useApplicantStore } from '@/store/applicant-store';
import { makeStyles } from '@/theme';

type DocumentCopy = { label: TranslationKey; hint?: TranslationKey; liveOnly?: boolean };

const DOCUMENT_COPY: Record<ApplicationDocument, DocumentCopy> = {
  'live-photo': { label: 'application.livePhoto', hint: 'application.livePhotoHint', liveOnly: true },
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

/** Fields validated before leaving step 1. */
const STEP_ONE_FIELDS = ['firstName', 'lastName', 'phone'] as const;

/**
 * The rider application (A1/A2), reached only from identification for an
 * address with no account and no application under review (or a declined one,
 * whose reason arrives as a route param).
 *
 * Two steps on one screen: who you are, then how you deliver and your
 * documents. Nothing here creates an account: submitting files a
 * `DriverRequest` and uploads its documents one by one; staff review it and
 * approving it creates the login. Creation and uploads are separate calls, so
 * a failed upload leaves a real application behind — the screen remembers its
 * id and a retry only re-sends what has not gone through.
 */
export default function ApplicationScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';
  // Never from route params (deep-linkable): only what the lookup recorded
  // for this exact address.
  const applicant = useApplicantStore();
  const sameApplicant = !!email && applicant.email === email;
  const isReapplying = sameApplicant && applicant.rejected;
  const rejectionReason = sameApplicant ? applicant.rejectionReason : null;

  const [step, setStep] = useState<1 | 2>(1);
  const [documents, setDocuments] = useState(NO_DOCUMENTS);
  const [showDocumentErrors, setShowDocumentErrors] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<ReadonlySet<ApplicationDocument>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { control, handleSubmit, trigger } = useForm<ApplicationValues>({
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

  // Plate and licence only matter for motorized classes.
  const vehicleType = useWatch({ control, name: 'vehicleType' });
  const needsPlate = MOTORIZED_VEHICLES.includes(vehicleType);

  const goToIdentification = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const back = () => (step === 2 ? setStep(1) : goToIdentification());

  // Android back on step 2 returns to step 1 rather than leaving the form.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step !== 2 || isSubmitting) return false;
        setStep(1);
        return true;
      });
      return () => subscription.remove();
    }, [step, isSubmitting])
  );

  const continueToVehicle = async () => {
    if (await trigger([...STEP_ONE_FIELDS])) setStep(2);
  };

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
      // Only the first attempt files the application; a retry is about its
      // documents alone (updating an application needs a staff token).
      if (!id) {
        const created = await createDriverRequest({
          fullname: { firstName: values.firstName.trim(), lastName: values.lastName.trim() },
          contact: { email, phones: [`${COUNTRY_CODE}${values.phone.replace(/\s/g, '')}`] },
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
      setIsSubmitted(true);
      useApplicantStore.getState().clear();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.errorUnexpected');
      setSubmitError(id ? t('application.uploadFailed', { error: message }) : message);
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  };

  // A step-one field can only fail here if it was edited back to invalid; the
  // schema then sends the rider back to where the red field is.
  const onInvalid = (errors: Partial<Record<keyof ApplicationValues, unknown>>) => {
    setShowDocumentErrors(true);
    if (STEP_ONE_FIELDS.some((field) => field in errors)) setStep(1);
  };

  if (isSubmitted) {
    return (
      <AuthLayout compact>
        <StateView
          icon="success"
          tone="success"
          title={t('application.receivedTitle')}
          body={t('application.receivedBody', { email })}
          style={styles.state}>
          {/* replace: the filed application must not be reachable by back. */}
          <PrimaryButton label={t('application.backToStart')} onPress={() => router.replace('/')} />
        </StateView>
      </AuthLayout>
    );
  }

  if (!email) {
    return (
      <AuthLayout compact>
        <StateView icon="mail" title={t('auth.whichEmail')} body={t('auth.whichEmailBody')} style={styles.state}>
          <PrimaryButton label={t('common.startAgain')} onPress={() => router.replace('/')} />
        </StateView>
      </AuthLayout>
    );
  }

  const submitLabel = progress
    ? t('application.uploading', { done: progress.done + 1, total: progress.total })
    : isSubmitting
      ? t('application.submitting')
      : t('application.submit');

  if (step === 1) {
    return (
      <AuthLayout
        compact
        onBack={back}
        bottomBar={<PrimaryButton label={t('common.continue')} onPress={continueToVehicle} style={styles.flex} />}>
        <AuthHeading
          overline={t('application.stepOf', { step: 1 })}
          title={isReapplying ? t('application.reapplyTitle') : t('application.title')}
          subtitle={t('application.subtitle')}
        />
        <EmailChip email={email} onChange={goToIdentification} />

        {isReapplying ? (
          <InfoNote>
            {rejectionReason
              ? `${t('application.previousRejected')} ${t('application.rejectionReason', { reason: rejectionReason })}`
              : t('application.previousRejected')}
          </InfoNote>
        ) : null}

        <View style={styles.columns}>
          <FormTextField
            control={control}
            name="firstName"
            label={t('auth.firstName')}
            placeholder={t('auth.firstName')}
            autoCapitalize="words"
            autoComplete="name-given"
            containerStyle={styles.flex}
          />
          <FormTextField
            control={control}
            name="lastName"
            label={t('auth.lastName')}
            placeholder={t('auth.lastName')}
            autoCapitalize="words"
            autoComplete="name-family"
            containerStyle={styles.flex}
          />
        </View>
        <PhoneField control={control} name="phone" label={t('auth.phoneNumber')} placeholder={t('auth.phonePlaceholder')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      compact
      onBack={isSubmitting ? undefined : back}
      bottomBar={
        <PrimaryButton
          label={submitLabel}
          loading={isSubmitting}
          // The second callback flags missing documents in the same pass as bad fields.
          onPress={handleSubmit(onSubmit, onInvalid)}
          style={styles.flex}
        />
      }>
      <AuthHeading overline={t('application.stepOf', { step: 2 })} title={t('application.vehicleTitle')} compact />

      {submitError ? <ErrorBanner message={submitError} /> : null}

      <VehicleClassField control={control} name="vehicleType" disabled={isSubmitting} />

      {needsPlate ? (
        <>
          <FormTextField
            control={control}
            name="licensePlate"
            label={t('auth.licensePlate')}
            placeholder={t('auth.licensePlatePlaceholder')}
            autoCapitalize="characters"
            disabled={isSubmitting}
          />
          <FormTextField
            control={control}
            name="licenseNumber"
            label={t('auth.licenseNumber')}
            placeholder={t('auth.licenseNumberPlaceholder')}
            helper={t('auth.licenseNumberHelper')}
            autoCapitalize="characters"
            disabled={isSubmitting}
          />
        </>
      ) : null}

      <View style={styles.documents}>
        <View style={styles.documentsHeading}>
          <Text variant="sectionTitle" accessibilityRole="header">
            {t('application.documents')}
          </Text>
          <Text variant="meta" color="inkMuted">
            {t('application.documentsHint')}
          </Text>
        </View>
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
              error={showDocumentErrors && required && !documents[doc] ? t('validation.documentRequired') : null}
              disabled={isSubmitting}
              fileNamePrefix={doc}
            />
          );
        })}
      </View>

      <TermsFooter />
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  flex: {
    flex: 1,
  },
  columns: {
    flexDirection: 'row',
    gap: 12,
  },
  documents: {
    gap: 12,
    marginTop: 4,
  },
  documentsHeading: {
    gap: 4,
  },
  state: {
    paddingTop: 12,
  },
}));
