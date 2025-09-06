# Commitment Contract App (MVP)

Motiverer trening via «commitment contract»: brukeren reserverer en innsats (f.eks. 50 kr) og setter et mål (x økter i en periode). Fullfører de, frigjøres reservasjonen. Hvis ikke, fanges beløpet iht. vilkår.

## Kom i gang

```bash
npm install
npm run ios  # eller npm run android / npm run web
```

Konfigurasjon (senere):
- STRIPE_PUBLISHABLE_KEY
- API_BASE_URL
- Expo push notifications via prosjektet

### Supabase miljøvariabler
Legg inn i `app.config.js` eller via Expo env:

```js
// app.config.js (alternativt bruk app.json med runtime env)
export default () => ({
  expo: {
    extra: {
      eas: { projectId: 'REPLACE_WITH_YOUR_EAS_PROJECT_ID' },
      EXPO_PUBLIC_SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'YOUR_ANON_KEY'
    }
  }
});
```

### Kjør database-skjema
Kopier `supabase/schema.sql` inn i Supabase SQL editor og kjør. Dette oppretter tabeller for `contracts`, `payments`, `checkins` med RLS-policyer.

## Dokumentasjon
Se `docs/SPEC.md` for krav, brukerreise, arkitektur, datamodell, compliance og testplan.

## Stripe og Supabase Edge Functions (stub)
1) Installer Supabase CLI og logg inn.
2) Deploy funksjoner:
   - `supabase functions deploy authorize`
   - `supabase functions deploy capture`
   - `supabase functions deploy cancel`
3) Sett Stripe publishable key i `app.json` under `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
4) Når ekte Stripe er klart, bytt ut funksjonsinnholdene med kall til Stripe PaymentIntents:
   - authorize: create PI med `capture_method=manual`
   - capture: `paymentIntents.capture`
   - cancel: `paymentIntents.cancel`

## Anti-juks og juridisk
- SQL: triggere blokkerer innsjekk utenfor kontrakt og rate-limiter innsjekk.
- `profiles`: samtykker og rolle. `push_tokens`: lagring av Expo-token.
- App: krever samtykke til `TERMS.md` og `PRIVACY.md` ved kontraktsopprettelse.
- Innsjekk: lokasjon + 60s nærvær (dev) + sporadisk selfie.

## Serverstyrte varsler (cron)
Deploy: `supabase functions deploy reminders` og sett cron i Supabase for å kjøre periodisk.
