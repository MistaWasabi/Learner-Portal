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
- Login does not stay cached after refresh
- Passwords are never stored in Firestore, cookies, or local storage
- Current learner progress can be seen by signed-in users for now
