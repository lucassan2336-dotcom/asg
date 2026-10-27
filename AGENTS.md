<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Membership decisions and reopenings use authenticated database RPCs, never client updates; the database owns role checks, locking and audit history.
- Internal membership notes live in a separate board-only table so applicant reads cannot expose them.
- Membership requests are unique per account or verified email; exceptional rejected cases reopen the existing record with an audited reason.
- Membership security tests run actual migrations in isolated PostgreSQL-compatible storage; never create test approvals in the live database.
