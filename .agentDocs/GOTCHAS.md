# Gotchas — the traps this repo already paid for

`AGENTS.md` carries the rule; the topic files carry the cause, so a rule that looks arbitrary can be
judged rather than obeyed blindly. Read the topic for the area you are touching.

Three rules hold across all of them:

1. **Break the guard you named and watch it fail.** A passing test is not evidence it pins anything.
2. **Fix the class, not the instance.** A copied helper or a rule stated twice is one defect, not two.
3. **A comment that makes a checkable promise — "never", "always", "only" — is the test to write.**

| file | read this when… |
| --- | --- |
| [`gotchas/testing.md`](gotchas/testing.md) | you write or trust a test |
| [`gotchas/boot-platforms.md`](gotchas/boot-platforms.md) | you touch a boot provider, artifact builder or platform rule |
| [`gotchas/guards-and-lists.md`](gotchas/guards-and-lists.md) | you add or remove a list member, or change a validator |
| [`gotchas/io-and-encoding.md`](gotchas/io-and-encoding.md) | you slice, decode or bound a read of file or pipe text |
| [`gotchas/panel-and-contracts.md`](gotchas/panel-and-contracts.md) | you change the wire contract, a panel write, or a copied panel shape |
| [`gotchas/versions-and-deps.md`](gotchas/versions-and-deps.md) | you bump a version, move the floor, or edit the release gate |
| [`gotchas/client-and-page.md`](gotchas/client-and-page.md) | you touch the page's state or a host-rendered sentence |
| [`gotchas/method.md`](gotchas/method.md) | a comment or doc promises something, or a measurement is offered |
