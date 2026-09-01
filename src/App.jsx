import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { auth, authPersistenceReady, db } from './firebase'
import './App.css'

// Basic format check used before Firebase receives the email address.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Select options keep the first task version focused while still giving learners useful choices.
const taskCategories = ['General', 'JavaScript', 'Project', 'Support']
const taskPriorities = ['low', 'medium', 'high']

// One source of truth keeps the sidebar labels and the selected screen in sync.
const portalScreens = [
  { id: 'home', label: 'Home' },
  { id: 'learning', label: 'Learning' },
  { id: 'progress', label: 'Learner progress' },
  { id: 'tasks', label: 'Task manager' },
  { id: 'documents', label: 'Document library' },
]

// Course content is kept in the application for this learner-facing first version.
// Firestore stores only which courses each learner has personally selected.
const courseCatalog = [
  {
    id: 'web-development-basics',
    title: 'Web Development Basics',
    level: 'Beginner',
    duration: '3 hours',
    description: 'Understand how webpages are structured, styled, and delivered in a browser.',
    lessons: [
      { id: 'html-foundations', title: 'HTML foundations', duration: '35 min', summary: 'Build meaningful page structure with headings, paragraphs, links, and lists.' },
      { id: 'css-layouts', title: 'CSS layouts', duration: '45 min', summary: 'Use spacing, Flexbox, and Grid to arrange content clearly.' },
      { id: 'responsive-design', title: 'Responsive design', duration: '40 min', summary: 'Adapt a page so it works well on phones, tablets, and desktops.' },
    ],
  },
  {
    id: 'javascript-fundamentals',
    title: 'JavaScript Fundamentals',
    level: 'Beginner',
    duration: '4 hours',
    description: 'Learn the building blocks used to add behaviour and logic to a webpage.',
    lessons: [
      { id: 'variables-values', title: 'Variables and values', duration: '40 min', summary: 'Store and reuse information with clear variable names and data types.' },
      { id: 'conditions-loops', title: 'Conditions and loops', duration: '50 min', summary: 'Make decisions and repeat work with predictable program flow.' },
      { id: 'functions-events', title: 'Functions and events', duration: '50 min', summary: 'Organise reusable code and respond to learner actions in the browser.' },
    ],
  },
  {
    id: 'professional-communication',
    title: 'Professional Communication',
    level: 'Essential',
    duration: '2 hours',
    description: 'Practise clear written communication for teamwork, support, and professional learning.',
    lessons: [
      { id: 'clear-messages', title: 'Writing clear messages', duration: '30 min', summary: 'Structure short messages so their purpose and next step are easy to understand.' },
      { id: 'feedback', title: 'Giving useful feedback', duration: '35 min', summary: 'Give specific, respectful feedback that helps a teammate improve.' },
      { id: 'professional-email', title: 'Professional email', duration: '30 min', summary: 'Use subject lines, tone, and structure appropriate for a workplace email.' },
    ],
  },
]

// Creates fresh state whenever the task form is cleared after a save or cancelled edit.
function createEmptyTask() {
  return {
    title: '',
    category: 'General',
    dueDate: '',
    priority: 'medium',
    completed: false,
  }
}

/** Renders either the login form or the authenticated Home page. */
function App() {
  // Stores the values currently typed into the login form.
  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Controls interface feedback and the currently signed-in Firebase user.
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [signedInUser, setSignedInUser] = useState(null)

  // Identifies whether the shared form is creating an account or signing one in.
  const isRegistration = authMode === 'register'

  /** Returns a username validation message, or an empty string when valid. */
  function validateUsername(value) {
    if (!value.trim()) return 'Username is required.'
    if (value.trim().length < 2) return 'Username must contain at least 2 characters.'
    return ''
  }

  /** Returns an email validation message, or an empty string when valid. */
  function validateEmail(value) {
    if (!value.trim()) return 'Email address is required.'
    if (!emailPattern.test(value.trim())) return 'Enter a valid email address.'
    return ''
  }

  /** Returns a password validation message, or an empty string when present. */
  function validatePassword(value) {
    if (!value) return 'Password is required.'
    if (isRegistration && value.length < 6) {
      return 'Password must contain at least 6 characters.'
    }
    return ''
  }

  /** Converts Firebase errors into clear messages for the form. */
  function getAuthError(error) {
    if (error.code === 'auth/email-already-in-use') {
      return 'An account already exists with this email address.'
    }
    if (error.code === 'auth/weak-password') {
      return 'Password must contain at least 6 characters.'
    }
    return isRegistration
      ? 'Unable to create your account. Please try again.'
      : 'Unable to sign in with that email address and password.'
  }

  /** Validates the form, then signs in or creates a Firebase Authentication user. */
  async function handleSubmit(event) {
    event.preventDefault()

    // Stores the latest validation message for each input field.
    const nextErrors = {
      username: isRegistration ? validateUsername(username) : '',
      email: validateEmail(email),
      password: validatePassword(password),
    }

    setErrors(nextErrors)
    setAuthError('')

    if (nextErrors.username || nextErrors.email || nextErrors.password) return

    try {
      setIsSigningIn(true)
      // Applies memory-only persistence before beginning the Firebase sign-in.
      await authPersistenceReady
      const userCredential = isRegistration
        ? await createUserWithEmailAndPassword(auth, email.trim(), password)
        : await signInWithEmailAndPassword(auth, email.trim(), password)

      // Firebase Auth stores the requested username on the new user's profile.
      if (isRegistration) {
        await updateProfile(userCredential.user, { displayName: username.trim() })
      }

      try {
        // This lightweight record allows the progress screen to list learners without exposing email addresses.
        await ensureLearnerProgressSummary(userCredential.user)
      } catch {
        // Progress reporting must not prevent a valid Firebase Authentication login if Firestore rules await publishing.
      }

      // The form copies are no longer needed after Firebase has authenticated the user.
      setUsername('')
      setEmail('')
      setSignedInUser(userCredential.user)
    } catch (error) {
      setAuthError(getAuthError(error))
    } finally {
      // Removes the password from React memory after every attempt, including failures.
      setPassword('')
      setIsSigningIn(false)
    }
  }

  /** Updates the username field and refreshes any visible username error. */
  function handleUsernameChange(event) {
    const value = event.target.value
    setUsername(value)
    setAuthError('')
    if (errors.username) {
      setErrors((current) => ({ ...current, username: validateUsername(value) }))
    }
  }

  /** Updates the email field and refreshes any visible email error. */
  function handleEmailChange(event) {
    const value = event.target.value
    setEmail(value)
    setAuthError('')
    if (errors.email) setErrors((current) => ({ ...current, email: validateEmail(value) }))
  }

  /** Updates the password field and refreshes any visible password error. */
  function handlePasswordChange(event) {
    const value = event.target.value
    setPassword(value)
    setAuthError('')
    if (errors.password) {
      setErrors((current) => ({ ...current, password: validatePassword(value) }))
    }
  }

  /** Switches between Login and Registration and clears form feedback. */
  function toggleAuthMode() {
    setAuthMode((mode) => (mode === 'login' ? 'register' : 'login'))
    setUsername('')
    setEmail('')
    setPassword('')
    setErrors({})
    setAuthError('')
  }

  /** Ends the Firebase session and returns the learner to the Login screen. */
  async function handleSignOut() {
    await signOut(auth)
    setSignedInUser(null)
    setAuthMode('login')
    setUsername('')
    setEmail('')
    setPassword('')
    setErrors({})
    setAuthError('')
  }

  // A successful login replaces the form with the Home page for this session.
  if (signedInUser) {
    return <HomePage user={signedInUser} onSignOut={handleSignOut} />
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <div className="brand-mark" aria-hidden="true">LP</div>
        <p className="eyebrow">Learner Portal</p>
        <h1 id="login-heading">{isRegistration ? 'Create an account' : 'Welcome back'}</h1>
        <p className="intro">
          {isRegistration
            ? 'Start your learning journey with a new account.'
            : 'Sign in to continue your learning journey.'}
        </p>

        {/* Autocomplete is disabled so the app does not request browser autofill storage. */}
        <form autoComplete="off" noValidate onSubmit={handleSubmit}>
          {isRegistration && (
            <div className="field-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                onBlur={() => setErrors((current) => ({ ...current, username: validateUsername(username) }))}
                autoComplete="off"
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? 'username-error' : undefined}
                placeholder="Choose a username"
              />
              {errors.username && <p id="username-error" className="error">{errors.username}</p>}
            </div>
          )}

          <div className="field-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => setErrors((current) => ({ ...current, email: validateEmail(email) }))}
              autoComplete="off"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              placeholder="you@example.com"
            />
            {errors.email && <p id="email-error" className="error">{errors.email}</p>}
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => setErrors((current) => ({ ...current, password: validatePassword(password) }))}
                autoComplete="off"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                placeholder="Enter your password"
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <HiddenEyeIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && <p id="password-error" className="error">{errors.password}</p>}
          </div>

          <button className="submit-button" type="submit" disabled={isSigningIn}>
            {isSigningIn
              ? isRegistration ? 'Creating account...' : 'Signing in...'
              : isRegistration ? 'Create account' : 'Sign in'}
          </button>
          {authError && <p className="error" role="alert">{authError}</p>}
          <p className="auth-switch">
            {isRegistration ? 'Already have an account?' : 'New to the portal?'}{' '}
            <button className="auth-switch-button" type="button" onClick={toggleAuthMode}>
              {isRegistration ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </form>
      </section>
    </main>
  )
}

/** Displays the signed-in user menu and swaps between the portal's focused screens. */
function HomePage({ user, onSignOut }) {
  // Uses the username saved to the Firebase profile during registration.
  const userName = user.displayName
  // Home is the default screen for every new in-memory session.
  const [activeScreen, setActiveScreen] = useState('home')

  // Keeps the heading meaningful when the learner moves between the sidebar sections.
  const activeScreenLabel = portalScreens.find((screen) => screen.id === activeScreen)?.label ?? 'Home'

  return (
    <main className="home-page">
      <div className="home-layout">
        <aside className="user-sidebar" aria-label="Signed-in user menu">
          <div>
            <div className="brand-mark sidebar-brand" aria-hidden="true">LP</div>
            <p className="sidebar-label">Signed in as</p>
            <strong className="sidebar-name">{userName}</strong>
            <nav className="sidebar-navigation" aria-label="Portal navigation">
              {/* Buttons update local screen state instead of reloading the authenticated application. */}
              {portalScreens.map((screen) => (
                <button
                  className={`sidebar-nav-button ${activeScreen === screen.id ? 'sidebar-nav-active' : ''}`}
                  type="button"
                  key={screen.id}
                  onClick={() => setActiveScreen(screen.id)}
                  aria-current={activeScreen === screen.id ? 'page' : undefined}
                >
                  {screen.label}
                </button>
              ))}
            </nav>
          </div>
          <button className="sign-out-button" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </aside>

        <section className="dashboard-content" aria-labelledby="dashboard-heading">
          <header className="dashboard-heading">
            <p className="eyebrow">Learner Portal</p>
            <h1 id="dashboard-heading">{activeScreenLabel}</h1>
          </header>

          {activeScreen === 'home' && <HomeOverview user={user} onNavigate={setActiveScreen} />}
          {activeScreen === 'learning' && <LearningContent user={user} />}
          {activeScreen === 'progress' && <LearnerProgress />}
          {activeScreen === 'tasks' && <TaskManager user={user} />}
          {activeScreen === 'documents' && <DocumentLibrary user={user} />}
        </section>
      </div>
    </main>
  )
}

/** Creates a stable Firestore document ID for a learner's completion of one known lesson. */
function createLessonProgressId(courseId, lessonId) {
  return `${courseId}--${lessonId}`
}

/** Keeps a public progress username short and avoids putting an email address in shared progress data. */
function getLearnerDisplayName(user) {
  return user.displayName?.trim().slice(0, 50) || 'Learner'
}

/** Calculates small, non-sensitive totals that the shared learner-progress screen can display. */
function createLearnerProgressSummary(user, selectedCourseIds, completedLessonIds) {
  const selectedCourses = courseCatalog.filter((course) => selectedCourseIds.includes(course.id))
  const selectedLessonIds = selectedCourses.flatMap((course) => (
    course.lessons.map((lesson) => createLessonProgressId(course.id, lesson.id))
  ))
  const completedLessonCount = selectedLessonIds.filter((lessonId) => completedLessonIds.includes(lessonId)).length

  return {
    displayName: getLearnerDisplayName(user),
    selectedCourseCount: selectedCourses.length,
    totalSelectedLessons: selectedLessonIds.length,
    completedLessonCount,
    updatedAt: serverTimestamp(),
  }
}

/** Ensures every learner who signs in gets a small shared progress-summary record. */
async function ensureLearnerProgressSummary(user) {
  const progressReference = doc(db, 'learnerProgress', user.uid)
  const progressSnapshot = await getDoc(progressReference)

  if (!progressSnapshot.exists()) {
    // New records start at zero because existing course and lesson data is stored separately.
    await setDoc(progressReference, createLearnerProgressSummary(user, [], []))
    return
  }

  // A merge refreshes the display name without overwriting the learner's existing progress totals.
  await setDoc(progressReference, {
    displayName: getLearnerDisplayName(user),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/** Displays a compact, live overview while leaving detailed workflows on their own screens. */
function HomeOverview({ user, onNavigate }) {
  // Stores only the small amount of learner-owned data required for the dashboard totals.
  const [tasks, setTasks] = useState([])
  const [selectedCourseIds, setSelectedCourseIds] = useState([])
  const [lessonProgress, setLessonProgress] = useState([])
  const [documentCount, setDocumentCount] = useState(0)
  const [overviewError, setOverviewError] = useState('')

  useEffect(() => {
    // These paths match the owner-only Firestore rules, so the overview never reads another learner's data.
    const taskUnsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'tasks'),
      (snapshot) => setTasks(snapshot.docs.map((taskSnapshot) => taskSnapshot.data())),
      () => setOverviewError('Your latest portal totals could not be loaded. Please try again.'),
    )
    const documentUnsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'documents'),
      (snapshot) => setDocumentCount(snapshot.size),
      () => setOverviewError('Your latest portal totals could not be loaded. Please try again.'),
    )
    const courseUnsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'courseSelections'),
      (snapshot) => setSelectedCourseIds(snapshot.docs.map((courseSnapshot) => courseSnapshot.data().courseId)),
      () => setOverviewError('Your latest portal totals could not be loaded. Please try again.'),
    )
    const lessonProgressUnsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'lessonProgress'),
      (snapshot) => setLessonProgress(snapshot.docs.map((progressSnapshot) => progressSnapshot.data())),
      () => setOverviewError('Your latest portal totals could not be loaded. Please try again.'),
    )

    // Stops all real-time listeners when the learner leaves Home or signs out.
    return () => {
      taskUnsubscribe()
      documentUnsubscribe()
      courseUnsubscribe()
      lessonProgressUnsubscribe()
    }
  }, [user.uid])

  const completedTaskCount = tasks.filter((task) => task.completed).length
  const outstandingTaskCount = tasks.length - completedTaskCount
  // Comparing ISO-style date strings makes the overdue total reliable without storing a browser-specific date object.
  const overdueTaskCount = tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < getLocalDateKey()).length
  const completionRate = tasks.length ? Math.round((completedTaskCount / tasks.length) * 100) : 0
  const selectedLessonIds = courseCatalog
    .filter((course) => selectedCourseIds.includes(course.id))
    .flatMap((course) => course.lessons.map((lesson) => createLessonProgressId(course.id, lesson.id)))
  const completedLessonCount = lessonProgress.filter((progress) => selectedLessonIds.includes(createLessonProgressId(progress.courseId, progress.lessonId))).length

  const summaryItems = [
    { label: 'Courses selected', value: selectedCourseIds.length },
    { label: 'Lessons complete', value: completedLessonCount },
    { label: 'Total tasks', value: tasks.length },
    { label: 'Completed', value: completedTaskCount },
    { label: 'Outstanding', value: outstandingTaskCount },
    { label: 'Overdue', value: overdueTaskCount },
  ]

  return (
    <div className="home-overview">
      {overviewError && <p className="error overview-status" role="alert">{overviewError}</p>}

      <section className="summary-grid" aria-label="Task summary">
        {/* The Home screen summarises real Firestore task data instead of duplicating the full task workflow. */}
        {summaryItems.map((item) => (
          <article className="summary-card" key={item.label}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="overview-quick-access" aria-label="Portal sections">
        <article className="overview-card">
          <p className="overview-label">Learning</p>
          <strong>{selectedCourseIds.length} selected course{selectedCourseIds.length === 1 ? '' : 's'}</strong>
          <p>Choose a course and explore its lessons at your own pace.</p>
          <button className="overview-button" type="button" onClick={() => onNavigate('learning')}>
            Open learning
          </button>
        </article>
        <article className="overview-card">
          <p className="overview-label">Learner progress</p>
          <strong>{completedLessonCount} lesson{completedLessonCount === 1 ? '' : 's'} complete</strong>
          <p>View course completion totals for every learner in the portal.</p>
          <button className="overview-button" type="button" onClick={() => onNavigate('progress')}>
            Open learner progress
          </button>
        </article>
        <article className="overview-card">
          <p className="overview-label">Task manager</p>
          <strong>{completionRate}% complete</strong>
          <p>Manage all {tasks.length} learning task{tasks.length === 1 ? '' : 's'} in one place.</p>
          <button className="overview-button" type="button" onClick={() => onNavigate('tasks')}>
            Open task manager
          </button>
        </article>
        <article className="overview-card">
          <p className="overview-label">Document library</p>
          <strong>{documentCount} saved link{documentCount === 1 ? '' : 's'}</strong>
          <p>Keep your learning-document links organised and available to you.</p>
          <button className="overview-button" type="button" onClick={() => onNavigate('documents')}>
            Open document library
          </button>
        </article>
      </section>
    </div>
  )
}

/** Lets a learner choose private courses and view the lessons included in each selected course. */
function LearningContent({ user }) {
  // Firestore contains only this learner's selections; the shared lesson text remains read-only application content.
  const [selectedCourseIds, setSelectedCourseIds] = useState([])
  const [completedLessonIds, setCompletedLessonIds] = useState([])
  const [activeCourseId, setActiveCourseId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingCourseId, setIsSavingCourseId] = useState('')
  const [isSavingLessonId, setIsSavingLessonId] = useState('')
  const [learningError, setLearningError] = useState('')
  const [learningSuccess, setLearningSuccess] = useState('')

  useEffect(() => {
    const selectionsReference = collection(db, 'users', user.uid, 'courseSelections')

    const lessonProgressReference = collection(db, 'users', user.uid, 'lessonProgress')

    // Live listeners keep course selections and lesson completions consistent between open portal tabs.
    const selectionsUnsubscribe = onSnapshot(
      selectionsReference,
      (snapshot) => {
        const validCourseIds = snapshot.docs
          .map((courseSnapshot) => courseSnapshot.data().courseId)
          .filter((courseId) => courseCatalog.some((course) => course.id === courseId))
        setSelectedCourseIds(validCourseIds)
        setLearningError('')
        setIsLoading(false)
      },
      (error) => {
        setLearningError(getLearningContentError(error, 'load'))
        setIsLoading(false)
      },
    )
    const lessonProgressUnsubscribe = onSnapshot(
      lessonProgressReference,
      (snapshot) => setCompletedLessonIds(snapshot.docs.map((progressSnapshot) => progressSnapshot.id)),
      (error) => setLearningError(getLearningContentError(error, 'load')),
    )

    // Removes both real-time connections when this focused screen is no longer shown.
    return () => {
      selectionsUnsubscribe()
      lessonProgressUnsubscribe()
    }
  }, [user.uid])

  // Deriving the fallback avoids a second state update when a course selection changes in Firestore.
  const activeCourse = courseCatalog.find((course) => course.id === activeCourseId && selectedCourseIds.includes(course.id))
    ?? courseCatalog.find((course) => selectedCourseIds.includes(course.id))
  const activeCompletedLessonCount = activeCourse
    ? activeCourse.lessons.filter((lesson) => completedLessonIds.includes(createLessonProgressId(activeCourse.id, lesson.id))).length
    : 0
  const activeCourseProgress = activeCourse
    ? Math.round((activeCompletedLessonCount / activeCourse.lessons.length) * 100)
    : 0

  /** Adds one known course to the learner's private Firestore selection collection. */
  async function handleCourseSelect(course) {
    setLearningError('')
    setLearningSuccess('')

    try {
      setIsSavingCourseId(course.id)
      const nextSelectedCourseIds = [...selectedCourseIds, course.id]
      const batch = writeBatch(db)

      // A predictable document ID prevents duplicate selections for the same course.
      batch.set(doc(db, 'users', user.uid, 'courseSelections', course.id), {
        courseId: course.id,
        enrolledAt: serverTimestamp(),
      })
      // Keeping the selection and its learner-facing total together prevents the shared view from showing stale data.
      batch.set(
        doc(db, 'learnerProgress', user.uid),
        createLearnerProgressSummary(user, nextSelectedCourseIds, completedLessonIds),
      )
      await batch.commit()
      setActiveCourseId(course.id)
      setLearningSuccess(`${course.title} was added to your learning.`)
    } catch (error) {
      setLearningError(getLearningContentError(error, 'save'))
    } finally {
      setIsSavingCourseId('')
    }
  }

  /** Removes a course selection without changing the shared course content for anyone else. */
  async function handleCourseRemove(course) {
    const shouldRemove = window.confirm(`Remove “${course.title}” from your learning?`)

    if (!shouldRemove) return

    setLearningError('')
    setLearningSuccess('')

    try {
      setIsSavingCourseId(course.id)
      const nextSelectedCourseIds = selectedCourseIds.filter((courseId) => courseId !== course.id)
      const batch = writeBatch(db)
      batch.delete(doc(db, 'users', user.uid, 'courseSelections', course.id))
      // Previous completions remain private so a learner can resume them if they re-select the course later.
      batch.set(
        doc(db, 'learnerProgress', user.uid),
        createLearnerProgressSummary(user, nextSelectedCourseIds, completedLessonIds),
      )
      await batch.commit()
      setLearningSuccess(`${course.title} was removed from your learning.`)
    } catch (error) {
      setLearningError(getLearningContentError(error, 'delete'))
    } finally {
      setIsSavingCourseId('')
    }
  }

  /** Marks one selected lesson complete or incomplete and updates the shared total in the same batch. */
  async function handleLessonCompletion(course, lesson) {
    const lessonProgressId = createLessonProgressId(course.id, lesson.id)
    const isCompleted = completedLessonIds.includes(lessonProgressId)
    const nextCompletedLessonIds = isCompleted
      ? completedLessonIds.filter((completedLessonId) => completedLessonId !== lessonProgressId)
      : [...completedLessonIds, lessonProgressId]

    setLearningError('')
    setLearningSuccess('')

    try {
      setIsSavingLessonId(lessonProgressId)
      const batch = writeBatch(db)
      const lessonReference = doc(db, 'users', user.uid, 'lessonProgress', lessonProgressId)

      if (isCompleted) {
        // Deleting the record is simpler and safer than allowing lesson-completion updates.
        batch.delete(lessonReference)
      } else {
        batch.set(lessonReference, {
          courseId: course.id,
          lessonId: lesson.id,
          completedAt: serverTimestamp(),
        })
      }

      batch.set(
        doc(db, 'learnerProgress', user.uid),
        createLearnerProgressSummary(user, selectedCourseIds, nextCompletedLessonIds),
      )
      await batch.commit()
      setLearningSuccess(isCompleted ? `${lesson.title} marked incomplete.` : `${lesson.title} marked complete.`)
    } catch (error) {
      setLearningError(getLearningContentError(error, 'progress'))
    } finally {
      setIsSavingLessonId('')
    }
  }

  return (
    <div className="learning-content">
      <section className="dashboard-card course-catalog" aria-labelledby="course-catalog-heading">
        <div className="learning-section-heading">
          <div>
            <h2 id="course-catalog-heading">Choose a course</h2>
            <p>Select the topics you want to include in your personal learning plan.</p>
          </div>
        </div>

        {learningError && <p className="error learning-status" role="alert">{learningError}</p>}
        {learningSuccess && <p className="success learning-status" role="status">{learningSuccess}</p>}

        <div className="course-grid" aria-live="polite">
          {courseCatalog.map((course) => {
            const isSelected = selectedCourseIds.includes(course.id)
            const isSaving = isSavingCourseId === course.id

            return (
              <article className={`course-card ${isSelected ? 'course-card-selected' : ''}`} key={course.id}>
                <div>
                  <p className="course-meta">{course.level} · {course.duration}</p>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                </div>
                <div className="course-card-actions">
                  {isSelected ? (
                    <>
                      <button className="course-view-button" type="button" onClick={() => setActiveCourseId(course.id)}>
                        View lessons
                      </button>
                      <button className="course-remove-button" type="button" onClick={() => handleCourseRemove(course)} disabled={isSaving}>
                        {isSaving ? 'Removing...' : 'Remove'}
                      </button>
                    </>
                  ) : (
                    <button className="course-select-button" type="button" onClick={() => handleCourseSelect(course)} disabled={isSaving || isLoading}>
                      {isSaving ? 'Adding...' : 'Add to my learning'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="dashboard-card lesson-content" aria-labelledby="lesson-content-heading">
        <div className="learning-section-heading">
          <div>
            <h2 id="lesson-content-heading">Course content</h2>
            <p>Open a selected course to see the lessons included in its learning path.</p>
          </div>
        </div>

        {isLoading && <p className="empty-learning-content">Loading your selected courses...</p>}
        {!isLoading && !learningError && !activeCourse && (
          <p className="empty-learning-content">Select a course above to begin exploring its lessons.</p>
        )}
        {activeCourse && (
          <div className="active-course-content">
            <div className="active-course-header">
              <div>
                <p className="course-meta">{activeCourse.level} · {activeCourse.duration}</p>
                <h3>{activeCourse.title}</h3>
                <p>{activeCourse.description}</p>
                <p className="course-progress-label">{activeCompletedLessonCount} of {activeCourse.lessons.length} lessons complete · {activeCourseProgress}%</p>
              </div>
              <button className="course-remove-button" type="button" onClick={() => handleCourseRemove(activeCourse)} disabled={isSavingCourseId === activeCourse.id}>
                {isSavingCourseId === activeCourse.id ? 'Removing...' : 'Remove course'}
              </button>
            </div>
            <ol className="lesson-list">
              {activeCourse.lessons.map((lesson, index) => (
                <li className="lesson-item" key={lesson.id}>
                  <span className="lesson-number" aria-hidden="true">{index + 1}</span>
                  <div>
                    <h4>{lesson.title}</h4>
                    <p>{lesson.summary}</p>
                  </div>
                  <div className="lesson-actions">
                    <span className="lesson-duration">{lesson.duration}</span>
                    <button
                      className={`lesson-completion-button ${completedLessonIds.includes(createLessonProgressId(activeCourse.id, lesson.id)) ? 'lesson-completion-button-complete' : ''}`}
                      type="button"
                      onClick={() => handleLessonCompletion(activeCourse, lesson)}
                      disabled={isSavingLessonId === createLessonProgressId(activeCourse.id, lesson.id)}
                      aria-pressed={completedLessonIds.includes(createLessonProgressId(activeCourse.id, lesson.id))}
                    >
                      {isSavingLessonId === createLessonProgressId(activeCourse.id, lesson.id)
                        ? 'Saving...'
                        : completedLessonIds.includes(createLessonProgressId(activeCourse.id, lesson.id)) ? 'Completed' : 'Mark complete'}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  )
}

/** Shows the non-sensitive course-completion totals that every signed-in learner can currently view. */
function LearnerProgress() {
  // This collection intentionally contains only username and progress totals, never an email address or private lesson data.
  const [learnerSummaries, setLearnerSummaries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [progressError, setProgressError] = useState('')

  useEffect(() => {
    // A simple newest-first query needs only Firestore's automatic single-field updatedAt index.
    const progressQuery = query(collection(db, 'learnerProgress'), orderBy('updatedAt', 'desc'))
    const unsubscribe = onSnapshot(
      progressQuery,
      (snapshot) => {
        setLearnerSummaries(snapshot.docs.map((learnerSnapshot) => ({
          id: learnerSnapshot.id,
          ...learnerSnapshot.data(),
        })))
        setProgressError('')
        setIsLoading(false)
      },
      (error) => {
        setProgressError(getLearnerProgressError(error))
        setIsLoading(false)
      },
    )

    // Closes the shared progress listener when the learner opens another portal screen.
    return unsubscribe
  }, [])

  return (
    <section className="dashboard-card learner-progress" aria-labelledby="learner-progress-heading">
      <div className="learner-progress-heading">
        <div>
          <h2 id="learner-progress-heading">Learner progress</h2>
          <p>Current course and lesson totals for signed-in learners. Permissions can be narrowed later with Custom Claims.</p>
        </div>
      </div>

      {progressError && <p className="error progress-status" role="alert">{progressError}</p>}

      <div className="learner-progress-list" aria-live="polite">
        {isLoading && <p className="empty-learning-content">Loading learner progress...</p>}
        {!isLoading && !progressError && learnerSummaries.length === 0 && (
          <p className="empty-learning-content">No learner progress is available yet. Each learner appears after their next sign-in.</p>
        )}
        {learnerSummaries.map((summary) => {
          const progressPercent = summary.totalSelectedLessons
            ? Math.round((summary.completedLessonCount / summary.totalSelectedLessons) * 100)
            : 0

          return (
            <article className="learner-progress-item" key={summary.id}>
              <div>
                <h3>{summary.displayName}</h3>
                <p>{summary.selectedCourseCount} selected course{summary.selectedCourseCount === 1 ? '' : 's'} · {summary.completedLessonCount} of {summary.totalSelectedLessons} lessons complete</p>
                <p className="progress-last-updated">Updated {formatProgressTimestamp(summary.updatedAt)}</p>
              </div>
              <div className="progress-meter" aria-label={`${summary.displayName} has completed ${progressPercent}% of selected lessons`}>
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <strong>{progressPercent}%</strong>
            </article>
          )
        })}
      </div>
    </section>
  )
}

/** Creates, reads, updates, filters, completes, and deletes the learner's own tasks. */
function TaskManager({ user }) {
  // Holds the real-time Firestore records and the form state used to create or edit a task.
  const [tasks, setTasks] = useState([])
  const [taskForm, setTaskForm] = useState(createEmptyTask)
  const [editingTaskId, setEditingTaskId] = useState('')
  const [taskFilter, setTaskFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState('')
  const [taskError, setTaskError] = useState('')
  const [taskSuccess, setTaskSuccess] = useState('')

  // Each learner listens only to their own tasks, with the newest task shown first.
  useEffect(() => {
    const taskCollection = collection(db, 'users', user.uid, 'tasks')
    const taskQuery = query(taskCollection, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      taskQuery,
      (snapshot) => {
        setTasks(snapshot.docs.map((taskSnapshot) => ({
          id: taskSnapshot.id,
          ...taskSnapshot.data(),
        })))
        setTaskError('')
        setIsLoading(false)
      },
      (error) => {
        setTaskError(getTaskManagerError(error, 'load'))
        setIsLoading(false)
      },
    )

    // Ends the listener when the learner signs out, preventing unnecessary reads.
    return unsubscribe
  }, [user.uid])

  // Uses Array.filter to provide a clear client-side view of all, active, or completed tasks.
  const visibleTasks = tasks.filter((task) => {
    if (taskFilter === 'active') return !task.completed
    if (taskFilter === 'completed') return task.completed
    return true
  })

  /** Updates one form value without mutating the previous React state object. */
  function handleTaskFieldChange(event) {
    const { name, value } = event.target
    setTaskForm((current) => ({ ...current, [name]: value }))
  }

  /** Validates the fields before Firestore receives the new or changed task. */
  function validateTask() {
    if (!taskForm.title.trim()) return 'Task title is required.'
    if (taskForm.title.trim().length > 120) return 'Task title must be 120 characters or fewer.'
    if (!taskForm.dueDate) return 'Choose a due date.'
    if (!taskCategories.includes(taskForm.category)) return 'Choose a valid task category.'
    if (!taskPriorities.includes(taskForm.priority)) return 'Choose a valid priority.'
    return ''
  }

  /** Creates a task or saves edits while keeping the immutable creation date unchanged. */
  async function handleTaskSubmit(event) {
    event.preventDefault()

    const validationMessage = validateTask()
    setTaskError(validationMessage)
    setTaskSuccess('')
    if (validationMessage) return

    const taskData = {
      title: taskForm.title.trim(),
      category: taskForm.category,
      dueDate: taskForm.dueDate,
      priority: taskForm.priority,
      completed: taskForm.completed,
    }

    try {
      setIsSaving(true)

      if (editingTaskId) {
        // updateDoc changes only the editable fields; the rules keep createdAt immutable.
        await updateDoc(doc(db, 'users', user.uid, 'tasks', editingTaskId), taskData)
        setTaskSuccess('Task updated.')
      } else {
        // addDoc creates a Firestore document with an automatic ID for this learner's task.
        await addDoc(collection(db, 'users', user.uid, 'tasks'), {
          ...taskData,
          createdAt: serverTimestamp(),
        })
        setTaskSuccess('Task added.')
      }

      setTaskForm(createEmptyTask())
      setEditingTaskId('')
    } catch (error) {
      setTaskError(getTaskManagerError(error, 'save'))
    } finally {
      setIsSaving(false)
    }
  }

  /** Loads a stored task into the shared form so the learner can edit it. */
  function handleTaskEdit(task) {
    setTaskForm({
      title: task.title,
      category: task.category,
      dueDate: task.dueDate,
      priority: task.priority,
      completed: task.completed,
    })
    setEditingTaskId(task.id)
    setTaskError('')
    setTaskSuccess('Editing task. Save changes when you are ready.')
  }

  /** Stops editing and restores a blank task form without changing Firestore data. */
  function cancelTaskEdit() {
    setTaskForm(createEmptyTask())
    setEditingTaskId('')
    setTaskError('')
    setTaskSuccess('')
  }

  /** Changes only the completed flag for a task, preserving all other task details. */
  async function handleTaskCompletion(task) {
    setTaskError('')
    setTaskSuccess('')

    try {
      await updateDoc(doc(db, 'users', user.uid, 'tasks', task.id), {
        completed: !task.completed,
      })
    } catch (error) {
      setTaskError(getTaskManagerError(error, 'save'))
    }
  }

  /** Confirms and deletes a task only from the current learner's Firestore path. */
  async function handleTaskDelete(task) {
    const shouldDelete = window.confirm(`Delete “${task.title}”? This cannot be undone.`)

    if (!shouldDelete) return

    setTaskError('')
    setTaskSuccess('')

    try {
      setDeletingTaskId(task.id)
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', task.id))
      if (editingTaskId === task.id) cancelTaskEdit()
      setTaskSuccess('Task deleted.')
    } catch (error) {
      setTaskError(getTaskManagerError(error, 'delete'))
    } finally {
      setDeletingTaskId('')
    }
  }

  return (
    <section className="dashboard-card task-manager" aria-labelledby="tasks-heading">
      <div className="task-manager-heading">
        <div>
          <h2 id="tasks-heading">Task manager</h2>
          <p>Add, complete, edit, or remove tasks from your learning plan.</p>
        </div>
        <label className="task-filter-control" htmlFor="task-filter">
          Show
          <select id="task-filter" value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)}>
            <option value="all">All tasks</option>
            <option value="active">Active tasks</option>
            <option value="completed">Completed tasks</option>
          </select>
        </label>
      </div>

      <form className="task-form" onSubmit={handleTaskSubmit} noValidate>
        <div className="task-field task-title-field">
          <label htmlFor="task-title">Task title</label>
          <input
            id="task-title"
            name="title"
            type="text"
            value={taskForm.title}
            onChange={handleTaskFieldChange}
            maxLength="120"
            placeholder="For example, finish JavaScript exercise"
          />
        </div>
        <div className="task-field">
          <label htmlFor="task-category">Category</label>
          <select id="task-category" name="category" value={taskForm.category} onChange={handleTaskFieldChange}>
            {taskCategories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </div>
        <div className="task-field">
          <label htmlFor="task-due-date">Due date</label>
          <input id="task-due-date" name="dueDate" type="date" value={taskForm.dueDate} onChange={handleTaskFieldChange} />
        </div>
        <div className="task-field">
          <label htmlFor="task-priority">Priority</label>
          <select id="task-priority" name="priority" value={taskForm.priority} onChange={handleTaskFieldChange}>
            {taskPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </div>
        <div className="task-form-actions">
          <button className="task-save-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving task...' : editingTaskId ? 'Save changes' : 'Add task'}
          </button>
          {editingTaskId && (
            <button className="task-cancel-button" type="button" onClick={cancelTaskEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {taskError && <p className="error task-status" role="alert">{taskError}</p>}
      {taskSuccess && <p className="success task-status" role="status">{taskSuccess}</p>}

      <div className="task-list" aria-live="polite">
        {isLoading && <p className="empty-task-list">Loading your tasks...</p>}
        {!isLoading && !taskError && visibleTasks.length === 0 && (
          <p className="empty-task-list">No {taskFilter === 'all' ? '' : taskFilter} tasks to show.</p>
        )}
        {visibleTasks.map((task) => (
          <article className={`task-item ${task.completed ? 'task-completed' : ''}`} key={task.id}>
            <label className="task-complete-control">
              <input
                type="checkbox"
                checked={Boolean(task.completed)}
                onChange={() => handleTaskCompletion(task)}
                aria-label={`Mark ${task.title} as ${task.completed ? 'not completed' : 'completed'}`}
              />
              <span aria-hidden="true" />
            </label>
            <div className="task-details">
              <h3>{task.title}</h3>
              <p>{task.category} · Due {formatTaskDueDate(task.dueDate)}</p>
            </div>
            <div className="task-badges" aria-label="Task priority">
              <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
            </div>
            <div className="task-actions">
              <button className="task-edit-button" type="button" onClick={() => handleTaskEdit(task)}>
                Edit
              </button>
              <button
                className="task-delete-button"
                type="button"
                onClick={() => handleTaskDelete(task)}
                disabled={deletingTaskId === task.id}
              >
                {deletingTaskId === task.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

/** Lists and saves the current learner's non-relational document-link records. */
function DocumentLibrary({ user }) {
  // Tracks Firestore records, link-form input, and clear feedback for this one learner.
  const [documents, setDocuments] = useState([])
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingDocumentId, setDeletingDocumentId] = useState('')
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  // Firestore subcollections provide a simple non-relational, user-owned document structure.
  useEffect(() => {
    const documentCollection = collection(db, 'users', user.uid, 'documents')
    const documentQuery = query(documentCollection, orderBy('createdAt', 'desc'))

    // Keeps the library in sync when a document record is added, changed, or removed.
    const unsubscribe = onSnapshot(
      documentQuery,
      (snapshot) => {
        setDocuments(snapshot.docs.map((documentSnapshot) => ({
          id: documentSnapshot.id,
          ...documentSnapshot.data(),
        })))
        setLoadError('')
        setIsLoading(false)
      },
      (error) => {
        setLoadError(getDocumentLibraryError(error, 'load'))
        setIsLoading(false)
      },
    )

    // Stops the real-time listener when the learner signs out or the component closes.
    return unsubscribe
  }, [user.uid])

  /** Validates an external document link, then stores its small record in Firestore. */
  async function handleDocumentSave(event) {
    event.preventDefault()

    setSaveError('')
    setSaveSuccess('')

    if (!documentTitle.trim()) {
      setSaveError('Document title is required.')
      return
    }

    let safeUrl
    try {
      safeUrl = new URL(documentUrl.trim())
    } catch {
      setSaveError('Enter a complete HTTPS document link.')
      return
    }

    if (safeUrl.protocol !== 'https:') {
      setSaveError('Use a secure HTTPS document link.')
      return
    }

    try {
      setIsSaving(true)

      // Firestore stores only small structured link data, avoiding a paid file-storage dependency.
      await addDoc(collection(db, 'users', user.uid, 'documents'), {
        name: documentTitle.trim(),
        url: safeUrl.toString(),
        createdAt: serverTimestamp(),
      })

      // Clears the public link form after Firestore creates the learner-owned record.
      setDocumentTitle('')
      setDocumentUrl('')
      setSaveSuccess('Document link added to your library.')
    } catch (error) {
      setSaveError(getDocumentLibraryError(error, 'save'))
    } finally {
      setIsSaving(false)
    }
  }

  /** Confirms and removes the selected learner-owned link record from Firestore. */
  async function handleDocumentDelete(documentRecord) {
    const shouldDelete = window.confirm(`Delete “${documentRecord.name}” from your document library?`)

    if (!shouldDelete) return

    setSaveError('')
    setSaveSuccess('')

    try {
      setDeletingDocumentId(documentRecord.id)
      // The Firestore rules also verify that this path belongs to the signed-in user.
      await deleteDoc(doc(db, 'users', user.uid, 'documents', documentRecord.id))
      setSaveSuccess('Document link deleted. You can save a replacement link at any time.')
    } catch (error) {
      setSaveError(getDocumentLibraryError(error, 'delete'))
    } finally {
      setDeletingDocumentId('')
    }
  }

  return (
    <section className="dashboard-card document-library" aria-labelledby="documents-heading">
      <div className="library-heading">
        <div>
          <h2 id="documents-heading">Document library</h2>
          <p>Save private links to your learning documents without uploading files to Firebase.</p>
        </div>
      </div>

      <form className="document-link-form" onSubmit={handleDocumentSave} noValidate>
        <div className="document-inputs">
          <label htmlFor="document-title">Document title</label>
          <input
            id="document-title"
            type="text"
            value={documentTitle}
            onChange={(event) => setDocumentTitle(event.target.value)}
            maxLength="120"
            placeholder="For example, JavaScript notes"
          />
        </div>
        <div className="document-inputs">
          <label htmlFor="document-url">Document link</label>
          <input
            id="document-url"
            type="url"
            value={documentUrl}
            onChange={(event) => setDocumentUrl(event.target.value)}
            placeholder="https://drive.google.com/..."
            aria-describedby="document-help"
          />
          <p id="document-help" className="document-help">Use a shareable HTTPS link, such as a Google Drive document.</p>
        </div>
        <button className="document-save-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving link...' : 'Save document link'}
        </button>
      </form>

      {saveError && <p className="error library-status" role="alert">{saveError}</p>}
      {saveSuccess && <p className="success library-status" role="status">{saveSuccess}</p>}
      {loadError && <p className="error library-status" role="alert">{loadError}</p>}

      <div className="document-list" aria-live="polite">
        {isLoading && <p className="empty-library">Loading your documents...</p>}
        {!isLoading && !loadError && documents.length === 0 && (
          <p className="empty-library">No document links yet. Save your first learning link above.</p>
        )}
        {documents.map((document) => (
          <article className="document-item" key={document.id}>
            <div>
              <h3>{document.name}</h3>
              <p>Added {formatUploadDate(document.createdAt)}</p>
            </div>
            <div className="document-actions">
              <a className="document-open-button" href={document.url} target="_blank" rel="noreferrer">
                Open
              </a>
              <button
                className="document-delete-button"
                type="button"
                onClick={() => handleDocumentDelete(document)}
                disabled={deletingDocumentId === document.id}
              >
                {deletingDocumentId === document.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

/** Turns Firestore failures into messages a learner can act on. */
function getDocumentLibraryError(error, action) {
  if (error.code === 'permission-denied') {
    return 'Firestore has blocked this action. Check that the Firestore rules have been published.'
  }
  return action === 'load'
    ? 'Your document library could not be loaded. Please try again.'
    : action === 'delete'
      ? 'Your document link could not be deleted. Please try again.'
      : 'Your document link could not be saved. Please try again.'
}

/** Returns task-specific Firebase feedback without exposing technical error details to learners. */
function getTaskManagerError(error, action) {
  if (error.code === 'permission-denied') {
    return 'Firestore has blocked this action. Publish the latest Firestore rules and try again.'
  }
  if (action === 'load') return 'Your tasks could not be loaded. Please try again.'
  if (action === 'delete') return 'Your task could not be deleted. Please try again.'
  return 'Your task could not be saved. Please try again.'
}

/** Returns learner-friendly course-selection feedback without exposing Firebase implementation details. */
function getLearningContentError(error, action) {
  if (error.code === 'permission-denied') {
    return 'Firestore has blocked this action. Publish the latest Firestore rules and try again.'
  }
  if (action === 'load') return 'Your selected courses could not be loaded. Please try again.'
  if (action === 'delete') return 'Your course could not be removed. Please try again.'
  if (action === 'progress') return 'Your lesson progress could not be saved. Please try again.'
  return 'Your course could not be added. Please try again.'
}

/** Returns learner-friendly feedback for the separate shared progress screen. */
function getLearnerProgressError(error) {
  if (error.code === 'permission-denied') {
    return 'Firestore has blocked learner progress. Publish the latest Firestore rules and try again.'
  }
  return 'Learner progress could not be loaded. Please try again.'
}

/** Returns today's calendar date in the learner's local timezone for task due-date comparisons. */
function getLocalDateKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Formats the stored YYYY-MM-DD task due date for the learner-facing list. */
function formatTaskDueDate(dueDate) {
  if (!dueDate) return 'no date set'
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(new Date(`${dueDate}T00:00:00`))
}

/** Formats Firestore timestamps while still handling a pending server timestamp. */
function formatUploadDate(timestamp) {
  if (!timestamp?.toDate) return 'Saving date...'
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(timestamp.toDate())
}

/** Formats the shared summary timestamp while handling an initial pending server timestamp. */
function formatProgressTimestamp(timestamp) {
  if (!timestamp?.toDate) return 'just now'
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp.toDate())
}

/** Displays the eye icon used when the password is hidden. */
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  )
}

/** Displays the crossed-out eye icon used when the password is visible. */
function HiddenEyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.1 0 9.5 6 9.5 6a17.7 17.7 0 0 1-3.1 3.7M6.2 6.2A17.8 17.8 0 0 0 2.5 12s3.4 6 9.5 6a10.7 10.7 0 0 0 3.1-.5" />
      <path d="M9.8 9.8a3.1 3.1 0 0 0 4.4 4.4" />
    </svg>
  )
}

export default App
