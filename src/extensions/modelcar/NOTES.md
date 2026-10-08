# redhat.modelcar – ModelCar Builder (proposed)

- **Real objects**: OCI image with files under `/models` (Red Hat reference Containerfile: ubi9/python-311 download stage → ubi9/ubi-micro:9.4), KServe `storageUri: oci://…`, validated ModelCars `registry.redhat.io/rhelai1/modelcar-*:1.5`.
- **Placement**: "Package as ModelCar" kebab on RedHatAI catalog rows; image name badge "model" (P14 column); Image › ModelCar tab (files, Push to quay.io, Deploy to OpenShift AI with generated InferenceService YAML, Register in model registry, Test locally with an image mount); image kebab "Deploy to OpenShift AI".
- **Journey**: package → build task → image → push → deploy `granite-31-8b-w4a16` to rhoai-dev/sam-ai → Model serving Pending → Loaded.
- **Sources**: docs/research/redhat.modelcar.md.
