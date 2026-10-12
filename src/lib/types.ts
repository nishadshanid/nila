// Hand-written row types. Once the schema settles, `npm run db:types`
// generates src/lib/database.types.ts from the live database.

export type Profile = {
  id: string;
  name: string;
  email: string;
  color: string;
  email_notifications: boolean;
  digest_time: string;
  created_at: string;
  updated_at: string;
};
