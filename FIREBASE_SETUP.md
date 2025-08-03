# Firebase Setup Guide

## Current Issues

Your app is experiencing Firebase errors:

1. `auth/configuration-not-found` - Authentication configuration issue
2. `400 (Bad Request)` - Firestore security rules blocking writes

## Quick Fixes

### 1. Enable Anonymous Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `bookrec-d5c37`
3. Go to **Authentication** → **Sign-in method**
4. Enable **Anonymous** authentication
5. Click **Save**

### 2. Update Firestore Security Rules

1. Go to **Firestore Database** → **Rules**
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to book customizations
    match /artifacts/{appId}/public/data/bookCustomizations/{document} {
      allow read, write: if true;
    }

    // Default rule - deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish**

### 3. Verify Project Configuration

Make sure your Firebase config in `js/app.js` matches your project:

- Project ID: `bookrec-d5c37`
- API Key: `AIzaSyCSVx_kO5BihsOLuBgpxD_WUVPRy_NiWb0`

### 4. Add GitHub Pages Domain (for production)

If you're deploying to GitHub Pages, you need to add the domain to Firebase:

1. Go to **Firebase Console** → **Authentication** → **Settings** → **Authorized domains**
2. Add your GitHub Pages domain: `ranyavaid.github.io`
3. Go to **Firestore Database** → **Rules** and ensure they allow your domain
4. If using a custom domain, add that as well

### 5. Test Firebase Connection

To test if Firebase is working:
1. Open browser console (F12)
2. Look for Firebase authentication messages
3. Try creating a shareable link
4. Check for any error messages in the console

## Fallback Solution

The app now includes fallback functionality:

- If Firebase fails, it will use localStorage for sharing
- Local shareable links will work without Firebase
- The app will continue to function even without Firebase

## Testing

1. After making the above changes, refresh your app
2. Try creating a shareable link
3. Check the browser console for any remaining errors

## Alternative: Disable Firebase

If you want to use only localStorage (no Firebase):

1. Comment out the Firebase imports in `js/app.js`
2. The app will work with local storage only
3. Shareable links will be local-only
