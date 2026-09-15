import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase'

/** Creates the Staff-only newest-first learner-progress listener and maps snapshots into display records. */
export function subscribeToLearnerProgress({ onSummaries, onError }) {
  const progressQuery = query(collection(db, 'learnerProgress'), orderBy('updatedAt', 'desc'))

  return onSnapshot(
    progressQuery,
    (snapshot) => onSummaries(snapshot.docs.map((learnerSnapshot) => ({
      id: learnerSnapshot.id,
      ...learnerSnapshot.data(),
    }))),
    onError,
  )
}
