Repo at
https://github.com/MistaWasabi/Learner-Portal


How to get the project Going
1. Open Terminal (Learner-Portal)
2. run "npm i"
3. run "npm run dev"


Firebase Setup
1. Copy `.env.example` and rename the copy to `.env.local`
2. Add the Firebase Web App settings from Firebase Console into `.env.local`
3. In Firebase Console, enable Authentication → Email/Password
4. In Firestore Database → Rules, copy in `firestore.rules` from this project and Publish


What the App has Currently
- Login and Registration through Firebase Authentication
- Home Screen with a persistent side bar
- Task Manager
- Document Library using Firestore links
- Learning Courses and Lesson Completion
- Learner Progress Screen


Important
- Login is controlled by Firebase Users
- Login survives refreshes during the current browser session, then ends when the browser session ends
- Passwords are never stored in Firestore, cookies, local storage, session storage, or source code
- Firebase manages the session-only authentication credential needed to restore a login; the app does not write credentials or profile data to browser storage
- Learner Progress can be seen only by users with a Firebase Custom Claim of `admin` or `teacher`


Custom Roles
1. Deploy the Functions and Firestore rules after following the commands below.
2. In Firebase Console, open Project settings → Service accounts and create a private key. Keep its JSON file outside this project.
3. In PowerShell, set the file path for this terminal only: `$env:FIREBASE_SERVICE_ACCOUNT_PATH = 'C:\path\to\service-account.json'`
4. Seed the initial admin: `node .\functions\scripts\set-role.mjs admin aidanbeckley83@gmail.com`
5. To promote a teacher later: `node .\functions\scripts\set-role.mjs teacher teacher@example.com`
6. A person whose role changes must sign out and sign in again before their new Custom Claim is available in the app.
