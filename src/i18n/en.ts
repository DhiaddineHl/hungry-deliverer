/**
 * English copy — the source catalogue.
 *
 * Keys are grouped by the screen or component that owns them, with `common` for
 * the handful of words that genuinely recur. `fr.ts` mirrors this shape exactly;
 * its type is checked against this file, so a key added here and forgotten
 * there fails to compile rather than falling back silently at runtime.
 *
 * Interpolation uses i18n-js's `%{name}` syntax.
 */
export const en = {
  common: {
    save: 'SAVE CHANGES',
    saving: 'SAVING…',
    continue: 'CONTINUE',
    retry: 'Retry',
    loading: 'Loading…',
    back: 'Go back',
    cancel: 'Cancel',
    notSet: 'Not set',
    startAgain: 'START AGAIN',
    sending: 'SENDING…',
    tnd: 'TND',
  },

  auth: {
    welcome: 'Welcome !',
    welcomeSubtitle: 'Hungry? We got you !',
    welcomeBack: 'Welcome back !',
    passwordPrompt: 'Enter your password to continue',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password',
    loginWithGoogle: 'LOG IN WITH GOOGLE',
    change: 'CHANGE',
    or: 'OR',
    privacyPolicy: 'Privacy Policy',
    cookiesPolicy: 'Cookies policy',
    whichAccount: 'Which account?',
    whichAccountBody:
      'We do not know which email to sign in with. Start again and we will pick it back up.',
    whichEmail: 'Which email?',
    whichEmailBody:
      'We do not know which address to create the account for. Start again and we will pick it back up.',
    signUpTitle: 'Sign Up to Hungry',
    firstName: 'First Name',
    lastName: 'Last Name',
    verifyPassword: 'Verify Password',
    phoneNumber: 'Phone Number',
    phonePlaceholder: '22 222 222',
    selectCountryCode: 'Select country code',
    licensePlate: 'License Plate',
    licensePlatePlaceholder: '123 TUN 4567',
    licenseNumber: 'Driving License Number (optional)',
    licenseNumberPlaceholder: 'License number',
    errorServerUnreachable: 'We could not reach the server. Please try again.',
    errorGoogleSignIn: 'Google sign-in failed',
    errorGoogleSignUp: 'Google sign-up failed',
    errorLoginFailed: 'Login failed. Please try again.',
    errorUnexpected: 'An unexpected error occurred. Please try again.',
  },

  verification: {
    title: 'Verification',
    greeting: 'Almost there, %{name}!',
    sentCode: 'We sent a code to your email',
    resend: 'Resend the verification code',
    resendIn: 'Resend in %{seconds}s',
    wrongEmail: 'Wrong email? Start again',
    useDifferentEmail: 'Use a different email',
    goToLogin: 'GO TO LOGIN',
    nothingToVerify: 'Nothing to verify',
    nothingToVerifyBody:
      'We do not know which email to confirm. Sign in and we will pick the verification back up.',
    noMailTransport: 'The server has no mail transport configured — the code is in its logs.',
    alreadyVerified: 'This email is already verified. You can sign in.',
    errorSend: 'Could not send the code. Please try again.',
    errorVerify: 'Could not verify the code. Please try again.',
    errorSignIn: 'Sign-in failed',
  },

  passwordReset: {
    forgotTitle: 'Forgot password?',
    forgotSubtitle: 'We’ll email you a code to reset it',
    sendCode: 'SEND CODE',
    rememberedIt: 'Remembered it? Go back',
    backToSignIn: 'Back to sign in',
    resetTitle: 'Reset password',
    sentCodeTo: 'We sent a code to',
    nothingToReset: 'Nothing to reset',
    nothingToResetBody:
      'We do not know which account to reset. Start again and we will email you a new code.',
    newPasswordTitle: 'Choose a new password',
    startAgainTitle: 'Start again',
    startAgainBody:
      'This reset is no longer valid. Ask for a new code and you can choose a new password.',
    newPassword: 'New Password',
    resendReset: 'Resend the reset code',
    changeEmail: 'Change email',
    errorSend: 'We could not send the code. Please try again.',
    errorChange: 'We could not change your password. Please try again.',
  },

  menu: {
    deliverer: 'Deliverer',
    offline: 'Offline',
    onShift: 'On shift',
    earnings: 'Earnings',
    orderHistory: 'Order history',
    shifts: 'Shifts',
    support: 'Support',
    settings: 'Settings',
    goOffline: 'Go offline',
    logOut: 'Log out',
    closeMenu: 'Close menu',
  },

  delivery: {
    offline: 'Offline',
    findingOrders: 'Finding orders',
    orderFound: 'Order found !',
    deliveryCompleted: 'Delivery Completed',
    goOnline: 'Go online',
    stopSession: 'Stop Session',
    getHelp: 'Get help',
    recentre: 'Recentre the map on me',
    changeMapLayer: 'Change map layer',
    navigate: 'Navigate',
    starting: 'Starting…',
    openMenu: 'Open menu',
    declineOrder: 'Decline order',
    endNavigation: 'End navigation',
    slideToConfirm: 'Slide right to confirm',
    close: 'Close',
    delivery: 'Delivery',
    tapToSeeLocation: 'Tap to see location',
    acceptAndGo: 'Accept and Go',
    validateOrder: 'Validate Order',
    confirmDelivery: 'Confirm Delivery',
    orderDetails: 'Order details',
    expandOrderDetails: 'Expand order details',
    collapseOrderDetails: 'Collapse order details',
    minutesToPickup: '%{count} minutes left to pickup',
    orderReady: 'Your order is ready !',
    expectedArrival: 'Expected arrival : %{time}',
    arrivedAhead: 'Arrived at %{time} - Ahead of time',
    orderTotal: 'Order total · %{count} items',
    tripSummary: '%{minutes} mins (%{km} km) total',
    pickupEta: 'Pickup in about %{minutes} min',
    accepting: 'Accepting…',
  },

  settings: {
    title: 'Settings',
    account: 'Account',
    fullName: 'Full name',
    emailAddress: 'Email address',
    phoneNumber: 'Phone number',
    password: 'Password',
    passwordMask: '••••••••',
    sendingCode: 'Sending code…',
    loadFailed: 'We could not load your account details.',
    editHint: 'Opens an editor for this detail',
    appPreferences: 'App Preferences',
    language: 'Language',
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    legal: 'Legal',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    signOut: 'Sign Out',
    appVersion: 'App Version %{version}',
  },

  appearance: {
    title: 'Appearance',
    system: 'Match system',
    systemHint: 'Follows your device’s light or dark setting.',
    light: 'Light',
    dark: 'Dark',
  },

  language: {
    title: 'Language',
    hint: 'Choose the language the app is shown in. Your device language is used until you pick one.',
    english: 'English (US)',
    french: 'Français',
  },

  editProfile: {
    nameTitle: 'Full name',
    emailTitle: 'Email address',
    phoneTitle: 'Phone number',
    nameHint: 'This is the name customers and support see on your deliveries.',
    emailHint:
      'Your email address is also how you sign in. Change it and the new address becomes your login straight away.',
    phoneHint: 'Dispatch and customers use this number to reach you about an active order.',
    unavailableTitle: 'Profile unavailable',
    unavailableBody:
      'Your deliverer record has not finished setting up yet. Try again in a moment, or sign out and back in.',
    errorEmailTaken: 'That email address is already used by another account.',
    errorRefused: 'Those details were refused. Please check them and try again.',
    errorNoRecord: 'We could not find your deliverer record. Please sign in again.',
    errorUnavailable: 'The account service is unavailable right now. Please try again shortly.',
    errorGeneric: 'We could not save your changes. Please try again.',
  },

  wallet: {
    title: 'Wallet',
    balance: 'Wallet balance',
    history: 'History',
    availableForCashOut: 'Available for cash out',
    cashOutNow: 'Cash Out Now',
    cashOutCaption: 'Instant · %{fee} %{currency} fee · Arrives in minutes',
    managePayoutMethod: 'Manage payout method',
    thisWeek: 'This week',
    trips: 'Trips',
    onlineTime: 'Online time',
    avgPerTrip: 'Avg / trip',
    earningsThisWeek: 'Earnings this week',
    paymentMethod: 'Payment method',
    manage: 'Manage',
    debitCard: 'Debit card',
    primary: 'Primary',
    ordersHistory: 'Orders history',
    seeAll: 'See all',
    viewAllTransactions: 'View all transactions',
    orderTransaction: 'Order #%{number}',
    weeklyBonus: 'Weekly bonus',
    cashOut: 'Cash out',
    today: 'Today, %{time}',
    yesterday: 'Yesterday, %{time}',
    monday: 'Mon, %{time}',
  },

  history: {
    title: 'Delivery History',
    monthRecap: 'CURRENT MONTH RECAP',
    earnedAcross: 'Earned across %{count} trips',
    growth: 'Growth',
    completed: 'Completed',
    cancelled: 'Cancelled',
    today: 'TODAY, %{date}',
    yesterday: 'YESTERDAY, %{date}',
    endOfList: 'You’ve reached the end of this week’s journey.',
  },

  faqs: {
    title: 'FAQs',
    helpCenter: 'HELP CENTER',
    headline: 'How can we help you today?',
    searchPlaceholder: 'Search for answers...',
    clearSearch: 'Clear search',
    noResults: 'No answers matched “%{query}”.',
    topicGuide: 'Quick Guide',
    topicPolicy: 'Policy',
    topicTax: 'Tax',
    gettingStarted: 'Getting Started',
    earnings: 'Earnings & Payments',
    safety: 'Safety & Insurance',
    appSupport: 'App Support',
  },

  faqContent: {
    goOnlineQ: 'How do I go online?',
    goOnlineA:
      'Open the map and tap "Go online". You will start receiving offers as soon as your position is shared with dispatch.',
    noOffersQ: 'Why am I not receiving offers?',
    noOffersA:
      'Offers only reach approved accounts that are online, inside a covered zone and with location permission granted "while using the app".',
    acceptWindowQ: 'How long do I have to accept an offer?',
    acceptWindowA:
      'The countdown on the Accept button is the deadline. If it runs out the order is automatically offered to another deliverer.',
    cashOutQ: 'When can I cash out?',
    cashOutA:
      'Any balance above 10 TND can be cashed out instantly from the Wallet. A 1 TND fee applies and the transfer arrives within minutes.',
    feeQ: 'How is a delivery fee calculated?',
    feeA:
      'A base fare for the trip, plus distance between pickup and drop-off, plus any surge applied to the zone at the time the order was offered.',
    taxesQ: 'Am I responsible for my own taxes?',
    taxesA:
      'Yes. Deliverers are independent contractors, so income declaration is yours to make. Your monthly statement is in Delivery History.',
    accidentQ: 'What do I do after an accident?',
    accidentA:
      'Get to safety first, then report the incident from the active order screen. Support will reassign the order and open a claim for you.',
    coverQ: 'Am I covered while delivering?',
    coverA:
      'Third-party cover applies from the moment you accept an order until it is marked delivered. Your own vehicle insurance still applies otherwise.',
    mapQ: 'The map is not following me',
    mapA:
      'Tap the recentre control on the map. If it keeps drifting, check that precise location is enabled for Hungry in your system settings.',
    loggedOutQ: 'I was logged out unexpectedly',
    loggedOutA:
      'A session ends when the password changes or after a long period offline. Signing in again restores any order still assigned to you.',
  },

  weekdays: {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
  },

  validation: {
    emailRequired: 'Email is required',
    emailInvalid: 'Enter a valid email',
    passwordRequired: 'Password is required',
    passwordTooShort: 'Password must be at least 8 characters',
    passwordConfirm: 'Please confirm your password',
    passwordsDoNotMatch: 'Passwords do not match',
    firstNameRequired: 'First name is required',
    lastNameRequired: 'Last name is required',
    phoneRequired: 'Phone number is required',
    phoneInvalid: 'Enter a valid phone number',
    vehicleRequired: 'Choose how you deliver',
    licensePlateRequired: 'License plate is required for a motorized vehicle',
  },
};

/**
 * The catalogue's shape with plain `string` values. Deliberately not
 * `typeof en` with `as const`: that would type every French entry as the
 * English literal it must equal, which is the opposite of the point. This keeps
 * the key structure — so a missing or misspelled key still fails — while
 * leaving the values free.
 */
export type TranslationCatalog = {
  [Section in keyof typeof en]: Record<keyof (typeof en)[Section], string>;
};
