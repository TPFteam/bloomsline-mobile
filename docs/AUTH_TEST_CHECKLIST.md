# Authentication Test Checklist

Run this checklist BEFORE and AFTER every phase of store-readiness changes.

## Sign-Up Flows

- [ ] **Magic link sign-up** — Enter new email → receives OTP email → clicks link → setup-member called → lands on home
- [ ] **Google OAuth sign-up** — New Google account → creates user → setup-member → lands on home
- [ ] **Not-eligible flow** — Sign up with unlinked email → setup-member returns not_eligible → banner shown → can dismiss

## Sign-In Flows

- [ ] **Magic link sign-in** — Existing email → pre-flight confirms account → OTP sent → clicks link → lands on home
- [ ] **Google OAuth sign-in** — Existing Google account → session restored → lands on home
- [ ] **Azure OAuth sign-in** — Existing Azure account → session restored → lands on home

## Session Management

- [ ] **App restart** — Close and reopen app → session persists → lands on home (not welcome)
- [ ] **Token refresh** — Wait >1hr → make API call → token auto-refreshes → call succeeds
- [ ] **Sign out** — Tap sign out → all storage cleared → lands on welcome screen

## Edge Cases

- [ ] **Practitioner account** — Sign in with practitioner email → sees "this app is for members" → redirect to care app
- [ ] **Multiple members** — User with 2+ member records → correct member selected
- [ ] **Deep link from email** — Click booking/resource link → callback extracts tokens → session set → navigates correctly
- [ ] **Network failure during setup** — Kill network during sign-up → graceful error → can retry
- [ ] **Rapid sign-out/sign-in** — Sign out then immediately sign in → no race condition

## API Auth

- [ ] **Bloom chat** — Send message → Bearer token attached → response received
- [ ] **Create booking** — Book appointment → auth header present → booking created
- [ ] **Submit resource** — Complete worksheet → notification sent with auth

## Platform-Specific

- [ ] **Web (PWA)** — All flows work on desktop browser
- [ ] **Mobile web** — All flows work on mobile Safari/Chrome
- [ ] **Native (if built)** — OAuth redirects work with `bloomsline://` scheme
