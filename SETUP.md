# Whim — Launch Setup Guide

Everything you need to go from zero to live on the App Store.
Do these steps **in order** — each one feeds into the next.

---

## Step 1 — Create the Supabase project (10 min)

Supabase is the database + auth backend. Free tier is fine to start.

1. Go to **[supabase.com](https://supabase.com)** → Sign Up (GitHub login is easiest)
2. Click **New project**
   - Organization: your name / personal
   - Name: `Whim`
   - Database password: generate a strong one and **save it in 1Password**
   - Region: **US East (N. Virginia)** — closest to NYC users
3. Wait ~2 min for the project to spin up
4. Go to **Project Settings → API**
5. Copy two values into your `.env` file:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Run the database migrations

6. Go to **SQL Editor** (left sidebar) → **New Query**
7. Paste the entire contents of `supabase/migrations/001_profiles.sql` → **Run**
   - This creates the `profiles` table, Row Level Security policies, and the auto-create-profile trigger
8. **Create the storage bucket:**
   - Go to **Storage** (left sidebar) → **New bucket**
   - Name: `profile-photos`
   - Toggle **Public bucket** ON
   - Click **Create bucket**
9. Back in **SQL Editor** → **New Query**, paste `supabase/migrations/002_storage.sql` → **Run**
   - This adds upload/read/delete policies for the photo bucket

You now have a working backend. Leave Supabase open — you'll come back in Step 3.

---

## Step 2 — Set up Google OAuth credentials (20 min)

You need three OAuth client IDs: Web (for Supabase), iOS, and Android.

### 2a. Create the Google Cloud project

1. Go to **[console.cloud.google.com](https://console.cloud.google.com)**
2. Top bar → project dropdown → **New Project**
   - Name: `Whim`
   - Click **Create**
3. Make sure "Whim" is selected in the project dropdown

### 2b. Configure the OAuth consent screen

4. Left sidebar → **APIs & Services → OAuth consent screen**
5. User type: **External** → **Create**
6. Fill in:
   - App name: `Whim`
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue**
7. **Scopes** step → click **Add or Remove Scopes** → add:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar.events`
   - Click **Update** → **Save and Continue**
8. **Test users** → add your own Gmail address → **Save and Continue**
9. Click **Back to Dashboard**

### 2c. Create the three OAuth client IDs

Go to **APIs & Services → Credentials** → **Create Credentials → OAuth Client ID**

**Client 1 — Web application** (Supabase uses this)
- Type: **Web application**
- Name: `Whim Web`
- Authorized redirect URIs → **Add URI**:
  - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`  
    _(Replace YOUR_PROJECT_REF with your Supabase project ref — visible in the Project URL)_
- Click **Create**
- **Copy the Client ID and Client Secret** — you'll need both in Step 3

**Client 2 — iOS**
- Type: **iOS**
- Name: `Whim iOS`
- Bundle ID: `com.whim.app`
- Click **Create**
- Copy the **Client ID** → paste as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in `.env`

**Client 3 — Android** (optional for first launch, required before Play Store)
- Type: **Android**
- Name: `Whim Android`
- Package name: `com.whim.app`
- SHA-1 certificate: run `eas credentials` after Step 4 to get this — skip for now
- Click **Create** (SHA-1 can be added later)
- Copy the **Client ID** → paste as `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` in `.env`

Also paste the **Web Client ID** as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env`.

### 2d. Connect Google to Supabase

Back in **Supabase → Authentication → Providers → Google**:
- Toggle Google **Enabled** ON
- **Client ID (for iOS)**: paste the Web Client ID from above
- **Client Secret**: paste the Web Client Secret from above
- Click **Save**

---

## Step 3 — Verify your `.env` file

Your `.env` should now look like this (with real values):

```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...long-key...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-xyz.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-def.apps.googleusercontent.com
```

Test it: `npm start` → open in Expo Go → try signing up with email and with Google.
The app auto-falls back to mock mode when `.env` isn't filled in, so if auth now asks
for real credentials you know it's wired up.

---

## Step 4 — Set up EAS (Expo Application Services)

EAS handles building and submitting the app — no Xcode required.

```bash
# Install EAS CLI globally (one time)
npm install -g eas-cli

# Log in with your Expo account (create one free at expo.dev if needed)
eas login

# Link this project to your Expo account
eas init
```

After `eas init`, it will give you a **Project ID**. Paste it into `app.json`:
```json
"extra": {
  "eas": {
    "projectId": "PASTE_YOUR_PROJECT_ID_HERE"
  }
}
```

---

## Step 5 — Apple Developer Program (for App Store)

You need an active Apple Developer membership ($99/year) to submit to the App Store.

1. Go to **[developer.apple.com](https://developer.apple.com)** → **Enroll**
2. Sign in with your Apple ID → follow the enrollment flow
3. Pay $99 — it activates within a few hours to a day
4. Once active, go to **[developer.apple.com/account](https://developer.apple.com/account)**
5. Look for **Membership details → Team ID** — it's a 10-character code like `ABC123DEF4`
6. Fill in `eas.json` with your real values:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your@email.com",
      "ascAppId": "SEE STEP 6",
      "appleTeamId": "YOUR_TEAM_ID_HERE"
    }
  }
}
```

### Set up code signing (let EAS handle it)

```bash
eas credentials
```

Follow the prompts — EAS will create and manage your Distribution Certificate and
Provisioning Profile automatically. You'll need to enter your Apple ID password.

---

## Step 6 — Create the App Store listing

Before you can submit a build, Apple needs an app record in App Store Connect.

1. Go to **[appstoreconnect.apple.com](https://appstoreconnect.apple.com)**
2. **My Apps → +** → **New App**
   - Platform: iOS
   - Name: `Whim`
   - Primary language: English (U.S.)
   - Bundle ID: `com.whim.app` _(should appear if your Developer account is active)_
   - SKU: `whim-app-001` (any unique string)
3. Click **Create**
4. In the app page URL you'll see a number: `apps.apple.com/app/id1234567890`
   - That number is your **App Store Connect App ID** (`ascAppId` in eas.json)
5. Paste it into `eas.json` → `submit.production.ios.ascAppId`

Fill in the App Store listing details:
- Screenshots (at least iPhone 6.5" + 5.5")
- Description, keywords, support URL, privacy policy URL
- Age rating
- Pricing: Free

---

## Step 7 — App icon and splash screen

The placeholder assets (1×1 px) need to be replaced before submitting.

| File | Required size | Notes |
|------|--------------|-------|
| `assets/icon.png` | 1024×1024 px | No transparency, no rounded corners (Apple rounds them) |
| `assets/splash.png` | 1284×2778 px | The `#FF6B35` background is already set; center your logo |
| `assets/adaptive-icon.png` | 1024×1024 px | Android only; can have transparency |

Tools: **Figma**, Canva, or any image editor. Export as PNG.

---

## Step 8 — Build and submit

### First build (takes ~15–20 min)

```bash
npm run build:ios
```

EAS will:
1. Upload your code to the cloud
2. Build the IPA file on an Apple Silicon Mac server
3. Sign it with your certificates
4. Store the build in your Expo dashboard

### Submit to TestFlight (internal testing)

```bash
npm run submit:ios
```

EAS uploads the IPA to App Store Connect. You'll get an email when it's processed (~30 min).

Then in App Store Connect → **TestFlight** → add yourself as an internal tester.
You can test on your real iPhone before submitting for App Store review.

### Submit for App Store review

In App Store Connect → **App Store** tab → fill in all the metadata → **Submit for Review**.
Apple review takes 1–3 days for a new app.

---

## Quick reference — daily development commands

```bash
npm start              # Start Expo dev server (use Expo Go to test)
npm run build:dev      # Build a development client (for testing with native modules)
npm run build:preview  # Build for internal device testing (no App Store)
npm run build:ios      # Production build → App Store
npm run submit:ios     # Submit latest production build to App Store
```

---

## Troubleshooting

**Google sign-in shows "Error 400: redirect_uri_mismatch"**
→ The redirect URI in Google Cloud Console doesn't match what the app sends.
→ Add `whim://` to Authorized redirect URIs in your OAuth credentials.

**"User not found" after Google sign-in**
→ The Supabase trigger might not have fired. Go to SQL Editor and manually run:
```sql
select * from public.profiles where id = 'USER_UUID_FROM_AUTH_TABLE';
```
If missing, the `handle_new_user` trigger didn't run — re-run `001_profiles.sql`.

**Build fails: "Missing iOS credentials"**
→ Run `eas credentials` and follow the prompts.

**"Invalid team ID" during submit**
→ Check your Apple Developer Team ID at developer.apple.com/account → Membership.
