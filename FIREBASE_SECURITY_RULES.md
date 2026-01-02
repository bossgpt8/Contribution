# Firestore Security Rules

To keep your boxes secure, apply these rules in your Firebase Console (Build > Firestore Database > Rules):

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /app/state {
      // Allow reading for everyone
      allow read: if true;
      
      // Allow updates if they are only claiming a box (not changing secrets)
      // or if you want to leave it open for now while testing.
      // FOR FULL SECURITY: Only allow updates if the user is an admin.
      allow write: if true; 
    }
  }
}
```

### Recommendation for Production:
Since this is a simple app without a full login system, the above rules allow anyone to write. 
To make it **TRULY** secure for adults:
1. Use Firebase Authentication to sign yourself in as an admin.
2. Change the `allow write` rule to: `allow write: if request.auth != null;`
