export enum RedisKey {
  USERNAMES = 'usernames',
  AVAILABLE_USERNAMES = 'available_usernames',

  PHONES = 'phones',
  AVAILABLE_PHONES = 'available_phones',

  EMAILS = 'emails',
  AVAILABLE_EMAILS = 'available_emails',

  // * locking
  USER_ORDER_LOCKING = 'user-order-locking',
  USER_TRANSACTION_LOCKING = 'user-transaction-locking',
  WALLET_TRANSACTION_LOCKING = 'wallet-transaction-locking',
  ORDER_TRANSACTION_LOCKING = 'order-transaction-locking',
  EVENT_DRAWING_LOCKING = 'event-drawing-locking',

  VERIFICATION_TIMEOUT = 'verification_timeout',
  VERIFICATIONS = 'verifications',
  BLACK_LIST_VERIFICATIONS = 'black_list_verifications',
  LIMIT_EMAIL_REGISTER_VERIFICATIONS = 'limit_email_register_verifications',
  LIMIT_EMAIL_RESET_PASSWORD_VERIFICATIONS = 'limit_email_reset_password_verifications',

  ACCESS_SESSIONS = 'access_sessions',
  REFRESH_SESSIONS = 'refresh_sessions',
  SESSIONS = 'sessions',
  BLACK_LIST_SESSIONS = 'black_list_sessions',
  BLACK_LIST_REFRESH_TOKENS = 'black_list_refresh_tokens',
  BLACK_LIST_ACCESS_TOKENS = 'black_list_access_tokens',

  WEB_CRAWLER = 'web_crawler',
}
