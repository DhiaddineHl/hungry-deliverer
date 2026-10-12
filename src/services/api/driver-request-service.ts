import { apiClient } from './client';
import type {
  ApplicantLookup,
  ApplicationDocument,
  DriverRequest,
  DriverRequestInput,
} from './types';

/**
 * The deliverer application ("driver request") endpoints. Every call here runs
 * unauthenticated — an applicant has no account, hence no token, until staff
 * approve them from the back-office. The backend opens exactly these paths
 * (`POST /driver-requests`, its four upload endpoints and the lookup) and
 * nothing else under `/driver-requests`.
 *
 * Approval is what creates the Driver, its Vehicle and the Keycloak account
 * (the `driverApprovalProcess` BPMN workflow) — the app never creates any of
 * them itself any more.
 */

/** Photos straight off a phone camera can be several MB; give them time. */
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * The identification step: one address in, and the outcome decides the next
 * screen — see `ApplicantOutcome`. Answers `ACCOUNT_EXISTS` for any deliverer
 * account, so it fully replaces the older `/drivers/verification/lookup` here.
 */
export async function lookupApplicant(email: string): Promise<ApplicantLookup> {
  const { data } = await apiClient.post<ApplicantLookup>('/driver-requests/verification/lookup', {
    email,
  });
  return data;
}

/**
 * Creates the application. The backend starts its review workflow on creation
 * and mails the applicant an acknowledgement; the documents follow, one call
 * each, through `uploadApplicationDocument`.
 */
export async function createDriverRequest(input: DriverRequestInput): Promise<DriverRequest> {
  const { data } = await apiClient.post<DriverRequest>('/driver-requests', input);
  return data;
}

/** A local image picked or shot on the device. */
export interface LocalFile {
  uri: string;
  name: string;
  mimeType: string;
}

/**
 * Uploads one document to object storage and attaches its URL to the
 * application. The `{ uri, name, type }` object is React Native's way of
 * putting a local file into a multipart body — the native networking layer
 * streams the file itself, nothing is read into JS memory.
 */
export async function uploadApplicationDocument(
  requestId: string,
  document: ApplicationDocument,
  file: LocalFile
): Promise<DriverRequest> {
  const form = new FormData();
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  const { data } = await apiClient.post<DriverRequest>(
    `/driver-requests/${encodeURIComponent(requestId)}/${document}`,
    form,
    {
      // Overrides the client's JSON default; the native layer appends the
      // boundary to this itself.
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT_MS,
    }
  );
  return data;
}
