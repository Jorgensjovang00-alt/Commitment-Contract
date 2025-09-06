# Kravspesifikasjon og Plan (Commitment Contract for trening)

## 1. Funksjoner (MVP)
- Påmelding/innlogging (e‑post magisk lenke eller SMS kode)
- Opprett «commitment contract»: beløp, periode (1–4 uker), ukentlig mål (f.eks. 3 økter)
- Betalingsinnsats: reserveres på kort (authorization hold)
- Treningsregistrering: geofence på treningssenter eller selfie + tidsstempel
- Status: aktiv kontrakt, gjenstående økter denne uken og totalt
- Historikk: fullførte/ikke fullførte utfordringer, innsatsutfall
- Varsler: påminnelser, ukentlig oppgjør
- Regler: tydelige vilkår for tap/gevinst

## 2. Brukerreise
1) Registrering → velger innlogging (e‑post/SMS)
2) Onboarding → mål og preferanser
3) Opprett kontrakt → velg beløp, periode, ukentlig mål → godkjenn vilkår
4) Betaling → reservasjon av innsats
5) Trening → innsjekk (GPS geofence eller selfie) → logg økt
6) Oppfølging → varsler for neste økt, ukentlig status
7) Oppgjør → ved periodeslutt: oppfylte mål? Ja: frigjør reservasjon. Nei: capture og overfør til app-konto
8) Historikk → vis utfallet og læringspunkter

## 3. Wireframes (tekstlig)
- Registrering/Onboarding: felt for e‑post/telefon, knapper for metode
- Hjem/Status: «Uke 2/4», «Økter igjen: 1», «Saldo: 50 kr (reservert)», «Sjekk inn»
- Opprett kontrakt: beløp (valg), periode (uker), mål/uke, vilkår-kryss, «Reserver innsats»
- Innsjekk: «Start økt», GPS-status, «Hold deg i 30 min» (timer), «Fullfør økt»
- Historikk: kort for hver uke/kontrakt, utfall, datoer
- Innstillinger: varsler, personvern, betalingsmetoder

## 4. Teknologi og arkitektur
- Frontend: React Native (Expo)
- Auth og DB: Supabase (email/SMS OTP, RLS, Postgres)
- Betaling: Stripe Payment Intents (authorize → capture/cancel)
- Push: Expo Notifications
- Geolokasjon: Expo Location
- Backend: Supabase Edge Functions for sikre operasjoner (init/confirm payment, settle contract)

## 5. Datamodell (foreslått)
- users (id, created_at, phone/email)
- contracts (id, user_id, status: draft|active|succeeded|failed|cancelled, start_at, end_at, stake_amount, weekly_target)
- payments (id, contract_id, stripe_payment_intent_id, status: requires_action|authorized|captured|canceled)
- checkins (id, contract_id, occurred_at, method: geofence|selfie, duration_min, location)
- weekly_progress (id, contract_id, week_index, required, completed)

Tilstandsmaskin for kontrakt:
- draft → (payment authorized) → active → (period end & goal met) → succeeded
- draft → (auth failed) → cancelled
- active → (goal not met at end) → failed
- failed → (capture payment) → terminal
- succeeded → (cancel payment) → terminal

## 6. Compliance og sikkerhet
- Personvern: samtykke til lokasjon/selfie, dataminimering, sletting på forespørsel
- Sikkerhet: RLS i DB; kun bruker kan lese egne kontrakter; signerte backend‑kall for betaling
- Betaling: autorisasjon/hold. Ingen midler eies av oss før tap bekreftes. Refund/cancel ved suksess
- Ikke gambling: ingen tilfeldighet; egeninnsats og tydelige kriterier; klare vilkår

## 7. Test og lansering
- Enhetstester: kontraktlogikk (oppgjør), tidsgrenser, geofence
- Integrasjon: Stripe auth/capture/cancel i sandbox
- E2E: opprette → trene X ganger → suksess/feil → oppgjør
- Soft launch: liten kohort, A/B: selfie vs geofence, mål konvertering/fullføring

## 8. Risikovurdering (kort)
- Lokasjonsfusk → kombiner geofence + varighet + sporadisk selfie
- Tidszoner/ukeskille → lås til brukerens tz ved opprettelse
- Betalingsfeil → retry/logg; «grace period» og manuell admin
