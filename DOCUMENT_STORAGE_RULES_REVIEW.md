# Document Library Storage and Firestore Rules Review

This review records the access model used when the Document Library moved from external links to private Firebase Storage uploads. It covers the Firebase project currently used by the portal and should be revisited before a broader release.

## Target Services

- Firebase project: `learner-portal-b7224`
- Cloud Firestore: Standard edition, Native mode
- Cloud Storage: the project's default Firebase Storage bucket
- Client: React application using the modular Firebase Web SDK

## Data Model and Upload Flow

- File bytes are stored only at `documents/{uid}/{documentId}` in Cloud Storage.
- Metadata is stored only at `users/{uid}/documents/{documentId}` in Firestore.
- Metadata contains `name`, `storagePath`, `contentType`, `fileSize`, and `createdAt`. No password, email address, or download URL is written to Firestore.
- The browser generates the Firestore document ID before uploading. That same ID forms the final Storage path, allowing Firestore Rules to validate that metadata points only to the owner's matching file.
- The client uploads the file before writing its metadata. If metadata creation fails, it attempts to remove the just-uploaded file so the library does not normally leave an unlisted file behind.
- Downloads request a Firebase download URL only when the owner presses **Download**. The application does not persist that URL in Firestore, component state, cookies, local storage, or session storage.

## Required Access Pattern

- An unauthenticated visitor cannot read, upload, overwrite, or delete a file.
- An authenticated learner can read, create, and delete only paths whose `{uid}` matches their Firebase Auth UID.
- New uploads are limited to PDF, Word, OpenDocument, RTF, and plain-text MIME types, with a maximum size of 10 MiB.
- Files cannot be overwritten. A learner deletes the original, then uploads a replacement; matching Firestore metadata is immutable and cannot be edited in place.
- Firestore document metadata is readable, creatable, and deletable only by the owner of the enclosing `users/{uid}` path.
- The browser asks Firebase for a download URL only after a Storage Rules-authorised request from the owner. The application does not store that URL in Firestore or browser storage.

## Devil's-Advocate Rule Review

| Attempt | Audit result | Rule protection |
| --- | --- | --- |
| Unauthenticated user lists, uploads, or deletes a document | Rejected by rule tracing | Storage `isOwner` and Firestore `isOwner` require Firebase Auth. |
| Learner reads another learner's Storage path | Rejected by rule tracing | The path UID must equal `request.auth.uid`. |
| Learner uploads a file under another learner's UID | Rejected by rule tracing | Storage creation requires the owner of the `{uid}` path. |
| Learner uploads a file declaring an unapproved type or an oversized file | Rejected by rule tracing | Storage Rules require an allow-listed declared content type and a size from 1 byte to 10 MiB. |
| Learner overwrites an existing document | Rejected by rule tracing | Storage `update` is always denied. |
| Learner deletes another learner's file or metadata | Rejected by rule tracing | Both rules require the matching owner UID. |
| Learner creates metadata pointing to another user's file | Rejected by rule tracing | Firestore requires `storagePath == documents/{request.auth.uid}/{documentId}`. |
| Learner creates unexpected or oversized metadata | Rejected by rule tracing | Firestore validates allowed fields, field types, title length, allowed content types, file size, and recent timestamp. |

## Prototype Assessment

```json
{
  "score": 4,
  "summary": "The Document Library uses owner-only Storage paths, immutable Firestore metadata, strict type and size limits, and no application-managed credentials or persisted Firebase download URLs. It is a strong prototype for individual learner uploads.",
  "findings": [
    {
      "check": "Two-service write consistency",
      "severity": "minor",
      "issue": "Cloud Storage and Firestore do not share a browser transaction. The app removes an uploaded file when metadata creation fails, but an interrupted browser session could still leave an unlisted owner-only file.",
      "recommendation": "For a production-scale portal, add a scheduled trusted cleanup process for old unreferenced files and document a staff recovery procedure."
    },
    {
      "check": "Downloaded-file sharing",
      "severity": "minor",
      "issue": "Firebase download URLs are bearer URLs after an authorised user requests them. The portal does not persist or display them, but an authorised learner could still intentionally share the downloaded file or copied URL.",
      "recommendation": "Set clear learner policy expectations and do not treat download authorization as digital-rights management. Use an authenticated server download route for stricter no-share requirements."
    },
    {
      "check": "Content-type inspection",
      "severity": "minor",
      "issue": "Cloud Storage Rules can validate the client-declared MIME type and size, but they cannot inspect file bytes for malware or prove that a file's contents match its declared type.",
      "recommendation": "For a production-scale portal, add trusted server-side malware scanning and content inspection before making documents available to other users."
    }
  ]
}
```

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for owner-only document metadata/file ownership plus type, size, and path validation. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

The Firestore and Firebase Storage Rules compiled successfully and were published to the Firebase project after the default Storage bucket was created.
