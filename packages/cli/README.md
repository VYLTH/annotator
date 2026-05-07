# vylth-annotator

Thin Node wrapper around the Python `annotator` CLI. Lets npm users invoke the local annotator server via `npx vylth-annotator …` without needing to know about Python tooling.

The actual service is the Python package: https://pypi.org/project/vylth-annotator/

## Usage

```bash
# install once (whichever you have)
pipx install vylth-annotator

# then use either entry point — they do the same thing
annotator run                        # python entry point
npx vylth-annotator run               # npm entry point — execs the python CLI

# or keep both:
npm i -g vylth-annotator              # adds the `annotator` binary too
```

## Why a Node shim at all?

JavaScript developers reach for `npm` / `npx` first. The shim lets them try the tool without learning pipx, while keeping the runtime in Python where the service actually lives. No invasive postinstall — if Python isn't around, you get a clear message.

See the [main repo](https://github.com/VYLTH/annotator) for full docs.
