# Agent tools

What the model is given, and what gates it.

Related: [server entries](ENTRIES.md)

## Agent tools are merged and on by default

Eight tools, not ten: `servers_lifecycle` carries start/stop/restart, `servers_edit` carries
create/update/delete, `autostart_manage` carries install/uninstall, `ui_manage` drives the panel's own
UI, `panel_logs` reads the panel's console, and `workspaces_list` is the read-only way to see every
workspace. They register on by default;
what gates a mutating call is the session's own permission mode, not a plugin-level default.

A description is read at the approval prompt, so each is one line a person can glance at: what the tool
does, and only the consequence they could not predict (restarting this session's own entry ends it;
installing an entry stops the panel). Mechanics belong in the argument schemas and the docs.

Structured parameters are declared as objects, never as `type: 'json'`: an author-only `json` node
projects to a schema with no `type` at all, and a real session then delivers something the handler
cannot read — `create`/`update` were unusable because of it while every test passed, since tests call
the handler directly. A declared object is validated by the runtime before the handler, so a wrong
shape is rejected with the parameter named.

## Approvals follow the session's sandbox

A mutating agent tool asks the approval service only when the calling session is *not* already
`danger-full-access` (`ctx.sandboxPolicy.resolve({ session })`). Asking anyway made a Full-access run
fail whenever the deployment's approvals auto-reject — the session had already granted exactly what the
tool was asking about. Below full access the tool still asks and still fails closed, and the refusal
names the mode and the remedy.
