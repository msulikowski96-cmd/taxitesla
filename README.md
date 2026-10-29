# TaxiTesla – aplikacja mobilna premium taxi (Poznań)

Aplikacja na iPhone i Androida do zamawiania przejazdów Teslą z kierowcą, z kontami klientów, oraz prosty serwer z panelem dyspozytora.

```
app/      Aplikacja mobilna (Expo / React Native, TypeScript) – iOS, Android i web
server/   API (Node.js + Express) + panel dyspozytora pod /admin
```

## Co potrafi aplikacja

**Klient**
- Zakłada konto: imię, nazwisko, telefon (walidacja polskich i zagranicznych numerów), e-mail, hasło, zgody RODO
- Loguje się e-mailem **lub** numerem telefonu
- Zamawia przejazd:
  - adres odbioru i cel (wpisany ręcznie, „moja lokalizacja” z GPS albo szybki wybór: Ławica, Dworzec, Stary Rynek, MTP, Berlin BER, Lotnisko Chopina…)
  - teraz albo na konkretny dzień i godzinę (do 14 dni wprzód)
  - przejazd Teslą Model Y (do 4 osób, 4 bagaże)
  - liczba pasażerów, dodatki (fotelik, powitanie z tabliczką, zwierzę, bagaż), numer lotu przy transferach lotniskowych
  - płatność: karta/BLIK w aucie, gotówka lub faktura VAT dla firmy (NIP sprawdzany sumą kontrolną)
  - **cena widoczna przed zamówieniem** (taryfa dzienna/nocna)
- Śledzi status: oczekuje → potwierdzony → kierowca w drodze → w trakcie → zakończony
- Widzi kierowcę (imię, auto, rejestracja) i może do niego zadzwonić
- Anuluje przejazd, przegląda historię
- Edytuje dane kontaktowe i dane do faktury, usuwa konto (RODO)
- Szybki kontakt z dyspozytorem: telefon, WhatsApp, e-mail

**Dyspozytor** (`/admin` na serwerze)
- Lista nowych i aktywnych zamówień z danymi i telefonem klienta
- Przydzielanie kierowcy, zmiana statusu i ceny – klient widzi zmiany w aplikacji w ciągu kilku sekund

## Konfiguracja firmy

Nazwa, telefon dyspozytora i e-mail: `app/src/config.ts`
Cennik: `app/src/lib/pricing.ts` **oraz** `server/src/pricing.js` (serwer liczy cenę ostatecznie)
Popularne miejsca: `app/src/lib/places.ts`

Domyślny cennik (zł):

| Auto | Opłata startowa | za km | minimum |
|---|---|---|---|
| Tesla Model Y | 18 | 4,80 | 40 |

Noc (22:00–6:00): +20%. Dystans liczony z odległości w linii prostej × 1,3.

## Uruchomienie

### 1. Aplikacja w trybie demo (bez serwera)

```bash
cd app
npm install
npx expo start
```

Zeskanuj kod QR aplikacją **Expo Go** na telefonie. W trybie demo konta i przejazdy zapisują się tylko na telefonie, a „dyspozytor” automatycznie potwierdza przejazd po kilku sekundach.

### 2. Serwer

```bash
cd server
npm install
JWT_SECRET="$(openssl rand -hex 32)" ADMIN_TOKEN="$(openssl rand -hex 16)" npm start
```

Zmienne środowiskowe:

| Zmienna | Opis |
|---|---|
| `JWT_SECRET` | sekret do logowania, min. 32 znaki (wymagane) |
| `ADMIN_TOKEN` | hasło do panelu dyspozytora, min. 16 znaków (wymagane) |
| `PORT` | port, domyślnie 3000 |
| `DATA_DIR` | folder na bazę danych (`db.json`), domyślnie `server/data` |
| `CORS_ORIGIN` | dozwolona domena dla wersji web, domyślnie `*` |

Panel dyspozytora: `http://localhost:3000/admin/`

### 3. Aplikacja połączona z serwerem

```bash
cd app
EXPO_PUBLIC_API_URL=https://twoj-serwer.pl npx expo start
```

## Testy i kontrola jakości

```bash
cd server && npm test            # testy API
cd app && npm run typecheck && npm run lint
```

## Publikacja w App Store i Google Play

```bash
cd app
npx eas-cli@latest build --platform all
npx eas-cli@latest submit
```

Potrzebne: konto Apple Developer (99 USD/rok) i Google Play Console (25 USD jednorazowo), ikona i ekran startowy w `app/assets`, polityka prywatności i regulamin pod publicznym adresem.

## Co warto dodać przed startem produkcyjnym

- Baza PostgreSQL zamiast pliku JSON (API zostaje bez zmian)
- Weryfikacja numeru telefonu kodem SMS (np. SMSAPI.pl) i reset hasła
- Mapa i autouzupełnianie adresów (Google Places / Mapbox) dla dokładniejszych cen
- Płatności online w aplikacji (Stripe / Przelewy24 / BLIK)
- Powiadomienia push o zmianie statusu (expo-notifications)
- Aplikacja dla kierowców z lokalizacją na żywo
- Uwaga prawna: „Tesla” to znak towarowy Tesla, Inc. – opis floty („jeździmy Teslami”) jest zwykle w porządku, ale nazwę firmy i logo warto skonsultować z prawnikiem
