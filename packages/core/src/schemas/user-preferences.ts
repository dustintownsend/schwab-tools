import { Schema } from "effect";

export const UserPreferenceAccount = Schema.Struct({
  accountNumber: Schema.String,
  primaryAccount: Schema.optional(Schema.Boolean),
  type: Schema.optional(Schema.NullOr(Schema.String)),
  nickName: Schema.optional(Schema.NullOr(Schema.String)),
  accountColor: Schema.optional(Schema.NullOr(Schema.String)),
  displayAcctId: Schema.optional(Schema.NullOr(Schema.String)),
  autoPositionEffect: Schema.optional(Schema.Boolean),
});
export type UserPreferenceAccount = typeof UserPreferenceAccount.Type;

export const StreamerInfo = Schema.Struct({
  streamerSocketUrl: Schema.optional(Schema.NullOr(Schema.String)),
  schwabClientCustomerId: Schema.optional(Schema.NullOr(Schema.String)),
  schwabClientCorrelId: Schema.optional(Schema.NullOr(Schema.String)),
  schwabClientChannel: Schema.optional(Schema.NullOr(Schema.String)),
  schwabClientFunctionId: Schema.optional(Schema.NullOr(Schema.String)),
});
export type StreamerInfo = typeof StreamerInfo.Type;

export const Offer = Schema.Struct({
  level2Permissions: Schema.optional(Schema.Boolean),
  mktDataPermission: Schema.optional(Schema.NullOr(Schema.String)),
});
export type Offer = typeof Offer.Type;

export const UserPreference = Schema.Struct({
  accounts: Schema.optional(
    Schema.NullOr(Schema.Array(UserPreferenceAccount))
  ),
  streamerInfo: Schema.optional(
    Schema.NullOr(Schema.Union(Schema.Array(StreamerInfo), StreamerInfo))
  ),
  offers: Schema.optional(
    Schema.NullOr(Schema.Union(Schema.Array(Offer), Offer))
  ),
});
export type UserPreference = typeof UserPreference.Type;

export const UserPreferenceArray = Schema.Array(UserPreference);

export const UserPreferenceEnvelope = Schema.Struct({
  preferences: Schema.Array(UserPreference),
});

export const UserPreferenceSingleEnvelope = Schema.Struct({
  preference: UserPreference,
});
