# GrahakBook - Hyperlocal Community Commerce Platform for India 🏪

**GrahakBook** digitizes street-side kirana stores and connects them with their real neighborhood customers within a 2-3 km radius. By avoiding dark stores and predatory commissions, we charge shopkeepers 3-5% per order and ₹299-799/month SaaS, prioritizing community trust over speed.

---

## Tech Stack
* **Frontend**: React Native with Expo (Expo Router for navigation, Expo Location for GPS)
* **Backend**: Node.js & Express (TypeScript, Zod for validation)
* **Database**: PostgreSQL (Prisma ORM for schema definition & migrations)
* **Payments & Integrations**: Razorpay (payments & subscriptions), WhatsApp Cloud API (order alerts), ONDC Protocol (distribution)

---

## Project Structure

```
grahakbook/
├── backend/                       # Express Node.js Backend Server
│   ├── src/
│   │   ├── config/                # Prisma client & configuration loader
│   │   ├── controllers/           # Onboarding & business logic handlers
│   │   ├── middleware/            # Zod validation & global errors
│   │   ├── routes/                # Route definitions
│   │   └── app.ts                 # Express entry file
│   └── prisma/
│       └── schema.prisma          # PostgreSQL models
└── mobile/                        # React Native Mobile App (Expo)
    ├── app/                       # File-based navigation screens
    │   ├── index.tsx              # Welcome screen / User Role selection
    │   └── shopkeeper/
    │       ├── onboard.tsx        # Shopkeeper onboarding screen
    │       └── dashboard.tsx      # Shopkeeper dashboard panel
    └── src/
        └── constants/
            └── localization.ts    # Hinglish & English labels/color design tokens
```

---

## Local Development Setup

### 1. Database Setup
1. Spin up a local PostgreSQL database or create a hosted instance on Supabase/AWS RDS.
2. In `backend/.env`, configure the database connection string:
   ```ini
   DATABASE_URL="postgresql://username:password@localhost:5432/grahakbook?schema=public"
   ```

### 2. Backend Installation & Start
```bash
cd backend
npm install

# Run database migrations and generate the Prisma Client
npx prisma migrate dev --name init

# Start the development server (runs on port 5000)
npm run dev
```

### 3. Mobile App Installation & Launch
```bash
cd mobile
npm install

# Start the Expo development server
npm run start
```
* Use an Android Emulator, iOS Simulator, or install the Expo Go app on your physical device and scan the QR code to run the application.

---

## Phase 1 Onboarding API Details

### Onboard Shopkeeper
* **URL**: `/api/shopkeepers/onboard`
* **Method**: `POST`
* **Request Body Schema**:
  ```json
  {
    "ownerName": "Ramesh Kumar",
    "shopName": "Ramesh Kirana Store",
    "phoneNumber": "9876543210",
    "pinCode": "452001",
    "address": "Shop No. 12, SNG Plaza, Main Road",
    "city": "Indore",
    "latitude": 22.7196,
    "longitude": 75.8577,
    "saasPlan": "BASIC"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Shopkeeper onboarded successfully",
    "hinglish": {
      "welcome": "Badhaai ho Ramesh Kumar! Aapki dukaan \"Ramesh Kirana Store\" GrahakBook par register ho gayi hai.",
      "subscriptionInfo": "Aapka 30-din ka free trial shuru ho chuka hai. Ye 03/07/2026 tak valid hai."
    },
    "data": {
      "id": "uuid-string-xxxx-yyyy",
      "ownerName": "Ramesh Kumar",
      "shopName": "Ramesh Kirana Store",
      "phoneNumber": "9876543210",
      "city": "Indore",
      "saasPlan": "BASIC",
      "saasStatus": "TRIAL",
      "saasExpiresAt": "2026-07-03T11:32:57.000Z",
      "createdAt": "2026-06-03T11:32:57.000Z"
    }
  }
  ```
