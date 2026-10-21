# Nutivo UX audit (mobile, web, Telegram bot)

Date: 2026-10-20 · Read-only code audit · Auditor method: Impeccable `audit` (native variant `audit.native.md`) + `critique`, design:design-critique, design:accessibility-review (WCAG 2.1 AA), design:ux-copy. All three design skills loaded. Impeccable's `context.mjs` was not run, because the audit was read-only and the script can write state. Its reference files were read directly.

Paths below are relative to `/Users/farjad/Downloads/Work-Studio/Nutivo/`. "Needs device check" means the code points to a problem but only a run on a phone can confirm it.

---

## 1. Executive summary: the 5 most damaging problems

1. **The mobile app has no navigation shell.** It has no tab bar and no "me"/settings screen. You can't reach profile, goals, نوتی on/off, Telegram link or support at all. Sign-out is the only account control, and it sits in the top corner where a menu or back button would normally go (`apps/mobile/src/app/index.tsx:122-127`, `_layout.tsx:52-64`).
2. **Leaving the log modal by Android back or iOS swipe-down silently throws away the user's work and leaves a draft open on the server.** The × button and every system gesture discard typed text, the photo and the edited confirm card without asking. Only × even tries to cancel the draft (`log.tsx:75-78`, no `usePreventRemove`/`beforeRemove` anywhere in `apps/mobile/src`).
3. **Two first-run traps.** Onboarding has no exit and no sign-out, so a user who entered the wrong email is stuck. It also tells them "بعداً قابل تغییر است", but on mobile there is no place to change anything later (`onboarding.tsx:62`). On web, editing goals reopens the form with the default numbers (35/175/85), not the user's own, and has no way back (`onboarding-form.tsx:54-59`, `app/onboarding/page.tsx`).
4. **Sign-in doesn't match across the surfaces.** The email puts a 6-digit code front and centre and adds a "ورود در مرورگر" button. Web asks for a "لینک" and has no code field. Mobile has a code field but no "resend code" (`login-form.tsx:41-43`, `packages/db/supabase/templates/magic_link.html:30,39`, `login.tsx:76-111`). Separately, web has no sign-out button at all: `signOutAction` is never used (`features/auth/actions.ts:30`).
5. **The day strip and day swipe point in opposite directions on mobile and web.** Web puts older days on the right and today on the left, and a right swipe goes to a newer day. Mobile does the reverse on both counts (`apps/web/src/features/today/ui/day-strip.tsx:17-22`, `today-view.tsx:197-208` vs `apps/mobile/src/features/day/day-strip.tsx:7-11`, `index.tsx:102-114`). Mobile also lacks web's "برو به امروز", quick repeats and the Ask/«بپرس» feature.

---

## 2. Navigation maps

### 2.1 Mobile (Expo Router, `apps/mobile/src/app`)

Every screen has `headerShown: false` (`_layout.tsx:52`). Each screen has to draw its own way out, and the only one any screen draws is a "×".

```
[Splash] ─ ready ─┬─ signed out ──────────► login
                  │                          email ──send──► code ──verify──► (session) ─┐
                  │                          code ──«ایمیل را عوض کن»──► email            │
                  │                                                                         ▼
                  ├─ signed in, me loading ─► blank ground view (no logo, no spinner)  _layout.tsx:50
                  ├─ signed in, me error ──► AccountError  [دوباره] [خروج از حساب]
                  ├─ signed in, no goals ──► onboarding ──شروع──► index        (NO exit, NO sign-out)
                  └─ signed in, goals ────► index (day view, ROOT, no tabs)
                                              ├─ «خروج» (top corner) ──► signOut (no confirm) ──► login
                                              ├─ day strip tap / horizontal swipe ──► same screen, other date
                                              ├─ «گزارش {روز}» pill ──push──► report ──×/back──► index
                                              ├─ «ثبت وعده» ──modal──► log (input → reading → review)
                                              │                          ├─ × ──► index (draft cancelled)
                                              │                          ├─ Android back / iOS swipe-down ──► index (draft NOT cancelled, text lost)
                                              │                          ├─ «از اول» ──► log input (text+photo kept)
                                              │                          └─ «ثبت …» ──► index + undo toast (8 s)
                                              └─ tap food row ──modal──► item (edit/delete)
                                                                         ├─ × / back / swipe ──► index (edits lost, no prompt)
                                                                         ├─ «ذخیره» ──► index (no confirmation)
                                                                         └─ «حذف این غذا» ──Alert──► index (no undo)
```

Missing destinations: profile/goals, نوتی toggle, Telegram link, Ask/«بپرس», quick repeats, report for another day (only through index), account deletion, support/privacy, app version.

**Dead ends and traps (mobile)**

| # | Where | Trap |
|---|---|---|
| D1 | onboarding | No back, no sign-out, no "wrong account?" link. Android back exits the app, and reopening lands on the same form. |
| D2 | blank "me loading" view (`_layout.tsx:50`) | On a slow network the user sees an empty beige screen with no feedback and no exit. |
| D3 | log modal, `reading` phase (`log.tsx:127-132`) | No cancel and no timeout. × leaves while the request keeps running, and the draft it creates is never cancelled. |
| D4 | log modal, system back/swipe | Typed text, photo and confirm-card edits are lost with no prompt. The server draft is orphaned. |
| D5 | log review with an unmatched item | The save button says "اول وزن آیتم‌های علامت‌دار را کامل کن", but the real block is that an item wasn't found (`ready` needs every `food_id`, `apps/web/src/features/bot/api/service.server.ts:178`). The only fix is ✕. There is no search and no "add item". |
| D6 | report with nothing logged (`report.tsx:106`) | Shows نوتی saying "nothing logged" with no "ثبت وعده" button (web has one, `report-view.tsx:150`). |
| D7 | deep link `nutivo://item` (`item.tsx:21`) | `JSON.parse(undefined)` crashes. Item data travels in the URL instead of an id. |
| D8 | deep link `nutivo://report` or `nutivo://log` on cold start | No `unstable_settings.initialRouteName`, so `index` isn't under the screen and ×/`router.back()` has nowhere to go. Needs device check. |
| D9 | onboarding copy "بعداً قابل تغییر است" | Promises a screen that doesn't exist on mobile. |
| D10 | any past day | No one-tap "back to today" (web has «برو به امروز»). The strip doesn't scroll to the selected day. |

### 2.2 Web (Next.js, `apps/web/src/app`)

```
/  ──redirect──► /today
/login ──send──► "لینک فرستاده شد" (no code input, no resend; email actually shows a code)
/auth/callback | /auth/confirm ──► /today  (error ──► /login?error=link; /login never reads ?error)
load-day: no user ► /login ; no goals ► /onboarding
BottomNav (4 tabs): امروز /today · گزارش /report · بپرس /ask · من /me
/today   ── day strip, swipe, «برو به امروز», composer + quick repeats (fixed bottom), ConfirmSheet & EditItemSheet (in-page dialogs)
/report  ── day strip, «ثبت وعده» on empty → /today?d=
/ask     ── chat, «دیدن امروز» link
/me      ── پروفایل و اهداف → /onboarding · نوتی toggle · بات تلگرام · پنل ادمین (admins) → /admin
/onboarding ── no BottomNav, no back link, CTA «شروع», defaults not current values ──► /today
/admin/* ── admin-nav + «/today» link (admin/layout.tsx:21)
```

**Dead ends (web)**
- No sign-out anywhere: `signOutAction` is defined in `features/auth/actions.ts:30` and never imported.
- `/onboarding` reached from «من» has no way back and no nav. It overwrites the profile with whatever is typed, and the form opens with defaults.
- ConfirmSheet and EditItemSheet aren't in browser history (`confirm-sheet.tsx:36-40` only handles Escape). On Android Chrome or a PWA, system back leaves `/today` and throws the draft away.
- `/login?error=link` (from `auth/callback/route.ts:13`) shows no error message, because `login/page.tsx` ignores searchParams. An expired link drops the user on a blank login page.

### 2.3 Telegram bot (`apps/bot/src`)

```
/start ─┬─ payload link_xxx ─► link account
        ├─ has goals ─► today card (image) + repeats + «گزارش امروز»
        └─ new ─► welcome (نوتی) ─► goal ─► sex ─► age ─► height ─► weight ─► activity ─► tz ─► goals card
text/photo ─► "دارم می‌خونم…" ─► draft card [−][name][+][✕]… [meals] [ثبت|اول وزن‌ها][انصراف]
   name tap ─► "grams mode": next text must be a number 1–2000
ثبت ─► "✓ ثبت شد" + day card + [برگردان]
/today /report /help /link
```

**Dead ends (bot)**
- Grams mode can only be left by sending a valid number. Any food sentence gets "یک عدد بین ۱ تا ۲۰۰۰ بفرست." again, and a sentence that contains a digit is misread as grams (`bot.ts:271-283`).
- Onboarding buttons are removed after a tap (`bot.ts:191`) and there is no "back", so a wrong answer can't be fixed without knowing to `/start` again.
- Goals can't be changed after onboarding (`/start` with goals just shows today, `bot.ts:168`).
- Tapping the name of an unmatched item (⚠) starts grams mode for a food that doesn't exist (`bot.ts:52,197-204`).

---

## 3. Findings

Severity: **P0** blocks or traps users · **P1** serious · **P2** friction · **P3** polish.

### 3.1 Mobile: navigation and information architecture

| ID | Sev | Screen | file:line | What's wrong | Why it matters | Fix |
|---|---|---|---|---|---|---|
| M-NAV-1 | P0 | whole app | `app/_layout.tsx:52-64` | One flat Stack, no Tabs, every header hidden. Day view is the only hub; report is reachable only from a pill on the day card. | Users can't form a model of the app or find a place to go. This is the founder's complaint. | Adopt the tab model in §4: `(tabs)` with امروز / گزارش / ثبت (action) / من. |
| M-NAV-2 | P0 | — | (no route) | No «من» screen: no profile, goals, نوتی switch, Telegram link, support, version or account deletion. | Key product settings are unreachable. App Store guideline 5.1.1(v) requires in-app account deletion for apps that create accounts, so this can block review. | Add `(tabs)/me/index.tsx` with the rows in §4.3, and add `api.profile`, `api.profileUpdate`, `api.prefs`, `api.linkCode`, `api.deleteAccount` to `lib/api.ts`. |
| M-NAV-3 | P0 | log | `app/log.tsx:75-78`, `_layout.tsx:61` | Only × calls `draftCancel`. Android hardware back, iOS swipe-down (modal = pageSheet) and the iOS back gesture dismiss with no prompt, lose text, photo and edits, and leave the server draft open. | People lose work they spent 30–60 s on, and stray drafts pile up on the server. | In `log.tsx`, `usePreventRemove(dirty, ({data}) => Alert.alert("این وعده ثبت نشده", "اگر الان بروی، چیزی ذخیره نمی‌شود.", [{text:"ادامه ثبت",style:"cancel"},{text:"دور بریز",style:"destructive",onPress:()=>{ if(draft) void api.draftCancel(draft.id); navigation.dispatch(data.action);}}]))`, where `dirty = text.trim()!=="" \|\| photo \|\| draft`. Route × through the same path. |
| M-NAV-4 | P0 | onboarding | `app/onboarding.tsx:58-101`, `_layout.tsx:56-58` | No exit and no sign-out. Android back closes the app. | A user who typed the wrong email, or wants to stop, is stuck. | Add a quiet «با ایمیل دیگری وارد شو» (calls `signOut`) under «شروع», and show the signed-in email above the form. |
| M-NAV-5 | P1 | day view | `app/index.tsx:122-127`, `lib/session.tsx:75-79` | «خروج» is the only header action, a tap target of about 36 pt, with no confirmation. It's also the first element a screen reader focuses. | One stray tap ends the session, and coming back costs an email round-trip. The top-corner spot is where users expect a menu or profile. | Move sign-out to «من», confirm with `Alert` («خروج از حساب؟ برای ورود دوباره یک کد به ایمیلت می‌آید.» · «خروج» / «انصراف»), and replace the header action with a profile avatar that links to `/me`. |
| M-NAV-6 | P1 | report | `app/report.tsx:87-89`, `_layout.tsx:63` | A pushed screen (`slide_from_left`) uses a modal-style "×". There's no back chevron, no day strip and no way to another day's report without going back. | It looks like a modal but behaves like a push, which is confusing. Users can't browse reports. | Make report a tab with its own `DayStrip` (as on web). If it stays a push, show a native header: `headerShown: true, title: "گزارش"`, so the back arrow comes out right for RTL. |
| M-NAV-7 | P1 | item, log | `item.tsx:21`, `index.tsx:53` | The item is passed as a JSON string in route params. `nutivo://item` crashes, and the data may be stale. | A crash on a deep link, and the URL grows with the payload. | Use `item/[id].tsx`, load the item by id (`api.item(id)`), and handle "not found" with a back button. |
| M-NAV-8 | P1 | deep links | `_layout.tsx` (no `unstable_settings`) | A cold-start deep link to `report`/`log` has no screen underneath. | × leaves the user nowhere (needs device check). | `export const unstable_settings = { initialRouteName: "(tabs)" }` in the authenticated group layout. |
| M-NAV-9 | P1 | day view | `app/index.tsx:144-172`, `features/day/day-strip.tsx:13` | On a past day there's no «برو به امروز», and the strip doesn't scroll to the selected day. | After swiping back 5 days the user has to swipe forward 5 times or hunt in the strip. | Add a mint chip «برو به امروز» next to the title when `!isToday` (copy from web `today-view.tsx:582-586`). Keep a ref and `scrollTo` the selected index on change. |
| M-NAV-10 | P1 | day view | `day-strip.tsx:7-11`, `index.tsx:102-111` vs web | Strip order and swipe direction are opposite to web (see summary item 5). | Anyone using both surfaces builds the wrong habit. Persian calendars run right to left, older days on the right. | Use web's model on mobile: drop `.reverse()`, start scrolled to today (at the left end), and flip the swipe so `dx > 0` goes to the newer day. Retest the initial scroll offset on Android with forced RTL. |
| M-NAV-11 | P2 | day view | `index.tsx:105-114,139` | Swipe-to-change-day has no hint and is bound to the whole content view, including meal rows inside a vertical ScrollView. | Hard to discover. On Android a horizontal pan can be grabbed by the ScrollView or fire during a diagonal scroll (needs device check). | Limit the swipe to the summary card (as on web). On first run show a one-time caption «برای روز قبل، کارت را به راست بکش» and store it as seen. |
| M-NAV-12 | P2 | item | `item.tsx:227` | Dismissing with unsaved changes asks nothing. | Small loss, but inconsistent with the log fix. | Use the same `usePreventRemove` when `unit/qty/grams` differ from the original. |
| M-NAV-13 | P2 | app.json | `apps/mobile/app.json` (`predictiveBackGestureEnabled: false`) | Predictive back is off, which hides that back on log/item discards silently. | Android 14+ users get no preview of what back will do. | Once `usePreventRemove` is in place, turn it on and test. |

### 3.2 Mobile: first run and sign-in

| ID | Sev | Screen | file:line | What's wrong | Why it matters | Fix |
|---|---|---|---|---|---|---|
| M-AUTH-1 | P1 | login code | `login.tsx:76-111` | No "resend code". The only path is «ایمیل را عوض کن» and then send again, with no countdown. The 10-minute validity isn't mentioned. | People who don't get the email retry blindly and hit the Supabase rate limit, which shows the vague "چند دقیقه بعد". | Add «کد را دوباره بفرست» with a 60 s countdown («ارسال دوباره تا ۰:۴۵»). Copy: «کد شش‌رقمی به {email} فرستاده شد. تا ۱۰ دقیقه معتبر است. پوشه اسپم را هم ببین.» |
| M-AUTH-2 | P1 | login (all surfaces) | `magic_link.html:39` | The email's «ورود در مرورگر» button signs in on web and uses up the same OTP. Back in the app, the code then fails with «این کد درست نیست یا منقضی شده». | Users on a phone tap the big button and then get locked out of the app (needs device check). | For app requests, send a template without the browser button, or make that button deep-link (`nutivo://auth?token_hash=`). In the error copy, say «اگر دکمه داخل ایمیل را زدی، یک کد تازه بگیر». |
| M-AUTH-3 | P2 | login code | `login.tsx:93` | `maxLength={6}` cuts pasted codes with spaces or a prefix ("123 456", "کد: 123456") before `toLatinDigits().replace(/\D/g,"")` runs. | A valid pasted code becomes "incomplete". | Drop maxLength, strip non-digits in `onChangeText`, keep the first 6 digits, and auto-submit at 6. |
| M-AUTH-4 | P2 | login | `login.tsx:29` | One generic send error covers rate limit, network and bad address alike. | The user can't tell what to do. | Map `e.status === 429` to «چند لحظه پیش یک کد فرستادیم؛ همان را وارد کن یا یک دقیقه صبر کن.» and network failures to the shared offline copy. |
| M-AUTH-5 | P2 | session load | `_layout.tsx:50` | While `me` loads, the user sees a blank `bg-ground` view with no logo, spinner or timeout. | It reads as a frozen app. | Show the `Logo` and an `ActivityIndicator` with «در حال باز کردن حسابت…». After 10 s, fall back to `AccountError`. |
| M-ONB-1 | P1 | onboarding | `onboarding.tsx:30-35` | Pre-filled with male / 35 / 175 / 85 / lose. Pressing «شروع» without reading saves made-up goals. | Wrong calorie targets damage every later screen and report. The defaults also assume the user is a man trying to lose weight. | Start with empty fields and no sex or goal selected. Keep «شروع» disabled until all are set, and show the example values as placeholders. |
| M-ONB-2 | P1 | onboarding | `onboarding.tsx:62` | «بعداً قابل تغییر است» with no settings screen on mobile. | Breaks trust. | Ship «من › پروفایل و اهداف», or change the copy to name where it can be changed. |
| M-ONB-3 | P2 | onboarding | `onboarding.tsx:94-96` | The range error shows in red as soon as a field is emptied mid-typing, and it doesn't say which field or what range. | Alarming and vague. | Validate on blur and per field: «سن بین ۱۴ تا ۱۰۰ سال». |
| M-ONB-4 | P2 | onboarding | `onboarding.tsx:59-101` | One long form with no explanation of why sex, age and weight are needed, and no privacy line. | Sensitive data asked for without context. | Add one line under the title, «فقط برای حساب انرژی پایه؛ به کسی نشان داده نمی‌شود.» (bot step `sex` already explains). |

### 3.3 Mobile: logging flow and confirm card

| ID | Sev | Screen | file:line | What's wrong | Why it matters | Fix |
|---|---|---|---|---|---|---|
| M-LOG-1 | P1 | log reading | `log.tsx:37-52,127-132` | No cancel and no timeout while the AI reads. × during reading orphans the draft. | On slow Iranian or Canadian mobile networks it looks hung. | Add an `AbortController` with a 30 s timeout, and a «لغو» quiet button under the spinner. On timeout: «طول کشید. دوباره امتحان کن یا متن کوتاه‌تری بنویس.» with «دوباره». |
| M-LOG-2 | P1 | confirm card | `log.tsx:141-146`, `service.server.ts:178` | When an item isn't found, the disabled button says «اول وزن آیتم‌های علامت‌دار را کامل کن». That's the wrong cause, and the card offers no search. | The user gets a false instruction with no way to act on it. | Base the label on the cause. Unmatched: «"{said}" پیدا نشد؛ حذفش کن یا اسمش را عوض کن». Missing grams: «وزن {n} آیتم را وارد کن». Add a «جایگزین کن» action that opens a food search sheet. |
| M-LOG-3 | P1 | confirm card | `features/log/draft-card.tsx:106-111` | No way to add an item the AI missed (same on web and bot). | The user has to start over, losing the parsed items. | Add «+ افزودن غذا» under the list, using a text field that calls `draftEdit({op:"add", text})` (new op). |
| M-LOG-4 | P1 | day view | (no feature) | No quick repeats ("one-tap repeat" is a v1 capability in PRODUCT.md; web and bot both have them). | Mobile is the slowest surface for the most common action. | Add `day.repeats` chips above «ثبت وعده» (the API already returns repeats to the bot) and reuse web's `repeatsToQuick`. |
| M-LOG-5 | P2 | log | `log.tsx:147-151` | «از اول» keeps the text and photo and returns to input. The label promises a full reset. | Unexpected. | Rename it «ویرایش متن» (keeps input), or clear `text` and `photo` if it stays «از اول». |
| M-LOG-6 | P2 | log | `log.tsx:122` | The CTA «بررسی» is vague. | Unclear outcome. | «پیدا کردن غذاها». |
| M-LOG-7 | P2 | log | `log.tsx:16,33` | Camera-denied copy sends the user to settings without a link. | Extra steps. | Add a «باز کردن تنظیمات» button calling `Linking.openSettings()`. |
| M-LOG-8 | P2 | confirm card | `draft-card.tsx:70-72` | Steppers are labelled «کم کن»/«زیاد کن» without the food name. On multi-item cards a screen reader hears the same labels repeated. | Ambiguous for VoiceOver/TalkBack users. | `accessibilityLabel={\`کم کردن ${it.food}\`}`, and announce the new value via `accessibilityValue`. |
| M-LOG-9 | P2 | log | `log.tsx:138` | The copy says «آیتم‌های خط‌چین», while unknown-quantity items get an amber border (`draft-card.tsx:49`) and only the icon tile is dashed. | Users look for a dashed card that isn't there. | «آیتم‌هایی که با ≈ آمده‌اند تخمینی‌اند…». |
| M-LOG-10 | P2 | log | `_layout.tsx:61`, `screen.tsx:12` | Multiline input plus buttons inside a pageSheet modal with `KeyboardAvoidingView` padding. The CTA may sit under the keyboard (needs device check, iOS sheet offsets). | One-handed scene. | Pin the «پیدا کردن غذاها» button above the keyboard, e.g. with `KeyboardStickyView` or by moving it into a footer outside the ScrollView. |

### 3.4 Mobile: day view, editing, feedback

| ID | Sev | Screen | file:line | What's wrong | Why it matters | Fix |
|---|---|---|---|---|---|---|
| M-DAY-1 | P1 | item delete | `item.tsx:47-63` | Delete uses an Alert and has no undo. Web gives 6 s undo (`today-view.tsx:544-562`), and mobile has undo for saves. | Inconsistent, and deletes can't be reversed. | Drop the Alert, delete optimistically, and show the undo toast (`useUndo().saved`-like `deleted({label, restore})`). |
| M-DAY-2 | P2 | item edit | `item.tsx:78,102-118` | No live kcal preview while changing amount ("الان … کالری" is fixed). Web previews it (`edit-item-sheet.tsx:109,233`). | The user edits blind. | Compute the preview with `macrosForGrams` from `@nutivo/core` (needs food macros from `api.units`, or a new `api.item`). |
| M-DAY-3 | P2 | item save | `item.tsx:37-45` | Saving closes silently, with no toast. | No confirmation that it worked. | Toast «{name} به‌روز شد». |
| M-DAY-4 | P2 | item | `item.tsx:68` | The title is the generic «ویرایش». | Context is lost once the user scrolls. | Use the food name as the title, with «ویرایش» as a small caption. |
| M-DAY-5 | P2 | day view | `index.tsx:138` | First load shows nothing (`data` null, refresh spinner tied to `Boolean(data)`). | A blank screen on every cold open. | Skeleton of the ring card plus strip, or a centered `ActivityIndicator` when `loading && !data`. |
| M-DAY-6 | P2 | day view, today empty | `index.tsx:174-200` | Today with no meals shows only نوتی's line. Empty meals are hidden, so there's no «افزودن» per meal (web shows all four with «افزودن», `meal-list.tsx:28-46`). | No visible structure to start from. | Show the four meal headers with «+ افزودن» that opens `/log?meal=`. |
| M-DAY-7 | P2 | day view | `index.tsx:203` | The account email floats at the bottom of the day view. | Identity info doesn't belong on the content screen. | Move it to «من». |
| M-DAY-8 | P2 | undo toast | `lib/undo.tsx:22,73` | 8 s timeout and a «برگردان» target of about 28 pt (`px-2 py-1`). | Too fast and too small for one-handed or screen-reader use (WCAG 2.2.1, 2.5.5). | Make the target at least 44 pt (`min-h-11 px-4`). Don't auto-hide while a screen reader is on (`AccessibilityInfo.isScreenReaderEnabled`), or extend to 15 s. |
| M-DAY-9 | P3 | day view | `index.tsx:25-27` | "۴۰/۱۲۰" macro numbers rely on bidi around "/". | They may display as goal/consumed (needs device check). | Use «۴۰ از ۱۲۰», as the report already does. |

### 3.5 Mobile: report

| ID | Sev | Screen | file:line | What's wrong | Why it matters | Fix |
|---|---|---|---|---|---|---|
| M-REP-1 | P1 | report | `report.tsx` vs web `report-view.tsx` | Mobile drops the day strip, food table, "analysis is out of date / update" and «نوشتن تحلیل». | It can't do the job web's report does. | Port web's `report-view` sections in order: strip, kcal, macros, food table, day checks, نوتی. |
| M-REP-2 | P1 | report, نوتی | `report.tsx:92-97,145-146`, `ui/nuti.tsx` | نوتی always appears. Mobile has no setting, and the web toggle is per-browser localStorage (`mascot/model/enabled.ts:4-24`). | Breaks the brand rule that نوتی can be switched off, and the choice doesn't carry across devices. | Store `nuti_enabled` on the profile, return it from `me`, and fall back to «تحلیل Nutivo» with a Lucide `Sparkles` icon, as on web. |
| M-REP-3 | P2 | report empty | `report.tsx:106` | No call to action. | Dead end (D6). | Add `Button label="ثبت وعده برای این روز"` → `router.push({pathname:"/log", params:{date}})`. |
| M-REP-4 | P2 | report | `report.tsx:92-104` | Error and loading stack with no structure; retry is a quiet button. | Fine, but no offline hint. | Reuse a shared `ErrorState` component (see quick wins). |
| M-REP-5 | P3 | report | `report.tsx:151` | The «برای فردا» box (`bg-surface rounded-btn`) sits inside the purple card. | Nested card, against the founder's rule. | Replace it with a divider and heading inside the same card. |
| M-REP-6 | P3 | report | `report.tsx:143` | `accessibilityRole="summary"` on the analysis View. | Wrong role, since `summary` is meant for app-launch summaries. | Use `accessibilityRole="header"` on the title and leave the container without a role. |

### 3.6 Mobile: accessibility (WCAG 2.1 AA, native)

| ID | Sev | Element | file:line | Issue | Fix |
|---|---|---|---|---|---|
| M-A11Y-1 | P1 | touch targets | `index.tsx:124` (≈36), `index.tsx:150` report pill (≈30), `log.tsx:87`/`item.tsx:69`/`report.tsx:87` × (40), `draft-card.tsx:15` steppers (40), `draft-card.tsx:56` remove (36), `login.tsx:107` change email (≈36), `log.tsx:96` remove photo (≈30), `undo.tsx:73` (≈28) | Below 44 pt (2.5.5, HIG). One-handed scene. | Use `min-h-11 min-w-11` for icon buttons and `hitSlop={8}` for pills. |
| M-A11Y-2 | P2 | ring | `ui/ring.tsx:14` | `progressbar` with a value but no label. | `accessibilityLabel="کالری امروز"`, plus `accessibilityValue.text` («۱٬۲۰۰ از ۱٬۹۰۰ کالری»). |
| M-A11Y-3 | P2 | macro bars | `index.tsx:19-35` | Three separate text nodes per bar, no role. | Wrap each bar as `accessible accessibilityRole="progressbar" accessibilityLabel="پروتئین ۴۰ از ۱۲۰ گرم"`. |
| M-A11Y-4 | P2 | disabled CTA | `ui/button.tsx:21` | `opacity-60` takes white on green-ink to about 2.5:1, and on mobile the disabled CTA carries the instruction (`log.tsx:141`). | Put the instruction in a separate visible `Text`, and keep the button label short. |
| M-A11Y-5 | P2 | contrast | `index.tsx:196-197` | `text-ink-2` (#667085) on `bg-track` (#eef0f2) is about 4.3:1 at 14 px. Fails 1.4.3. | Use `text-ink` on track, or `bg-surface` with a dashed border. |
| M-A11Y-6 | P2 | dynamic type | `ui/button.tsx:21` `h-12`, `ui/field.tsx:18` `h-12`, `day-strip.tsx:25` `h-[68px] w-11`, `text-[11px]` | Fixed heights clip at large text sizes (needs device check at 200 %). | Use `min-h-12` instead of `h-12`. Let the strip cells grow, and set `maxFontSizeMultiplier={1.4}` only on the strip digits. |
| M-A11Y-7 | P2 | focus order | `index.tsx:122-127` | The first focusable element is «خروج». | Move it (M-NAV-5). Make the title the first heading (`accessibilityRole="header"`). |
| M-A11Y-8 | P2 | headings | all screens | No `accessibilityRole="header"` on any title. Screen readers can't jump by heading. | Add it to screen titles and card titles. |
| M-A11Y-9 | P3 | GramsInput | `draft-card.tsx:39` | The disabled «ثبت وزن» doesn't report `accessibilityState.disabled`. | Add it. |
| M-A11Y-10 | P3 | icons | throughout | Text glyphs (×, −, +) where the brand calls for Lucide icons. | Use `lucide-react-native` `X`, `Minus`, `Plus`, `ChevronRight` (RTL back). |
| M-A11Y-11 | P3 | reduced motion | `_layout.tsx:52,61,63` | Slide/fade transitions with no Reduce Motion check. | Check `AccessibilityInfo.isReduceMotionEnabled()`, and set `animation: "none"` or `"fade"` when it's on. |

### 3.7 Web app

| ID | Sev | Screen | file:line | What's wrong | Why it matters | Fix |
|---|---|---|---|---|---|---|
| W-1 | P1 | all | `features/auth/actions.ts:30` (unused), `app/(app)/me/page.tsx:35-66` | No sign-out anywhere. | People on shared or family computers can't sign out, which is a privacy risk for health data. | Add a «خروج از حساب» row at the end of «من» as a `<form action={signOutAction}>`, and make the action `redirect("/login")`. |
| W-2 | P1 | login | `features/auth/login-form.tsx:9-15,41-43`, `magic_link.html` | The UI says "link", the email leads with a code, and there's no code field or resend. | Users look for a link, find a code, and have nowhere to type it. | Use mobile's two-step email → code form on web (`verifyOtp`), keep the link as backup, and add the resend countdown. |
| W-3 | P1 | login | `app/(auth)/login/page.tsx` | Ignores `?error=link` from `auth/callback/route.ts:13`. | An expired link fails silently. | Read searchParams and show «لینک منقضی شده یا قبلاً استفاده شده. یک کد تازه بگیر.» |
| W-4 | P1 | edit profile | `app/onboarding/page.tsx:8-15`, `onboarding-form.tsx:54-59,110-111` | Reached from «من», but it opens with defaults, has no back link or BottomNav, and the CTA says «شروع». | Editing one value quietly resets the others. | Add `/me/profile` that loads the current profile and goals into the same form (pass `initial`), uses the CTA «ذخیره» and has a back link «→ من». Keep `/onboarding` for first run. |
| W-5 | P1 | today | `log-meal/ui/confirm-sheet.tsx:36-40`, `edit-meal/ui/edit-item-sheet.tsx:42-46` | Sheets aren't in history, so system back on Android or a PWA leaves the page and drops the draft. There's no focus trap either. | Lost work. Keyboard users can tab behind the sheet. | `history.pushState({sheet:1})` on open and close on `popstate`. Use `<dialog>`/`inert` on `main` for the focus trap, and return focus to the opener on close. |
| W-6 | P2 | نوتی toggle | `mascot/model/enabled.ts:4-24` | Saved per browser only, so mobile, bot and other browsers ignore it. | The brand promise "can be switched off" only holds in one tab. | Store it on the profile (as in M-REP-2). |
| W-7 | P2 | «من» | `app/(app)/me/page.tsx` | No email, goals summary, account deletion, privacy or support (support contacts exist in the email footer per commit ed044f8). | Thin settings page. | Rows: account (email) · پروفایل و اهداف (show «۱٬۹۰۰ کالری») · نوتی · بات تلگرام · پشتیبانی · حریم خصوصی · حذف حساب · خروج. |
| W-8 | P2 | bottom nav | `features/today/ui/bottom-nav.tsx:23` | The inactive «بپرس» tab is purple. | Next to the green active tab it reads as a second active state. | Use ink-2 when inactive, purple only for the icon dot. |
| W-9 | P2 | onboarding | `onboarding-form.tsx:64` | Validation checks only minimums (age 100+ accepted on the client), while mobile checks both. | Inconsistent errors. | Share the validator from `@nutivo/core`. |
| W-10 | P3 | admin | `app/admin/layout.tsx:21` | Fine. Admin is reachable only from «من» and returns to `/today`. | — | Keep. |

### 3.8 Telegram bot

| ID | Sev | Flow | file:line | What's wrong | Why it matters | Fix |
|---|---|---|---|---|---|---|
| B-1 | P1 | grams mode | `apps/bot/src/bot.ts:271-283` | Once in grams mode, only a number leaves it, and "۲ تا تخم‌مرغ" is read as 2 g. | Trap plus a wrong save. | Accept only messages that are just a number (`/^\s*[\d۰-۹٫.]+\s*(گرم)?\s*$/`). For anything else, clear `s.grams` and treat the text as a new meal, with a «انصراف» inline button on the grams prompt. |
| B-2 | P2 | onboarding | `bot.ts:191`, `STEPS` `bot.ts:28-37` | Buttons are removed after a tap and there's no back. Labels differ from the apps («کم کردن وزن» vs «کاهش تدریجی»; 4 activity levels vs 5, with no «خیلی فعال»). | Wrong answers can't be fixed. Goals differ by surface. | Add a «← قبلی» button per step, share the `ACTIVITY`/`GOAL` labels from `@nutivo/core`, and add `very_active`. |
| B-3 | P2 | goals | `bot.ts:168` | No way to change goals after onboarding. | Settings dead end. | Add a `/goals` command that reruns the steps with current values shown. |
| B-4 | P2 | unmatched item | `bot.ts:52,197-204` | Tapping the ⚠ name of an unmatched item asks for grams. | Pointless request. | For `!it.food`, make the label button send «"{said}" را دوباره بنویس» instead. |
| B-5 | P2 | نوتی | `text.ts:73`, nightly cron | The bot is always نوتی and has no off switch. | Brand rule. | Respect profile `nuti_enabled` and use a neutral «Nutivo» voice when it's off. |
| B-6 | P2 | grams bound | `text.ts:92` (2000) vs mobile/web 5000 (`draft-card.tsx:24`, `item.tsx:121`) | Different limits per surface. | Inconsistent. | Single constant in `@nutivo/core`. |
| B-7 | P3 | day card | `text.ts:37,58` | A non-today title prints the ISO date «2026-10-19». | Latin ISO in Persian UI. | Use `faDayLabel`, the same Intl formatter as mobile. |
| B-8 | P3 | copy | `text.ts:75-76` | «دارم می‌خونم… یه لحظه» (spoken) vs «دارم عکس را نگاه می‌کنم» (written). | Mixed register. | «دارم می‌خونم…» / «دارم عکس رو نگاه می‌کنم…» (both نوتی, spoken). |
| B-9 | P2 | link | `text.ts:84`, `bot.ts:178` | «/link … حساب وب» and «کد را از صفحه «من» در وب بگیر». Mobile users have no «من» and no way to link. | A mobile-first user can't connect the bot. | Add «بات تلگرام» to mobile «من», and say «حساب Nutivo» instead of «حساب وب». |

### 3.9 Cross-surface copy and terminology (ux-copy)

The register rule should be: **UI chrome speaks written-informal second person** (بنویس، بزن، «را»). **Only نوتی speaks spoken colloquial** (رو، میره، یه). Today the UI also uses a first-person "I" with no نوتی present: «درست فهمیدم؟» (`log.tsx:84`), «دارم غذاها را پیدا می‌کنم…» (`log.tsx:130`). When نوتی is off, nobody owns that "I".

| Concept | Variants found | Use |
|---|---|---|
| carbs | کربو (`index.tsx:161`, `onboarding.tsx:82`, `draft-card.tsx:118`) · کربوهیدرات (`report.tsx:128`, web `today-view.tsx:618`) | کربوهیدرات in full, کربو only in tight 4-column totals |
| macros | درشت‌مغذی‌ها (`report.tsx:126`, `login.tsx:50`) · ماکروها (web `report-view.tsx:166`) | درشت‌مغذی‌ها |
| undo | برگردان · «برگردانده شد.» (`undo.tsx:61`) · «برگشت.» (web, bot) | button «برگردان», result «برگشت.» |
| sign-in token | کد ورود (mobile, email) · لینک ورود (web) | کد ورود |
| sign out | خروج (`index.tsx:125`) · خروج از حساب | خروج از حساب |
| height unit | سانت (mobile) · سانتی‌متر (web, bot) | سانتی‌متر |
| goal "lose" | کاهش تدریجی · کم کردن وزن (bot) | کاهش تدریجی |
| add food | ثبت وعده · افزودن (web meal card) | ثبت وعده (action) / افزودن به {وعده} |
| delete | حذف این غذا · حذف · ✕ | حذف {name} |
| report title | گزارش امروز (mobile) · گزارش تغذیه روزانه (web) | گزارش {روز} |
| linked account | حساب وب (bot) | حساب Nutivo |

Copy rewrites:
- `log.tsx:84` «چی خوردی؟» → «چه خوردی؟» (UI); review «درست فهمیدم؟» → «همین‌ها بود؟»
- `log.tsx:130` «دارم غذاها را پیدا می‌کنم…» → «در حال پیدا کردن غذاها…» (or نوتی-voiced with her image when she's on)
- `onboarding.tsx:62` → «از این‌ها هدف روزانه‌ات را حساب می‌کنیم. از «من › پروفایل و اهداف» قابل تغییر است.»
- `item.tsx:48` Alert, if kept: title «حذف {name}؟», body «از {وعده} برداشته می‌شود.», buttons «حذف» / «نگه دار»
- Generic network error (`api.ts:43`) is good. Reuse it everywhere instead of per-screen variants.

### 3.10 Visual hierarchy and brand (critique)

- First impression, day view: the ring and number lead, which is right. But «گزارش امروز», the only route to the report, is a 12 px purple pill in the card's corner and competes with nothing. The purple is fine because the report is Nutivo's analysis, but the pill is too small to be primary navigation.
- Green vs purple use is otherwise correct throughout. Going over goal uses amber, never red (`ring.tsx:6`, `report.tsx:31`).
- Brand violations: text glyphs instead of Lucide (all mobile screens); a nested card in the report (`report.tsx:151`). No bounce, no gradients, IRANYekanX applied (`ui/text.tsx`). Good.
- What works: undo after save on every surface; the "numbers come from the food table, not AI" reassurance (`log.tsx:123`); careful RTL handling of signs in the report (`report.tsx:52`); Persian-keyboard detection on email (`login.tsx:22-23`); shared copy tone that is supportive, not judgmental; `AccountError` has both retry and exit.

### Impeccable native audit score (mobile)

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2 | Labels mostly present. Targets <44 pt, no headers, timed undo, fixed heights |
| 2 | Performance | 3 | Small lists, ScrollView fine at this size. Base64 photo in JSON is acceptable |
| 3 | Appearance & theming | 3 | Tokens for light and dark. Glyph icons off-brand |
| 4 | Platform conformance | 1 | No tab bar, headers hidden, × on a push, gestures bypass discard, back behaviour inconsistent |
| 5 | Adaptivity | 2 | Portrait only, no tablet. Keyboard in sheet and dynamic type need a device check |
| **Total** | | **11/20** | **Acceptable, significant work needed** |

**Platform conformance verdict: FAIL.** It reads like a web page placed in a Stack. There are no native headers, no tab bar, and system back/swipe isn't treated as a first-class exit.

---

## 4. Recommended navigation model (mobile)

### 4.1 Model

Four tabs plus a centre action, in RTL order (Expo Router with forced RTL puts the first tab on the right):

**امروز · گزارش · [ثبت] · من**. Add «بپرس» when Ask ships on mobile, giving 5 slots: امروز · گزارش · ثبت · بپرس · من, the same as web.

- «ثبت» is not a screen. Pressing it opens the `log` modal (the thumb zone for one-handed use).
- Everything that changes data (log, item) is a **modal** with a confirm-on-discard guard.
- Everything that drills into information (goals, Telegram, report of a day from the day card) is a **push** with a **native header** (back chevron mirrored automatically in RTL).

### 4.2 Route structure (Expo Router)

```
src/app/
  _layout.tsx                 Root Stack. Stack.Protected guards as today. Providers.
  login.tsx                   (guard: !signedIn)
  onboarding.tsx              (guard: signedIn && !has_goals) + «با ایمیل دیگری وارد شو»
  (app)/                      (guard: signedIn && has_goals)
    _layout.tsx               Stack; export const unstable_settings = { initialRouteName: "(tabs)" }
    (tabs)/
      _layout.tsx             <Tabs> with lucide icons: House, FileText, Plus (center), UserRound
      index.tsx               امروز (day view; ?date=)
      report.tsx              گزارش (own DayStrip; ?date=)
      log-tab.tsx             placeholder; listeners={{ tabPress: e => { e.preventDefault(); router.push("/log"); } }}
      me/
        _layout.tsx           Stack (headerShown: true, native RTL back)
        index.tsx             من
        profile.tsx           پروفایل و اهداف (prefilled form, «ذخیره»)
        telegram.tsx          بات تلگرام (link code + open t.me)
        about.tsx             پشتیبانی، حریم خصوصی، نسخه
    log.tsx                   presentation: "modal"; usePreventRemove when dirty; ?date=&meal=
    item/[id].tsx             presentation: "modal"; loads by id; usePreventRemove when changed
```

Wiring notes:
- `(tabs)/_layout.tsx`: `screenOptions={{ headerShown: false, tabBarActiveTintColor: green-ink, tabBarLabelStyle: { fontFamily: "IRANYekanXFaNum-Bold" } }}`, `backBehavior="initialRoute"`, so Android back on any tab goes to امروز and then exits.
- The day card's report pill becomes `router.navigate({ pathname: "/report", params: { date: shown } })`, which switches tab and keeps the date. Keep it as a secondary entry.
- The header of امروز gets a profile avatar (`UserRound`) on the trailing side that opens `/me`, replacing «خروج».
- `log.tsx`: one `leave()` used by ×, the `usePreventRemove` callback and success; it calls `draftCancel` unless confirmed. `gestureEnabled: !dirty` is a simpler fallback on iOS.
- Unify the day strip with web (older on the right), and add «برو به امروز» to امروز and گزارش.
- Undo toast: render it above the tab bar, `bottom: tabBarHeight + 8`.

### 4.3 «من» contents (mobile and web, same order)

1. Account: email (read-only)
2. پروفایل و اهداف: subtitle «۱٬۹۰۰ کالری · ۱۲۰ گرم پروتئین» → `me/profile`
3. نوتی: switch (synced through `api.prefs`), subtitle as on web `nuti-toggle.tsx:14`
4. بات تلگرام: «وصل است · @user» or «اتصال» → `me/telegram`
5. پشتیبانی و حریم خصوصی → `me/about`
6. حذف حساب (destructive, confirm with typed «حذف»)
7. خروج از حساب (confirm)

---

## 5. Quick wins vs larger changes

### Quick wins (about 30 min or less each)
1. Move «خروج» off the day view and add a sign-out confirm Alert (`index.tsx:122-127`).
2. Add «با ایمیل دیگری وارد شو» to onboarding (`onboarding.tsx`).
3. Add `usePreventRemove` with a discard Alert and `draftCancel` in `log.tsx` (M-NAV-3).
4. Add `unstable_settings.initialRouteName` (M-NAV-8).
5. «برو به امروز» chip on the mobile day view (M-NAV-9).
6. Raise every icon button and pill to 44 pt (`min-h-11 min-w-11`, `hitSlop`) (M-A11Y-1).
7. Undo toast: bigger target, longer or no timeout when a screen reader is on (M-DAY-8).
8. «ثبت وعده» CTA on the empty mobile report (M-REP-3).
9. Fix the not-ready CTA copy by cause (M-LOG-2 copy part only).
10. Rename «از اول»/«بررسی» and fix «خط‌چین» copy (M-LOG-5/6/9).
11. Login: strip non-digits and auto-submit at 6 instead of `maxLength` (M-AUTH-3); 429-specific copy (M-AUTH-4).
12. Spinner and logo on the blank session-loading view (M-AUTH-5); skeleton on the first day load (M-DAY-5).
13. Web: sign-out row in «من» (W-1); show `?error=link` on login (W-3).
14. Bot: let food text exit grams mode, digits-only parsing (B-1); localized date in the day card (B-7).
15. Accessibility labels: ring and macro bars, headers on titles, stepper labels with the food name (M-A11Y-2/3/8, M-LOG-8).
16. Copy terminology pass from the §3.9 table.

### Larger changes
1. Tab shell and route restructure from §4.2 (M-NAV-1, M-NAV-6, M-NAV-7). Estimate 1–2 days.
2. «من» screen with profile edit (prefilled), Telegram link, نوتی preference stored on the server, account deletion, support (M-NAV-2, W-4, W-6, W-7, B-5, B-9). 2–3 days including API.
3. Code-based sign-in on web plus resend on mobile, and fix the email button consuming the OTP (W-2, M-AUTH-1, M-AUTH-2). 1 day.
4. Confirm card: «افزودن غذا» and «جایگزین کن» with food search, on all three surfaces (M-LOG-2, M-LOG-3, B-4). 2 days.
5. Quick repeats on mobile (M-LOG-4). 0.5–1 day.
6. Mobile report parity with web: strip, food table, regenerate (M-REP-1). 1–2 days.
7. Unify the strip direction and swipe across surfaces (M-NAV-10). 0.5 day plus device testing.
8. Web sheets with history and a focus trap (W-5). 0.5 day.
9. Empty onboarding fields with per-field validation, and a shared validator and label set in `@nutivo/core` used by mobile, web and bot (M-ONB-1, M-ONB-3, W-9, B-2, B-6). 1 day.
10. Dynamic type and keyboard-in-sheet device pass (M-A11Y-6, M-LOG-10). Needs device check.
