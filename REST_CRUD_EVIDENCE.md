# Realtime Database REST CRUD Evidence

Use this record after signing in to the portal and completing the real Task Manager workflow. The screen shows a credential-free REST request log and its **Download log** button saves the same safe data as JSON. Take a screenshot of the visible log after each operation, then attach or link the screenshot below.

**Privacy rule:** do not capture or submit a Firebase ID token, password, service-account file, or another learner's private task title. The app's log deliberately stores only method, path, HTTP status, and timestamp.

## Test account and environment

| Item | Evidence |
| --- | --- |
| Date and tester | _To complete during test_ |
| Firebase project | `learner-portal-b7224` |
| Database instance | `learner-portal-b7224-default-rtdb` (`europe-west1`) |
| Task path format | `/tasks/{signed-in-user-uid}/{taskId}` |
| Rules version | _Record Firebase deploy time or commit_ |

## Create — POST, then verification GET

1. Open **Task manager** as a signed-in user.
2. Create one harmless test task.
3. Confirm the status message says the task was added and verified.
4. Capture the visible `POST /tasks/{uid}` and final `GET /tasks/{uid}` entries.

| Expected request | Actual status | Screenshot / downloaded-log reference |
| --- | --- | --- |
| `POST /tasks/{uid}` | _To complete_ | _To attach_ |
| `GET /tasks/{uid}` | _To complete_ | _To attach_ |

## Read — GET

1. Refresh or return to **Task manager**.
2. Confirm the saved task appears after the initial REST load.
3. Capture the `GET /tasks/{uid}` entry.

| Expected request | Actual status | Screenshot / downloaded-log reference |
| --- | --- | --- |
| `GET /tasks/{uid}` | _To complete_ | _To attach_ |

## Update — PATCH, then verification GET

1. Edit the harmless test task and save it, or mark it complete.
2. Confirm the success message says it was updated and verified.
3. Capture the `PATCH /tasks/{uid}/{taskId}` and final `GET /tasks/{uid}` entries.

| Expected request | Actual status | Screenshot / downloaded-log reference |
| --- | --- | --- |
| `PATCH /tasks/{uid}/{taskId}` | _To complete_ | _To attach_ |
| `GET /tasks/{uid}` | _To complete_ | _To attach_ |

## Delete — DELETE, then verification GET

1. Delete the harmless test task and accept the confirmation prompt.
2. Confirm the success message says it was deleted and verified.
3. Capture the `DELETE /tasks/{uid}/{taskId}` and final `GET /tasks/{uid}` entries.

| Expected request | Actual status | Screenshot / downloaded-log reference |
| --- | --- | --- |
| `DELETE /tasks/{uid}/{taskId}` | _To complete_ | _To attach_ |
| `GET /tasks/{uid}` | _To complete_ | _To attach_ |

## Administrator access check

1. Sign in with `aidanbeckley83@gmail.com` after refreshing the Admin claim if necessary.
2. Open **Admin database** in the sidebar.
3. Capture the visible Auth directory and the read-only all-task table. Confirm the page reports `GET /tasks`.
4. Sign in as a non-Admin and confirm the **Admin database** link and `/admin` route are unavailable.

| Check | Result | Screenshot reference |
| --- | --- | --- |
| Admin can read all task paths | _To complete_ | _To attach_ |
| Admin can see username, email, role, and account state | _To complete_ | _To attach_ |
| Non-Admin is blocked from the Admin route | _To complete_ | _To attach_ |

## Result

_Record whether all four CRUD operations returned successful status codes and whether the final GET verified each change._
