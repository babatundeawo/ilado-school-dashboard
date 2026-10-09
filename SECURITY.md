# Security

This project holds access to sensitive school records, so security reports are taken seriously.

## Reporting a vulnerability

Please report problems privately: open the repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue and do not include any student or staff information in your report.

## How the data is protected

- Records are never stored in this repository or in the public website. They live in a Firebase database that only approved, email-verified accounts can read.
- Firestore security rules (`firebase/firestore.rules`) enforce access on the server; hiding buttons in the page is not relied on.
- Bank account details are readable by administrators only.
- Sessions end automatically after a period of inactivity.
