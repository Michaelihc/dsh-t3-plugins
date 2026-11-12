# T3 plugins for DeepSeek Harness

Prebuilt experimental plugin bundle for **DSH 0.2.2-rc.1**. Includes T3-style session inbox controls (settle, snooze, wake and auto-settle), agent orchestration, and native ACP/Codex conversation backends. This is an unofficial private trial.

## Install

In DSH's **Add plugin** dialog, paste:

```text
github:Michaelihc/dsh-t3-plugins#task/import-t3-bundle
```

Or use the CLI:

```sh
dsh plugin --profile web add github:Michaelihc/dsh-t3-plugins#task/import-t3-bundle
```

Git must have access to this private repository. DSH also accepts an absolute path to a local checkout or to an `npm pack` tarball. The package includes built Host and browser code and needs no build scripts. Restart DSH if requested.

Install and sign in to your preferred coding agent with its own CLI, then restart DSH. The orchestrator detects installed agents; select one under **Native agents** in the composer. Native conversations use the agent's own login. No credentials or sessions are included in this repository.

The default `auto-accept-edits` mode permits ACP read/edit/search/think/fetch requests and denies execution requests. Native plan mode, attachments, mid-turn steering and interactive approval forwarding are unsupported. Switch backends while idle; conversation history is handed to the selected backend.

## Contents

- `plugins/t3-inbox/`: prebuilt inbox plugin and client.
- `plugins/t3-orchestrator/`: prebuilt orchestrator, its TypeScript sources, configuration documentation and third-party notices.
- `cordis.patch.yml`: selects both plugins with their default settings.
- `SOURCE.json`: provenance of the imported prebuilt bundle.

The optional phone/environment add-on is distributed separately and is not part of this core bundle. See [orchestrator configuration](plugins/t3-orchestrator/README.md) and [T3 attribution](plugins/t3-orchestrator/THIRD_PARTY.md). DeepSeek Harness and reused T3 Code components are MIT licensed; their notices are preserved.
