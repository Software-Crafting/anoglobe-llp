import type { Metadata } from "next";
import { ActionForm, AdminShell, crumbsFromDashboard, PageHeader } from "@/components/admin-ui";
import { TextField } from "@/components/fields";
import { Icon } from "@/components/ui";
import { requireUser, userSessions } from "@/lib/auth";
import { dateTime, ROLES } from "@/lib/format";

export const metadata: Metadata = { title: "Profile" };

function deviceName(agent: string | null) {
  const a = agent ?? "";
  const browser = /Edg\//.test(a) ? "Edge" : /Chrome\//.test(a) ? "Chrome" : /Firefox\//.test(a) ? "Firefox" : /Safari\//.test(a) ? "Safari" : "A browser";
  const system = /iPhone|iPad/.test(a) ? "iOS" : /Android/.test(a) ? "Android" : /Mac OS/.test(a) ? "macOS" : /Windows/.test(a) ? "Windows" : /Linux/.test(a) ? "Linux" : "";
  return system ? `${browser} on ${system}` : browser;
}

export default async function ProfilePage() {
  const user = await requireUser();
  const sessions = await userSessions(user.id);
  const back = "/admin/profile";
  return (
    <AdminShell user={user} active="profile">
      <PageHeader title="Profile" crumbs={crumbsFromDashboard} description={`Your account. Role: ${ROLES[user.role]}.`} />
      <form method="post" action="/api/admin" data-dirty-form="">
        <input type="hidden" name="_action" value="profile.save" /><input type="hidden" name="_back" value={back} />
        <section className="a-settings-section" aria-label="Account">
          <div className="a-settings-section__intro"><h2 className="a-settings-section__title">Account</h2><p className="a-settings-section__text">Your name and sign-in email.</p></div>
          <div className="a-card"><div className="a-card__content a-form-grid">
            <TextField name="name" label="Full name" defaultValue={user.name} autoComplete="name" />
            <TextField name="email" label="Email" type="email" defaultValue={user.email} autoComplete="username" />
            <TextField name="title" label="Title" optional defaultValue={user.title ?? ""} />
          </div></div>
        </section>
        <div className="a-save-bar" data-save-bar="" hidden role="region" aria-label="Unsaved changes"><span>You have unsaved changes</span><div className="a-save-bar__actions"><button type="button" className="a-btn a-btn--ghost a-btn--sm" data-discard="">Discard</button><button type="submit" className="a-btn a-btn--primary a-btn--sm">Save changes</button></div></div>
      </form>
      <form method="post" action="/api/admin" data-validate-form="" noValidate>
        <input type="hidden" name="_action" value="profile.password" /><input type="hidden" name="_back" value={back} />
        <section className="a-settings-section" aria-label="Password">
          <div className="a-settings-section__intro"><h2 className="a-settings-section__title">Password</h2><p className="a-settings-section__text">Changing it signs out your other devices.</p></div>
          <div className="a-card"><div className="a-card__content a-form-grid">
            <TextField name="current" label="Current password" type="password" required msgRequired="Enter your current password" autoComplete="current-password" />
            <TextField name="next" label="New password" type="password" required minLength={10} msgRequired="Enter a new password" autoComplete="new-password" hint="At least 10 characters." />
            <div><button type="submit" className="a-btn a-btn--primary">Change password</button></div>
          </div></div>
        </section>
      </form>
      <section className="a-settings-section" aria-label="Sessions">
        <div className="a-settings-section__intro"><h2 className="a-settings-section__title">Sessions</h2><p className="a-settings-section__text">Devices signed in to your account.</p></div>
        <div className="a-card"><div className="a-card__content a-form-grid">
          <ul className="a-feed" role="list">
            {sessions.map((session) => {
              const current = session.hash === user.sessionHash;
              return (
                <li className="a-feed__item" key={session.hash}>
                  <span className="a-avatar a-avatar--sm a-avatar--neutral" aria-hidden="true"><Icon name={/iPhone|Android/.test(session.user_agent ?? "") ? "phone" : "globe"} className="a-icon--16" /></span>
                  <div className="a-feed__text"><p><strong>{deviceName(session.user_agent)}</strong>{current ? ", this device" : ""}</p><p className="a-feed__meta">{session.ip}, {dateTime(session.last_seen_at)}</p></div>
                  {current ? <span className="a-badge a-badge--success">Active now</span> : <ActionForm action="session.revoke" back={back} fields={{ hash: session.hash }} className="a-btn a-btn--ghost a-btn--sm">Sign out</ActionForm>}
                </li>
              );
            })}
          </ul>
        </div></div>
      </section>
    </AdminShell>
  );
}
