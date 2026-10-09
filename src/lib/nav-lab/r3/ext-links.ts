/**
 * P13: external resources per extension / extension page (product page,
 * documentation, source repository). Keyed by both the extension ids of
 * `exts.ts` and the tool ids of `data.ts` (`TOOLS`). URLs come from
 * docs/research/*.md and the upstream repositories of the extensions.
 */

export interface ExtLinks {
  product?: string;
  docs?: string;
  repo?: string;
}

export interface ExtLink {
  label: string;
  href: string;
}

const RH_DOCS = 'https://docs.redhat.com/en/documentation';
const GH = 'https://github.com';
const PD_DOCS = 'https://podman-desktop.io/docs';

export const EXT_LINKS: Record<string, ExtLinks> = {
  /* Built-in */
  podman: { product: 'https://podman.io', docs: `${PD_DOCS}/podman`, repo: `${GH}/podman-desktop/podman-desktop` },
  docker: { docs: `${PD_DOCS}/migrating-from-docker`, repo: `${GH}/podman-desktop/podman-desktop` },
  compose: { docs: `${PD_DOCS}/compose`, repo: `${GH}/podman-desktop/extension-compose` },
  kind: { product: 'https://kind.sigs.k8s.io', docs: `${PD_DOCS}/kind`, repo: `${GH}/podman-desktop/extension-kind` },
  kubectl: { docs: 'https://kubernetes.io/docs/reference/kubectl/', repo: `${GH}/podman-desktop/podman-desktop` },
  registries: { docs: `${PD_DOCS}/containers/registries`, repo: `${GH}/podman-desktop/podman-desktop` },

  /* Podman Desktop extensions */
  bootc: {
    product: 'https://www.redhat.com/en/technologies/linux-platforms/enterprise-linux/image-mode',
    docs: `${RH_DOCS}/red_hat_enterprise_linux/10/html/using_image_mode_for_rhel_to_build_deploy_and_manage_operating_systems`,
    repo: `${GH}/podman-desktop/extension-bootc`,
  },
  quadlet: { docs: 'https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html', repo: `${GH}/podman-desktop/extension-podman-quadlet` },
  'kube-dashboard': { docs: `${PD_DOCS}/kubernetes`, repo: `${GH}/podman-desktop/extension-kubernetes-dashboard` },
  helm: { product: 'https://helm.sh', docs: 'https://helm.sh/docs/', repo: `${GH}/helm/helm` },
  mcp: { product: 'https://modelcontextprotocol.io', docs: 'https://modelcontextprotocol.io/docs', repo: `${GH}/containers/kubernetes-mcp-server` },
  grype: { product: 'https://anchore.com/opensource/', docs: `${GH}/anchore/grype#readme`, repo: `${GH}/podman-desktop/extension-grype` },
  'layers-explorer': { repo: `${GH}/podman-desktop/extension-layers-explorer` },
  'apple-container': { docs: `${GH}/apple/container#readme`, repo: `${GH}/podman-desktop/extension-apple-container` },
  wslc: { docs: 'https://learn.microsoft.com/en-us/windows/wsl/wsl-container', repo: `${GH}/microsoft/WSL` },
  kreate: { repo: `${GH}/podman-desktop/extension-kreate` },
  devcontainers: { product: 'https://containers.dev', docs: 'https://containers.dev/implementors/json_reference/', repo: `${GH}/devcontainers/cli` },
  services: { docs: PD_DOCS, repo: `${GH}/redhat-developer/podman-desktop-redhat-pack-ext` },

  /* Red Hat: AI */
  'ai-lab': {
    product: 'https://developers.redhat.com/products/podman-desktop/podman-ai-lab',
    docs: `${PD_DOCS}/ai-lab`,
    repo: `${GH}/containers/podman-desktop-extension-ai-lab`,
  },
  'ai-inference': {
    product: 'https://www.redhat.com/en/products/ai/inference-server',
    docs: `${RH_DOCS}/red_hat_ai_inference_server`,
    repo: `${GH}/vllm-project/vllm`,
  },
  modelcar: {
    product: 'https://developers.redhat.com/articles/2025/01/30/build-and-deploy-modelcar-container-openshift-ai',
    docs: 'https://kserve.github.io/website/latest/modelserving/storage/oci/',
    repo: `${GH}/redhat-ai-services/modelcar-catalog`,
  },
  maas: { docs: `${RH_DOCS}/red_hat_openshift_ai_self-managed`, repo: `${GH}/opendatahub-io/models-as-a-service` },
  rhoai: { product: 'https://www.redhat.com/en/products/ai/openshift-ai', docs: `${RH_DOCS}/red_hat_openshift_ai_self-managed`, repo: `${GH}/opendatahub-io/odh-dashboard` },
  lightspeed: {
    docs: `${RH_DOCS}/red_hat_enterprise_linux/10`,
    repo: `${GH}/redhat-developer/podman-desktop-redhat-lightspeed-ext`,
  },

  /* Red Hat: platforms and accounts */
  'openshift-local': { product: 'https://developers.redhat.com/products/openshift-local/overview', docs: 'https://crc.dev/docs/', repo: `${GH}/crc-org/crc-extension` },
  sandbox: { product: 'https://developers.redhat.com/developer-sandbox', docs: `${PD_DOCS}/openshift/developer-sandbox`, repo: `${GH}/redhat-developer/podman-desktop-sandbox-ext` },
  minc: { docs: `${GH}/minc-org/minc#readme`, repo: `${GH}/minc-org/minc-extension` },
  'openshift-console': { product: 'https://www.redhat.com/en/technologies/cloud-computing/openshift', docs: `${RH_DOCS}/openshift_container_platform`, repo: `${GH}/openshift/console` },
  'openshift-checker': { docs: `${RH_DOCS}/openshift_container_platform`, repo: `${GH}/redhat-developer/podman-desktop-image-checker-openshift-ext` },
  rhel: { product: 'https://www.redhat.com/en/technologies/linux-platforms/enterprise-linux', docs: `${RH_DOCS}/red_hat_enterprise_linux/10`, repo: `${GH}/redhat-developer/podman-desktop-rhel-ext` },
  'rhel-vms': { product: 'https://www.redhat.com/en/technologies/linux-platforms/enterprise-linux', docs: `${RH_DOCS}/red_hat_enterprise_linux/10`, repo: `${GH}/redhat-developer/podman-desktop-rhel-ext` },
  'redhat-account': { product: 'https://developers.redhat.com', docs: 'https://access.redhat.com/RegistryAuthentication', repo: `${GH}/redhat-developer/podman-desktop-redhat-account-ext` },
  hummingbird: { repo: `${GH}/redhat-developer/podman-desktop-hummingbird-ext` },
  insights: { product: 'https://www.redhat.com/en/technologies/management/insights', docs: `${RH_DOCS}/red_hat_insights` },
  pipelines: { product: 'https://www.redhat.com/en/technologies/cloud-computing/openshift/pipelines', docs: `${RH_DOCS}/red_hat_openshift_pipelines`, repo: `${GH}/tektoncd/pipeline` },
  argo: { product: 'https://www.redhat.com/en/technologies/cloud-computing/openshift/gitops', docs: 'https://argo-cd.readthedocs.io/en/stable/', repo: `${GH}/argoproj/argo-cd` },
  virt: { product: 'https://www.redhat.com/en/technologies/cloud-computing/openshift/virtualization', docs: 'https://kubevirt.io/api-reference/', repo: `${GH}/kubevirt/kubevirt` },
  olm: { docs: 'https://operator-framework.github.io/operator-controller/', repo: `${GH}/operator-framework/operator-controller` },
  skupper: { product: 'https://www.redhat.com/en/technologies/cloud-computing/service-interconnect', docs: `${RH_DOCS}/red_hat_service_interconnect`, repo: `${GH}/skupperproject/skupper` },
  kafka: { product: 'https://developers.redhat.com/products/streams-for-apache-kafka/overview', docs: `${RH_DOCS}/red_hat_streams_for_apache_kafka`, repo: `${GH}/strimzi/strimzi-kafka-operator` },
  keycloak: { product: 'https://access.redhat.com/products/red-hat-build-keycloak/', docs: `${RH_DOCS}/red_hat_build_of_keycloak`, repo: `${GH}/keycloak/keycloak` },
  aap: { product: 'https://www.redhat.com/en/technologies/management/ansible', docs: `${RH_DOCS}/red_hat_ansible_automation_platform`, repo: `${GH}/RedHatOfficial/aap-demo-podman-desktop-extension` },
  edge: { product: 'https://www.redhat.com/en/technologies/device-edge', docs: `${RH_DOCS}/red_hat_edge_manager`, repo: `${GH}/flightctl/flightctl` },
  satellite: { product: 'https://www.redhat.com/en/technologies/management/satellite', docs: `${RH_DOCS}/red_hat_satellite`, repo: `${GH}/Katello/katello` },
  cryostat: { product: 'https://cryostat.io', docs: `${RH_DOCS}/red_hat_build_of_cryostat/4`, repo: `${GH}/cryostatio/cryostat` },
  'image-builder': { product: 'https://console.redhat.com/insights/image-builder', docs: 'https://osbuild.org/docs/', repo: `${GH}/osbuild/image-builder-cli` },

  /* Red Hat: build and integration */
  mta: { product: 'https://developers.redhat.com/products/mta/overview', docs: `${RH_DOCS}/migration_toolkit_for_applications/8.1`, repo: `${GH}/konveyor/kantra` },
  konflux: { product: 'https://konflux-ci.dev', docs: 'https://konflux-ci.dev/docs/', repo: `${GH}/konflux-ci/konflux-ci` },
  quarkus: { product: 'https://developers.redhat.com/products/quarkus/overview', docs: 'https://quarkus.io/guides/', repo: `${GH}/quarkusio/quarkus` },
  ansible: { product: 'https://www.redhat.com/en/technologies/management/ansible', docs: 'https://docs.ansible.com/', repo: `${GH}/ansible/ansible-dev-tools` },
  kaoto: { product: 'https://kaoto.io', docs: `${RH_DOCS}/red_hat_build_of_apache_camel/4.14`, repo: `${GH}/KaotoIO/kaoto` },
  rhdh: { product: 'https://developers.redhat.com/rhdh/overview', docs: `${RH_DOCS}/red_hat_developer_hub/`, repo: `${GH}/redhat-developer/rhdh-local` },
  apicurio: { product: 'https://www.apicur.io/registry/', docs: `${RH_DOCS}/red_hat_build_of_apicurio_registry/3.1/`, repo: `${GH}/Apicurio/apicurio-registry` },
  debezium: { product: 'https://debezium.io', docs: `${RH_DOCS}/red_hat_build_of_debezium`, repo: `${GH}/debezium/debezium` },

  /* Red Hat: security */
  quay: { product: 'https://www.redhat.com/en/technologies/cloud-computing/quay', docs: 'https://docs.quay.io/', repo: `${GH}/quay/quay` },
  tas: { docs: `${RH_DOCS}/red_hat_trusted_artifact_signer`, repo: `${GH}/sigstore/cosign` },
  tpa: { docs: `${RH_DOCS}/red_hat_trusted_profile_analyzer`, repo: `${GH}/guacsec/trustify` },
  conforma: { product: 'https://conforma.dev', docs: 'https://conforma.dev/docs/', repo: `${GH}/conforma/cli` },
};

/** Ordered, labelled links of an extension / extension page (Docs · Repository · Product); empty when unknown. */
export function linksFor(id: string | undefined): ExtLink[] {
  const l = id ? EXT_LINKS[id] : undefined;
  if (!l) return [];
  const out: ExtLink[] = [];
  if (l.docs) out.push({ label: 'Docs', href: l.docs });
  if (l.repo) out.push({ label: 'Repository', href: l.repo });
  if (l.product) out.push({ label: 'Product', href: l.product });
  return out;
}

/** Host of a link, for display ("github.com", "docs.redhat.com"). */
export function hostOf(href: string): string {
  try {
    return new URL(href).host.replace(/^www\./, '');
  } catch {
    return href;
  }
}
