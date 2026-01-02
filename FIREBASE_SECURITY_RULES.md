# Firestore Security Rules

To keep your boxes secure, apply these rules in your Firebase Console (Build > Firestore Database > Rules):

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /app/state {
      // Allow reading for everyone
      allow read: if true;
      
      // ONLY allow updates if the user is authenticated (Admin)
      allow write: if request.auth != null; 
    }
  }
}
```

### Recommendation for Production:
Since this is a simple app without a full login system, the above rules allow anyone to write. 
To make it **TRULY** secure for adults:
1. Use Firebase Authentication to sign yourself in as an admin.
2. Change the `allow write` rule to: `allow write: if request.auth != null;`
